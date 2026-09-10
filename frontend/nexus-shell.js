// ============================================================
// 🧭 nexus-shell.js — Product Shell (Phase A)
//
// Collapses 44 flat sidebar entries into 5 primary areas and
// mounts the NXUI panels, which were defined but never called
// and therefore never visible to any user.
//
// Reuses every existing navigate_* function. Adds no dependencies.
// Nothing is deleted: "All tools" preserves the original sidebar.
// ============================================================
(function () {
  'use strict';

  const NXS = (window.NXS = window.NXS || {});

  // ─────────────────────────────────────────
  // Information architecture
  //
  // `nav`   → an existing global navigate_* function (reused as-is)
  // `panel` → an NXUI renderer, mounted here for the first time
  // ─────────────────────────────────────────
  const AREAS = [
    {
      id: 'home',
      label: 'Home',
      icon: '◇',
      tagline: 'Start anything',
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: '▤',
      tagline: 'Everything Nexus is working on',
      panelOnOpen: 'renderProjects',
    },
    {
      id: 'build',
      label: 'Build',
      icon: '◈',
      tagline: 'Design, code, generate',
      items: [
        { label: 'One-Prompt',   nav: 'navigate_oneprompt', primary: true,
          hint: 'Describe it — Nexus plans and builds' },
        { label: 'Code',         panel: 'renderCode',   hint: 'Analyze · review · debug' },
        { label: 'Coding Max',   nav: 'navigate_coding' },
        { label: 'Mega Agent',   nav: 'navigate_mega' },
        { label: 'Media',        panel: 'renderMedia',  hint: 'Image · video · 3D · audio' },
        { label: 'Voice',        panel: 'renderVoice',  hint: 'Transcribe · synthesize' },
        { label: 'Dev Tools',    nav: 'navigate_devtools' },
        { label: 'Workflows',    nav: 'navigate_workflow' },
        { label: 'Automation',   nav: 'navigate_automation' },
      ],
    },
    {
      id: 'run',
      label: 'Run',
      icon: '◉',
      tagline: 'Deploy and operate',
      items: [
        { label: 'Deploy',       nav: 'navigate_deploy', primary: true },
        { label: 'Health',       nav: 'navigate_health' },
        { label: 'Metrics',      nav: 'navigate_metrics' },
        { label: 'Observatory',  nav: 'navigate_observatory' },
        { label: 'Teams',        panel: 'renderWorkspaces', hint: 'Shared workspaces' },
        { label: 'API Access',   nav: 'navigate_apikeys' },
      ],
    },
    {
      id: 'grow',
      label: 'Grow',
      icon: '◭',
      tagline: 'Measure and expand',
      items: [
        { label: 'Business',     panel: 'renderBusiness', primary: true,
          hint: 'Metrics · growth · marketing' },
        { label: 'Goals',        nav: 'navigate_goals' },
        { label: 'AI Insights',  nav: 'navigate_insights' },
        { label: 'Showcase',     nav: 'navigate_showcase' },
        { label: 'Referral',     nav: 'navigate_referral' },
      ],
    },
    {
      id: 'knowledge',
      label: 'Knowledge',
      icon: '◐',
      tagline: 'Research and remember',
      items: [
        { label: 'Research',     panel: 'renderKnowledge', primary: true,
          hint: 'Web-grounded answers with citations' },
        { label: 'Documents',    nav: 'navigate_docs' },
        { label: 'Knowledge Base', nav: 'navigate_kb' },
        { label: 'PDF Chat',     navFn: () => window.navigate?.('pdf') },
      ],
    },
  ];

  // Reachable, but deliberately out of the primary nav.
  //
  // Community entries stay hidden until the marketplace has something
  // to browse: an empty marketplace signals a dead product to a new
  // user, which is worse than not showing it at all.
  const COMMUNITY_MIN_ITEMS = 3;

  const COMMUNITY_PANELS = new Set(['renderMarketplace', 'renderSeasons', 'renderReputation']);

  const ADVANCED = [
    { label: 'Reality Map',  panel: 'renderRealityMap' },
    { label: 'AI Twin',      panel: 'renderTwin' },
    { label: 'Memory Fabric',panel: 'renderFabric' },
    { label: 'Shadow AI',    panel: 'renderShadow' },
    { label: 'Dreamspace',   panel: 'renderDreamspace' },
    { label: 'Predictive',   panel: 'renderPredictive' },
    { label: 'Temporal',     panel: 'renderTemporal' },
    { label: 'PMF',          panel: 'renderPMF' },
    { label: 'Reputation',   panel: 'renderReputation' },
    { label: 'Marketplace',  panel: 'renderMarketplace' },
    { label: 'Seasons',      panel: 'renderSeasons' },
    { label: 'Admin',        panel: 'renderAdmin' },
  ];

  const HOME_EXAMPLES = [
    'Build me a SaaS for football analytics',
    'Analyze my repository and find the biggest problems',
    'Research this market and tell me if the idea is worth building',
    'Create a landing page, research 5 competitors, then deploy it',
  ];

  // ─────────────────────────────────────────
  // Styles
  // ─────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('nxs-styles')) return;
    const s = document.createElement('style');
    s.id = 'nxs-styles';
    s.textContent = `
      .nxs-rail{position:fixed;left:0;top:0;bottom:0;width:76px;z-index:480;
        display:flex;flex-direction:column;align-items:center;padding:14px 0;gap:4px;
        background:linear-gradient(180deg,rgba(14,18,30,.97),rgba(8,11,20,.97));
        border-right:1px solid rgba(255,255,255,.06);backdrop-filter:blur(24px)}
      .nxs-rail-logo{width:34px;height:34px;margin-bottom:14px;border-radius:10px;
        background:linear-gradient(135deg,#c6f135,#35f1c6);display:flex;align-items:center;
        justify-content:center;color:#000;font-weight:800;font-size:15px;cursor:pointer;
        transition:transform .2s cubic-bezier(.2,.8,.2,1)}
      .nxs-rail-logo:hover{transform:scale(1.06)}
      .nxs-rail-btn{width:56px;padding:9px 0;border:none;background:none;cursor:pointer;
        border-radius:11px;display:flex;flex-direction:column;align-items:center;gap:3px;
        color:#6b7a90;transition:all .18s cubic-bezier(.2,.8,.2,1);font-family:inherit}
      .nxs-rail-btn:hover{background:rgba(255,255,255,.05);color:#c3d0e0}
      .nxs-rail-btn.active{background:rgba(53,241,198,.1);color:#35f1c6}
      .nxs-rail-ico{font-size:17px;line-height:1}
      .nxs-rail-lbl{font-size:9.5px;letter-spacing:.5px;font-weight:500}
      .nxs-rail-foot{margin-top:auto;display:flex;flex-direction:column;gap:4px}

      .nxs-drawer{position:fixed;left:76px;top:0;bottom:0;width:250px;z-index:479;
        background:rgba(11,15,25,.97);border-right:1px solid rgba(255,255,255,.05);
        backdrop-filter:blur(24px);padding:18px 14px;overflow-y:auto;
        transform:translateX(-260px);opacity:0;pointer-events:none;
        transition:transform .28s cubic-bezier(.2,.8,.2,1),opacity .22s}
      .nxs-drawer.open{transform:translateX(0);opacity:1;pointer-events:auto}
      .nxs-drawer-title{color:#fff;font-size:17px;font-weight:500;letter-spacing:-.2px}
      .nxs-drawer-tag{color:#5d6b80;font-size:11px;margin:3px 0 16px}
      .nxs-item{width:100%;text-align:left;padding:9px 11px;margin-bottom:2px;border:none;
        background:none;border-radius:9px;cursor:pointer;color:#aebbcc;font-size:13px;
        font-family:inherit;transition:all .16s;display:block}
      .nxs-item:hover{background:rgba(255,255,255,.05);color:#fff}
      .nxs-item.primary{background:linear-gradient(135deg,rgba(198,241,53,.09),rgba(53,241,198,.09));
        border:1px solid rgba(53,241,198,.2);color:#fff;font-weight:500;margin-bottom:8px}
      .nxs-item-hint{display:block;color:#5d6b80;font-size:10.5px;margin-top:2px;font-weight:400}
      .nxs-sep{height:1px;background:rgba(255,255,255,.05);margin:14px 0 10px}
      .nxs-sep-lbl{color:#4a586b;font-size:9.5px;letter-spacing:1.4px;text-transform:uppercase;
        margin-bottom:7px;padding-left:11px}

      .nxs-stage{position:fixed;left:76px;right:0;top:0;bottom:0;z-index:470;
        overflow-y:auto;padding:34px;background:var(--bg,#0a0a0f);display:none}
      .nxs-stage.open{display:block;animation:nxsIn .34s cubic-bezier(.16,1,.3,1)}
      .nxs-stage.shifted{left:326px}
      @keyframes nxsIn{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:none}}
      .nxs-stage-close{position:absolute;top:20px;right:24px;width:30px;height:30px;
        border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);
        border-radius:8px;color:#7d8b9e;cursor:pointer;font-size:15px;line-height:1}
      .nxs-stage-close:hover{background:rgba(255,255,255,.07);color:#fff}
      .nxs-stage-body{max-width:1080px;margin:0 auto}

      .nxs-home{max-width:660px;margin:0 auto;padding-top:9vh}
      .nxs-home-eyebrow{color:#35f1c6;font-size:10.5px;letter-spacing:2.4px;
        text-transform:uppercase;margin-bottom:14px;text-align:center}
      .nxs-home-h{color:#fff;font-size:33px;font-weight:300;letter-spacing:-.7px;
        text-align:center;line-height:1.25;margin-bottom:11px}
      .nxs-home-h b{font-weight:600;background:linear-gradient(135deg,#c6f135,#35f1c6);
        -webkit-background-clip:text;background-clip:text;color:transparent}
      .nxs-home-sub{color:#6b7a90;font-size:14px;text-align:center;margin-bottom:34px}
      .nxs-input-wrap{position:relative;background:rgba(255,255,255,.03);
        border:1px solid rgba(255,255,255,.1);border-radius:17px;padding:5px;
        transition:border-color .22s,box-shadow .22s}
      .nxs-input-wrap:focus-within{border-color:rgba(53,241,198,.45);
        box-shadow:0 0 0 4px rgba(53,241,198,.07)}
      .nxs-input{width:100%;background:none;border:none;outline:none;color:#fff;
        font-size:15px;font-family:inherit;padding:15px 17px;resize:none;min-height:82px;
        line-height:1.55}
      .nxs-input::placeholder{color:#4e5c70}
      .nxs-input-bar{display:flex;justify-content:space-between;align-items:center;
        padding:7px 11px 7px 17px}
      .nxs-input-note{color:#4e5c70;font-size:11px}
      .nxs-go{padding:9px 19px;background:linear-gradient(135deg,#c6f135,#35f1c6);
        border:none;border-radius:10px;color:#000;font-weight:600;font-size:13px;
        cursor:pointer;font-family:inherit;transition:transform .14s}
      .nxs-go:hover{transform:translateY(-1px)}
      .nxs-go:disabled{opacity:.45;cursor:default;transform:none}
      .nxs-ex{display:flex;flex-wrap:wrap;gap:7px;margin-top:17px;justify-content:center}
      .nxs-ex-chip{padding:7px 13px;background:rgba(255,255,255,.03);
        border:1px solid rgba(255,255,255,.07);border-radius:100px;color:#8494a8;
        font-size:11.5px;cursor:pointer;transition:all .18s;font-family:inherit}
      .nxs-ex-chip:hover{background:rgba(53,241,198,.07);border-color:rgba(53,241,198,.28);color:#cfe}
      .nxs-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(196px,1fr));
        gap:11px;margin-top:44px}
      .nxs-card{padding:17px;background:rgba(255,255,255,.025);
        border:1px solid rgba(255,255,255,.06);border-radius:13px;cursor:pointer;
        transition:all .22s cubic-bezier(.2,.8,.2,1)}
      .nxs-card:hover{border-color:rgba(53,241,198,.28);transform:translateY(-2px)}
      .nxs-card-ico{font-size:19px;margin-bottom:9px}
      .nxs-card-t{color:#fff;font-size:13.5px;font-weight:500;margin-bottom:3px}
      .nxs-card-d{color:#5d6b80;font-size:11.5px;line-height:1.45}

      body.nxs-on #sb{display:none!important}
      body.nxs-on #main{margin-left:76px!important;transition:margin-left .28s cubic-bezier(.2,.8,.2,1)}
      body.nxs-on.nxs-drawer-open #main{margin-left:326px!important}
      body.nxs-on .nx-bell{right:24px}
      body.nxs-on .cine-mode-bar{right:70px}

      @media(max-width:860px){
        .nxs-rail{width:58px}
        .nxs-rail-lbl{display:none}
        .nxs-rail-btn{width:44px;padding:11px 0}
        .nxs-drawer{left:58px;width:212px}
        .nxs-stage{left:58px;padding:22px 16px}
        .nxs-stage.shifted{left:58px}
        body.nxs-on #main{margin-left:58px!important}
        body.nxs-on.nxs-drawer-open #main{margin-left:58px!important}
        .nxs-home{padding-top:5vh}
        .nxs-home-h{font-size:25px}
      }
    `;
    document.head.appendChild(s);
  }

  // ─────────────────────────────────────────
  // State
  // ─────────────────────────────────────────
  let activeArea = null;
  let rail, drawer, stage, stageBody;
  // null until checked; false keeps community hidden.
  let communityUnlocked = null;

  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ─────────────────────────────────────────
  // Shell
  // ─────────────────────────────────────────
  function buildRail() {
    rail = document.createElement('nav');
    rail.className = 'nxs-rail';
    rail.setAttribute('aria-label', 'Primary');

    const logo = document.createElement('div');
    logo.className = 'nxs-rail-logo';
    logo.textContent = 'N';
    logo.title = 'NexusAI — Home';
    logo.onclick = () => openArea('home');
    rail.appendChild(logo);

    AREAS.forEach((area) => {
      const btn = document.createElement('button');
      btn.className = 'nxs-rail-btn';
      btn.dataset.area = area.id;
      btn.title = area.tagline;
      btn.innerHTML =
        `<span class="nxs-rail-ico">${area.icon}</span>` +
        `<span class="nxs-rail-lbl">${esc(area.label)}</span>`;
      btn.onclick = () => openArea(area.id);
      rail.appendChild(btn);
    });

    // Escape hatch — the original 44-entry sidebar stays one click away.
    const foot = document.createElement('div');
    foot.className = 'nxs-rail-foot';

    const all = document.createElement('button');
    all.className = 'nxs-rail-btn';
    all.title = 'All tools (classic sidebar)';
    all.innerHTML = '<span class="nxs-rail-ico">⋯</span><span class="nxs-rail-lbl">All</span>';
    all.onclick = showClassic;
    foot.appendChild(all);

    rail.appendChild(foot);
    document.body.appendChild(rail);
  }

  function buildDrawer() {
    drawer = document.createElement('aside');
    drawer.className = 'nxs-drawer';
    document.body.appendChild(drawer);
  }

  function buildStage() {
    stage = document.createElement('section');
    stage.className = 'nxs-stage';

    const close = document.createElement('button');
    close.className = 'nxs-stage-close';
    close.innerHTML = '&times;';
    close.title = 'Close';
    close.onclick = closeStage;
    stage.appendChild(close);

    stageBody = document.createElement('div');
    stageBody.className = 'nxs-stage-body';
    stage.appendChild(stageBody);

    document.body.appendChild(stage);
  }

  // ─────────────────────────────────────────
  // Navigation
  // ─────────────────────────────────────────
  function openArea(id) {
    const area = AREAS.find((a) => a.id === id);
    if (!area) return;

    activeArea = id;
    rail.querySelectorAll('.nxs-rail-btn').forEach((b) =>
      b.classList.toggle('active', b.dataset.area === id));

    if (id === 'home') {
      closeDrawer();
      renderHome();
      return;
    }

    if (area.panelOnOpen) {
      closeDrawer();
      mountPanel(area.panelOnOpen, area.label);
      return;
    }

    renderDrawer(area);
    openDrawer();
    // The stage stays on whatever was last opened so switching areas
    // does not throw away the user's current view.
  }

  function renderDrawer(area) {
    const items = (area.items || [])
      .map((item, i) => {
        const cls = 'nxs-item' + (item.primary ? ' primary' : '');
        const hint = item.hint ? `<span class="nxs-item-hint">${esc(item.hint)}</span>` : '';
        return `<button class="${cls}" data-area="${area.id}" data-idx="${i}">` +
               `${esc(item.label)}${hint}</button>`;
      })
      .join('');

    const advanced = ADVANCED
      .map((item, i) => ({ item, i }))
      .filter(({ item }) => !(COMMUNITY_PANELS.has(item.panel) && communityUnlocked !== true))
      .map(({ item, i }) => `<button class="nxs-item" data-adv="${i}">${esc(item.label)}</button>`)
      .join('');

    drawer.innerHTML =
      `<div class="nxs-drawer-title">${esc(area.label)}</div>` +
      `<div class="nxs-drawer-tag">${esc(area.tagline)}</div>` +
      items +
      `<div class="nxs-sep"></div>` +
      `<div class="nxs-sep-lbl">Advanced</div>` +
      advanced;

    drawer.querySelectorAll('[data-idx]').forEach((btn) => {
      btn.onclick = () => runItem(area.items[Number(btn.dataset.idx)]);
    });
    drawer.querySelectorAll('[data-adv]').forEach((btn) => {
      btn.onclick = () => runItem(ADVANCED[Number(btn.dataset.adv)]);
    });
  }

  // Routes to an existing navigate_* function, a custom fn, or an
  // NXUI panel. Panel code has never executed in a browser before,
  // so failures are contained and reported rather than thrown.
  function runItem(item) {
    if (!item) return;

    if (item.panel) {
      mountPanel(item.panel, item.label);
      return;
    }
    if (item.navFn) {
      closeStage();
      try { item.navFn(); } catch (e) { console.warn('[NXS] nav failed', e); }
      return;
    }
    if (item.nav) {
      closeStage();
      const fn = window[item.nav];
      if (typeof fn === 'function') {
        try { fn(); } catch (e) { console.warn('[NXS] ' + item.nav + ' failed', e); }
      } else {
        console.warn('[NXS] missing global: ' + item.nav);
      }
    }
  }

  function mountPanel(rendererName, label) {
    const renderer = window.NXUI && window.NXUI[rendererName];
    openStage();

    if (typeof renderer !== 'function') {
      stageBody.innerHTML =
        `<div style="padding:44px;text-align:center;color:#5d6b80">` +
        `<div style="font-size:15px;color:#aebbcc;margin-bottom:6px">${esc(label)}</div>` +
        `This panel is unavailable in the current build.</div>`;
      return;
    }

    stageBody.innerHTML = '';
    try {
      renderer(stageBody);
    } catch (err) {
      console.error('[NXS] panel "' + rendererName + '" failed:', err);
      stageBody.innerHTML =
        `<div style="padding:34px;border:1px solid rgba(239,68,68,.25);border-radius:13px;` +
        `background:rgba(239,68,68,.05);color:#fca5a5">` +
        `<div style="color:#fff;font-size:15px;margin-bottom:7px">${esc(label)} could not load</div>` +
        `<div style="font-size:12.5px;font-family:ui-monospace,monospace">${esc(err.message)}</div>` +
        `</div>`;
    }
  }

  function openDrawer() {
    drawer.classList.add('open');
    document.body.classList.add('nxs-drawer-open');
    stage.classList.add('shifted');
  }
  function closeDrawer() {
    drawer.classList.remove('open');
    document.body.classList.remove('nxs-drawer-open');
    stage.classList.remove('shifted');
  }
  function openStage() { stage.classList.add('open'); }
  function closeStage() { stage.classList.remove('open'); }

  // Reveal the original sidebar without losing the rail.
  function showClassic() {
    closeStage();
    closeDrawer();
    document.body.classList.remove('nxs-on');
    rail.style.display = 'none';

    const restore = document.createElement('button');
    restore.textContent = '← Back to Nexus';
    restore.style.cssText =
      'position:fixed;bottom:20px;left:20px;z-index:9000;padding:9px 15px;' +
      'background:linear-gradient(135deg,#c6f135,#35f1c6);border:none;border-radius:10px;' +
      'color:#000;font-weight:600;font-size:12.5px;cursor:pointer;font-family:inherit;' +
      'box-shadow:0 6px 20px rgba(0,0,0,.4)';
    restore.onclick = () => {
      restore.remove();
      rail.style.display = '';
      document.body.classList.add('nxs-on');
      openArea('home');
    };
    document.body.appendChild(restore);
  }

  // ─────────────────────────────────────────
  // Home
  // ─────────────────────────────────────────
  function renderHome() {
    openStage();
    stageBody.innerHTML = `
      <div class="nxs-home">
        <div class="nxs-home-eyebrow">AI Operating System</div>
        <h1 class="nxs-home-h">Turn one idea into a <b>working business</b></h1>
        <p class="nxs-home-sub">Idea → Research → Validate → Plan → Build → Test → Deploy → Grow</p>

        <div class="nxs-input-wrap">
          <textarea class="nxs-input" id="nxs-prompt"
            placeholder="What do you want to build or accomplish?"></textarea>
          <div class="nxs-input-bar">
            <span class="nxs-input-note">Nexus picks the agents and the plan</span>
            <button class="nxs-go" id="nxs-go" disabled>Start →</button>
          </div>
        </div>

        <div class="nxs-ex">
          ${HOME_EXAMPLES.map((t, i) =>
            `<button class="nxs-ex-chip" data-ex="${i}">${esc(t)}</button>`).join('')}
        </div>

        <div class="nxs-cards">
          <div class="nxs-card" data-go="build">
            <div class="nxs-card-ico">◈</div>
            <div class="nxs-card-t">Build</div>
            <div class="nxs-card-d">Code, media, voice and dev tools</div>
          </div>
          <div class="nxs-card" data-go="run">
            <div class="nxs-card-ico">◉</div>
            <div class="nxs-card-t">Run</div>
            <div class="nxs-card-d">Deploy, monitor and operate</div>
          </div>
          <div class="nxs-card" data-go="grow">
            <div class="nxs-card-ico">◭</div>
            <div class="nxs-card-t">Grow</div>
            <div class="nxs-card-d">Metrics, growth and marketing</div>
          </div>
          <div class="nxs-card" data-go="knowledge">
            <div class="nxs-card-ico">◐</div>
            <div class="nxs-card-t">Knowledge</div>
            <div class="nxs-card-d">Research, files and memory</div>
          </div>
        </div>

        <div id="nxs-projects" style="margin-top:34px"></div>
        <div id="nxs-idle" style="margin-top:26px"></div>
      </div>
    `;

    const input = stageBody.querySelector('#nxs-prompt');
    const go = stageBody.querySelector('#nxs-go');

    // Home must survive a partial DOM: if the hero fails to bind, the
    // rail and every other area still work.
    if (!input || !go) return;

    const sync = () => { go.disabled = !input.value.trim(); };
    input.addEventListener('input', sync);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && input.value.trim()) submit();
    });
    go.onclick = submit;

    stageBody.querySelectorAll('[data-ex]').forEach((chip) => {
      chip.onclick = () => {
        input.value = HOME_EXAMPLES[Number(chip.dataset.ex)];
        sync();
        input.focus();
      };
    });
    stageBody.querySelectorAll('[data-go]').forEach((card) => {
      card.onclick = () => openArea(card.dataset.go);
    });

    function submit() {
      const text = input.value.trim();
      if (!text) return;

      // Run it here so the user watches one system work, rather than
      // being dropped onto a separate tool page.
      if (window.NXO && typeof window.NXO.run === 'function') {
        stageBody.innerHTML = '';
        try {
          window.NXO.run(stageBody, text);
        } catch (err) {
          console.error('[NXS] orchestration failed to start:', err);
          handOff(text);
        }
      } else {
        handOff(text);
      }
      window.dispatchEvent(new CustomEvent('nxs:prompt', { detail: { prompt: text } }));
    }

    // Fallback for builds without the orchestration module.
    function handOff(text) {
      closeStage();
      try { localStorage.setItem('nx_pending_prompt', text); } catch (_) {}
      if (typeof window.navigate_oneprompt === 'function') {
        window.navigate_oneprompt();
        setTimeout(() => prefill(text), 260);
      }
    }

    function prefill(text) {
      const target = document.querySelector(
        '#oneprompt-input, #op-input, [data-oneprompt-input], #main textarea');
      if (!target) return;
      target.value = text;
      target.dispatchEvent(new Event('input', { bubbles: true }));
      target.focus();
    }

    loadIdleWork();
    loadProjects();
  }

  // Shows in-flight projects on Home so a returning user resumes
  // rather than starting over.
  async function loadProjects() {
    const slot = stageBody.querySelector('#nxs-projects');
    if (!slot) return;
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('jwt') || '';
      if (!token) return;
      const res = await fetch('/api/projects?limit=4', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const { projects = [] } = await res.json();
      if (!projects.length) return;

      slot.innerHTML =
        `<div style="color:#4a586b;font-size:9.5px;letter-spacing:1.4px;` +
        `text-transform:uppercase;margin-bottom:10px">Active projects</div>` +
        projects.map((p) => {
          const flag = p.blocked
            ? `<span style="color:#f59e0b;font-size:10.5px">needs approval</span>`
            : `<span style="color:#5d6b80;font-size:10.5px">${p.percent}%</span>`;
          return `<button class="nxs-card" data-proj="${p.id}" style="width:100%;` +
                 `text-align:left;margin-bottom:7px;font-family:inherit">` +
                 `<div style="display:flex;justify-content:space-between;gap:12px;align-items:center">` +
                 `<span style="color:#fff;font-size:13.5px">${esc(p.name)}</span>${flag}</div>` +
                 `<div style="height:3px;background:rgba(255,255,255,.06);border-radius:3px;` +
                 `margin-top:9px;overflow:hidden"><span style="display:block;height:100%;width:${p.percent}%;` +
                 `background:linear-gradient(90deg,#c6f135,#35f1c6)"></span></div></button>`;
        }).join('');

      slot.querySelectorAll('[data-proj]').forEach((btn) => {
        btn.onclick = () => {
          const renderer = window.NXUI && window.NXUI.renderProject;
          if (typeof renderer !== 'function') return;
          openStage();
          stageBody.innerHTML = '';
          try {
            renderer(stageBody, Number(btn.dataset.proj));
          } catch (err) {
            console.error('[NXS] project workspace failed:', err);
          }
        };
      });
    } catch (_) {
      // Home must render even when the API is unreachable.
    }
  }

  // Surfaces Dreamspace output on Home instead of as a menu item.
  async function loadIdleWork() {
    const slot = stageBody.querySelector('#nxs-idle');
    if (!slot) return;
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('jwt') || '';
      if (!token) return;
      const res = await fetch('/api/dreamspace/insights?unseen=1&limit=2', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const items = data.insights || [];
      if (!items.length) return;

      slot.innerHTML =
        `<div style="color:#4a586b;font-size:9.5px;letter-spacing:1.4px;` +
        `text-transform:uppercase;margin-bottom:9px">While you were away</div>` +
        items.map((i) =>
          `<div style="padding:13px 15px;background:rgba(200,123,239,.05);` +
          `border:1px solid rgba(200,123,239,.16);border-radius:11px;margin-bottom:7px">` +
          `<div style="color:#fff;font-size:13px">${esc(i.summary)}</div>` +
          (i.details ? `<div style="color:#6b7a90;font-size:11.5px;margin-top:3px">${esc(i.details)}</div>` : '') +
          `</div>`).join('');
    } catch (_) {
      // Home must render even when the API is unreachable.
    }
  }

  // ─────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────
  NXS.open = openArea;
  NXS.panel = mountPanel;
  NXS.close = closeStage;
  NXS.areas = AREAS;

  // ─────────────────────────────────────────
  // Boot
  // ─────────────────────────────────────────
  // Decides whether community entries are worth showing. Failure
  // leaves them hidden, which is the safer default.
  async function checkCommunity() {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('jwt') || '';
      if (!token) { communityUnlocked = false; return; }
      const res = await fetch('/api/community/marketplace?limit=5', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { communityUnlocked = false; return; }
      const { items = [] } = await res.json();
      communityUnlocked = items.length >= COMMUNITY_MIN_ITEMS;
    } catch (_) {
      communityUnlocked = false;
    }
  }

  function boot() {
    if (document.querySelector('.nxs-rail')) return;
    injectStyles();
    buildRail();
    buildDrawer();
    buildStage();
    document.body.classList.add('nxs-on');

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && stage.classList.contains('open')) closeStage();
    });

    checkCommunity();

    // Land on Home only for a fresh session, so a returning user is
    // not pulled out of whatever they were doing.
    let seen = false;
    try { seen = sessionStorage.getItem('nxs_seen') === '1'; } catch (_) {}
    if (!seen) {
      try { sessionStorage.setItem('nxs_seen', '1'); } catch (_) {}
      setTimeout(() => openArea('home'), 380);
    } else {
      rail.querySelector('[data-area="home"]')?.classList.add('active');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();