// ============================================================
// 🤖 agent-panel.js — Watch an agent run: plan, steps, sources,
// approvals, verification and the cited deliverable.
//
// Everything shown here can contain text from web pages or a model, so
// it is always HTML-escaped; only http(s) links are rendered as links.
// Events are polled (EventSource cannot send the Authorization header).
// ============================================================
(function () {
  'use strict';
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = (u) => (/^https?:\/\//i.test(String(u || '')) ? String(u) : null);
  const token = () => (window.getAuthToken ? window.getAuthToken() : localStorage.getItem('nx_t')) || '';
  const url = (p) => (window.apiUrl ? window.apiUrl(p) : p);

  async function call(method, path, body) {
    const r = await fetch(url(path), {
      method,
      headers: { Authorization: `Bearer ${token()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(d.error || `Request failed (${r.status})`); e.status = r.status; throw e; }
    return d;
  }

  const STATUS_ICON = { pending: '○', running: '◌', succeeded: '✓', failed: '✕', skipped: '–', needs_approval: '⏸', rejected: '⊘', outcome_unknown: '⚠' };
  const VERIFY_LABEL = { verified: 'Verified', partially_verified: 'Partially verified', executed_unverified: 'Executed, not verified', failed: 'Failed' };
  const RUN_LABEL = {
    queued: 'Queued', running: 'Working…', awaiting_approval: 'Waiting for your approval', cancelling: 'Cancelling…',
    succeeded: 'Completed and verified', failed: 'Failed', cancelled: 'Cancelled', stopped: 'Stopped (budget reached)', needs_input: 'Needs more information',
  };
  const TERMINAL = ['succeeded', 'failed', 'cancelled', 'stopped', 'needs_input'];

  let state = { runId: null, lastEvent: 0, timer: null, events: [] };

  function css() {
    if ($('#nx-agent-css')) return;
    const st = document.createElement('style');
    st.id = 'nx-agent-css';
    st.textContent = `
#nx-agent{position:fixed;inset:0;z-index:900;background:#00000099;display:flex;justify-content:flex-end}
#nx-agent[hidden]{display:none}
.nxa-panel{width:min(760px,100%);height:100%;background:var(--bg,#0b0b12);border-left:1px solid var(--border2,#333);display:flex;flex-direction:column}
.nxa-head{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--border,#222)}
.nxa-head h2{font-size:15px;font-weight:600;flex:1;margin:0}
.nxa-body{flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:14px}
.nxa-card{background:var(--bg2,#14141c);border:1px solid var(--border,#222);border-radius:12px;padding:12px 14px}
.nxa-card h3{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--t3,#888);margin:0 0 8px}
.nxa-goal{width:100%;min-height:72px;resize:vertical;background:var(--bg3,#1c1c26);border:1px solid var(--border2,#333);border-radius:8px;padding:10px;color:inherit;font:inherit;font-size:14px}
.nxa-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px}
.nxa-btn{padding:8px 14px;border-radius:8px;background:var(--grad,#7c3aed);color:#fff;font-size:13px;font-weight:600;cursor:pointer;border:none}
.nxa-btn.sec{background:transparent;border:1px solid var(--border2,#333);color:var(--t2,#bbb)}
.nxa-btn[disabled]{opacity:.6;cursor:progress}
.nxa-status{font-size:13px;color:var(--t2,#bbb)}
.nxa-steps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.nxa-steps li{display:flex;gap:8px;font-size:13px;align-items:flex-start}
.nxa-steps .ic{width:18px;text-align:center;flex:none}
.nxa-steps .succeeded .ic{color:#34d399}.nxa-steps .failed .ic,.nxa-steps .rejected .ic{color:#f87171}.nxa-steps .running .ic{color:#a78bfa}
.nxa-meta{font-size:11.5px;color:var(--t3,#888)}
.nxa-log{font-size:12px;font-family:ui-monospace,monospace;color:var(--t2,#aaa);max-height:160px;overflow:auto;white-space:pre-wrap}
.nxa-src a,.nxa-answer a{color:var(--a2,#a78bfa)}
.nxa-answer{font-size:14px;line-height:1.55;white-space:pre-wrap}
.nxa-check{font-size:13px}.nxa-check.ok::before{content:'✓ ';color:#34d399}.nxa-check.bad::before{content:'✕ ';color:#f87171}
.nxa-approve{border-color:#f59e0b88}
.nxa-approve pre{font-size:12px;background:var(--bg3,#1c1c26);padding:8px;border-radius:6px;overflow:auto;max-height:160px}
.nxa-privacy{display:flex;gap:6px;align-items:center;margin-top:6px}
.nxa-inference{font-size:11.5px;color:var(--t3,#888)}`;
    document.head.appendChild(st);
  }

  function shell() {
    let root = $('#nx-agent');
    if (root) return root;
    css();
    root = document.createElement('div');
    root.id = 'nx-agent';
    root.hidden = true;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'nxa-title');
    root.innerHTML = `<div class="nxa-panel">
      <div class="nxa-head"><h2 id="nxa-title">Agent</h2><span class="nxa-inference" id="nxa-inference"></span>
        <button type="button" class="nxa-btn sec" id="nxa-close" aria-label="Close agent panel">✕</button></div>
      <div class="nxa-body">
        <div class="nxa-card">
          <h3>Goal</h3>
          <label for="nxa-goal" class="nxa-meta">Describe what you want done. The agent plans, researches with sources, checks its work, and asks before changing anything outside NexusAI.</label>
          <textarea id="nxa-goal" class="nxa-goal" maxlength="2000" placeholder="e.g. Compare the latest pricing of three EU cloud providers and cite sources"></textarea>
          <label class="nxa-meta nxa-privacy"><input type="checkbox" id="nxa-private"/> Keep this run on the local model only (fails rather than using a cloud model)</label>
          <div class="nxa-row"><button type="button" class="nxa-btn" id="nxa-run">Run agent</button>
            <button type="button" class="nxa-btn sec" id="nxa-cancel" hidden>Cancel run</button>
            <span class="nxa-status" id="nxa-status" role="status" aria-live="polite"></span></div>
        </div>
        <div id="nxa-out"></div>
      </div></div>`;
    document.body.appendChild(root);
    $('#nxa-close', root).onclick = close;
    root.addEventListener('click', (e) => { if (e.target === root) close(); });
    root.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    $('#nxa-run', root).onclick = start;
    $('#nxa-cancel', root).onclick = cancel;
    return root;
  }

  async function open() {
    const root = shell();
    root.hidden = false;
    $('#nxa-goal').focus();
    try {
      const s = await call('GET', '/api/inference/status');
      $('#nxa-inference').textContent = s.mode === 'local-only'
        ? `Local model only${s.local?.models?.length ? ` (${s.local.models[0]})` : ''}`
        : s.can_serve ? `Models: ${[...(s.cloud_providers || []), ...(s.local?.available ? ['local'] : [])].join(', ') || 'none'}` : 'No AI model configured';
    } catch (_) { $('#nxa-inference').textContent = ''; }
  }

  function close() {
    const root = $('#nx-agent');
    if (root) root.hidden = true;
  }

  async function start() {
    const goal = $('#nxa-goal').value.trim();
    if (goal.length < 5) { $('#nxa-status').textContent = 'Describe the goal in a few more words.'; return; }
    const btn = $('#nxa-run');
    btn.disabled = true; btn.textContent = 'Starting…';
    try {
      const { run } = await call('POST', '/api/agent/runs', { goal, ...($('#nxa-private').checked ? { privacy: 'local' } : {}) });
      state = { runId: run.id, lastEvent: 0, timer: null, events: [] };
      render(run);
      poll();
    } catch (e) {
      $('#nxa-status').textContent = e.status === 429 ? e.message : `Could not start: ${e.message}`;
      btn.disabled = false; btn.textContent = 'Run agent';
    }
  }

  async function cancel() {
    if (!state.runId) return;
    try { await call('POST', `/api/agent/runs/${state.runId}/cancel`, {}); } catch (e) { $('#nxa-status').textContent = e.message; }
  }

  // step_id binds the decision to the exact request shown on screen.
  async function decide(decision, stepId) {
    try { await call('POST', `/api/agent/runs/${state.runId}/decision`, { decision, step_id: stepId }); poll(); } catch (e) { $('#nxa-status').textContent = e.message; poll(); }
  }

  async function reviewLesson(id, status) {
    try { await call('PATCH', `/api/agent/lessons/${id}`, { status }); $(`#nxa-lesson-${id}`).innerHTML = `<span class="nxa-meta">Lesson ${status}.</span>`; } catch (e) { $('#nxa-status').textContent = e.message; }
  }

  async function poll() {
    clearTimeout(state.timer);
    const id = state.runId;
    try {
      const { events } = await call('GET', `/api/agent/runs/${id}/events?after=${state.lastEvent}`);
      if (id !== state.runId) return;
      for (const e of events) { state.events.push(e); state.lastEvent = e.id; }
      const { run } = await call('GET', `/api/agent/runs/${id}`);
      if (TERMINAL.includes(run.status) || run.status === 'awaiting_approval') {
        // Events written between the two requests above.
        const { events: tail } = await call('GET', `/api/agent/runs/${id}/events?after=${state.lastEvent}`);
        for (const e of tail) { state.events.push(e); state.lastEvent = e.id; }
      }
      render(run);
      if (!TERMINAL.includes(run.status) && run.status !== 'awaiting_approval') state.timer = setTimeout(poll, 800);
    } catch (e) {
      $('#nxa-status').textContent = e.status === 401 ? 'Your session ended.' : `Connection problem: ${e.message}. Retrying…`;
      if (e.status !== 401 && e.status !== 404) state.timer = setTimeout(poll, 2500);
    }
  }

  function linkCitations(text, citations) {
    const byId = Object.fromEntries((citations || []).map((c) => [c.id, c]));
    return esc(text).replace(/\[(E\d+(?:,\s*E\d+)*)\]/g, (m, ids) => `[${ids.split(/,\s*/).map((id) => {
      const u = safeUrl(byId[id]?.url);
      return u ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer" title="${esc(byId[id].title)}">${id}</a>` : id;
    }).join(', ')}]`);
  }

  function render(run) {
    const busy = !TERMINAL.includes(run.status);
    $('#nxa-run').disabled = busy; $('#nxa-run').textContent = busy ? 'Running…' : 'Run agent';
    $('#nxa-cancel').hidden = !busy;
    $('#nxa-status').textContent = `${RUN_LABEL[run.status] || run.status}${run.error ? ` — ${run.error}` : ''}`;
    const parts = [];

    if (run.plan) {
      const stepNo = new Map(run.steps.map((s, i) => [s.id, i + 1]));
      const done = run.steps.filter((s) => ['succeeded', 'failed', 'skipped', 'rejected', 'outcome_unknown'].includes(s.status)).length;
      parts.push(`<div class="nxa-card"><h3>Plan${run.plan.source && run.plan.source !== 'model' ? ` <span class="nxa-meta">(${esc(run.plan.source.replace(/_/g, ' '))})</span>` : ''}</h3><div class="nxa-meta">${esc(run.plan.interpretation)}</div>
        ${run.plan.success_criteria?.length ? `<div class="nxa-meta">Done when: ${esc(run.plan.success_criteria.join('; '))}</div>` : ''}
        ${run.plan.assumptions?.length ? `<div class="nxa-meta">Assumes: ${esc(run.plan.assumptions.join('; '))}</div>` : ''}
        ${run.plan.unknowns?.length ? `<div class="nxa-meta">Uncertain: ${esc(run.plan.unknowns.join('; '))}</div>` : ''}
        <div class="nxa-meta">Progress: ${done}/${run.steps.length} steps${run.options?.privacy === 'local' ? ' · local model only' : ''}</div>
        <ul class="nxa-steps">${run.steps.map((s) => `<li class="${esc(s.status)}"><span class="ic" aria-label="${esc(s.status)}">${STATUS_ICON[s.status] || '?'}</span>
          <span>${esc(s.title)} <span class="nxa-meta">· ${esc(s.tool)}${s.risk && s.risk !== 'read' ? ` · ${esc(s.risk)}` : ''}${s.depends_on?.length ? ` · after ${s.depends_on.map((d) => stepNo.get(d)).filter(Boolean).join(', ')}` : ''}${s.failure ? ` · ${esc(s.failure.category.replace(/_/g, ' '))}` : ''}${s.evaluation?.reason && s.status !== 'succeeded' ? ` · ${esc(s.evaluation.reason)}` : ''}${s.error && !s.evaluation ? ` · ${esc(s.error)}` : ''}</span></span></li>`).join('')}</ul>
        <div class="nxa-meta">Budget used: ${run.usage?.steps ?? 0}/${run.budget?.maxSteps} steps · ${run.usage?.tool_calls ?? 0}/${run.budget?.maxToolCalls} tool calls · ${run.usage?.llm_calls ?? 0}/${run.budget?.maxLlmCalls} model calls${run.usage?.retries ? ` · ${run.usage.retries} retr${run.usage.retries === 1 ? 'y' : 'ies'}` : ''}${run.usage?.fallbacks ? ` · ${run.usage.fallbacks} model fallback(s)` : ''}${run.usage?.models?.length ? ` · ${esc(run.usage.models.join(', '))}` : ''}</div></div>`);
    }

    if (run.status === 'awaiting_approval' && run.pending_action) {
      const a = run.pending_action;
      parts.push(`<div class="nxa-card nxa-approve"><h3>Approval needed</h3>
        <div>The agent wants to run <strong>${esc(a.tool)}</strong>, which changes something outside NexusAI:</div>
        <pre>${esc(JSON.stringify(a.args, null, 2))}</pre>
        <div class="nxa-meta">This approval covers exactly this action, once${a.expires_at ? `, until ${esc(new Date(a.expires_at).toLocaleTimeString())}` : ''}.</div>
        <div class="nxa-row"><button type="button" class="nxa-btn" data-decide="approve" data-step="${esc(a.step_id)}">Approve this action</button>
        <button type="button" class="nxa-btn sec" data-decide="reject" data-step="${esc(a.step_id)}">Reject</button></div></div>`);
    }

    const sources = new Map();
    for (const e of state.events) for (const s of (e.type === 'step.succeeded' ? e.data.sources || [] : [])) sources.set(s.url, s);
    for (const c of run.result?.citations || []) sources.set(c.url, c);
    if (sources.size) {
      parts.push(`<div class="nxa-card nxa-src"><h3>Sources (${sources.size})</h3><ol>${[...sources.values()].map((s) => {
        const u = safeUrl(s.url);
        return `<li>${u ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(s.title || u)}</a>` : esc(s.title)}${s.published_at ? ` <span class="nxa-meta">${esc(String(s.published_at).slice(0, 10))}</span>` : ''}</li>`;
      }).join('')}</ol></div>`);
    }

    if (run.result) {
      const v = run.result.verification;
      parts.push(`<div class="nxa-card"><h3>Result${run.result.mode === 'extractive' ? ' (extractive — no model summary)' : ''}</h3>
        <div class="nxa-answer">${linkCitations(run.result.answer, run.result.citations)}</div></div>`);
      if (v) parts.push(`<div class="nxa-card"><h3>Verification${v.level ? `: ${esc(VERIFY_LABEL[v.level] || v.level)}` : ''}</h3>${v.checks.map((c) => `<div class="nxa-check ${c.passed ? 'ok' : 'bad'}">${esc(c.check)}${c.detail ? ` <span class="nxa-meta">(${esc(c.detail)})</span>` : ''}</div>`).join('')}</div>`);
      if (run.result.limitations?.length || run.result.failed_steps?.length) {
        parts.push(`<div class="nxa-card"><h3>Limitations</h3><ul>${[...run.result.failed_steps.map((f) => `${f.step}: ${f.status.replace(/_/g, ' ')}${f.error ? ` (${f.error})` : ''}`), ...run.result.limitations].map((l) => `<li class="nxa-meta">${esc(l)}</li>`).join('')}</ul></div>`);
      }
    }

    const lesson = state.events.find((e) => e.type === 'lesson.proposed');
    if (lesson) {
      parts.push(`<div class="nxa-card" id="nxa-lesson-${Number(lesson.data.id)}"><h3>Proposed lesson</h3><div>${esc(lesson.data.text)}</div>
        <div class="nxa-meta">Used in future runs only if you approve it.</div>
        <div class="nxa-row"><button type="button" class="nxa-btn sec" data-lesson="${Number(lesson.data.id)}" data-status="approved">Approve</button>
        <button type="button" class="nxa-btn sec" data-lesson="${Number(lesson.data.id)}" data-status="rejected">Reject</button></div></div>`);
    }

    parts.push(`<div class="nxa-card"><h3>Activity</h3><div class="nxa-log">${state.events.slice(-60).map((e) => esc(`${e.at.slice(11, 19)}  ${e.type}${e.data?.title ? ` — ${e.data.title}` : ''}${e.data?.tool && !e.data?.title ? ` — ${e.data.tool}` : ''}${e.data?.reason ? ` — ${e.data.reason}` : ''}${e.data?.routing?.fallback ? ` — fell back${e.data.routing.fallback_from ? ` from ${e.data.routing.fallback_from}` : ''}` : ''}${e.data?.failure ? ` — ${e.data.failure.category}` : ''}${e.data?.code && e.type === 'model.call' ? ` — ${e.data.code}` : ''}`)).join('\n')}</div></div>`);

    $('#nxa-out').innerHTML = parts.join('');
    $('#nxa-out').querySelectorAll('[data-decide]').forEach((b) => { b.onclick = () => decide(b.dataset.decide, b.dataset.step); });
    $('#nxa-out').querySelectorAll('[data-lesson]').forEach((b) => { b.onclick = () => reviewLesson(b.dataset.lesson, b.dataset.status); });
  }

  window.openAgentPanel = open;
})();
