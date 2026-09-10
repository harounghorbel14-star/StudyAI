// ============================================================
// 🧠 services/compound-intelligence.js
// Compound AI: multi-model reasoning, validation, refinement
// Self-correcting, confidence-scored, hallucination-reduced
// ============================================================

class CompoundIntelligence {
  constructor(options) {
    this.smartCall = options.smartCall;
    this.cache = options.cache;
    this.memory = options.memory;
    this.logger = options.logger;
  }

  // ─────────────────────────────────────────
  // 🎭 MULTI-MODEL REASONING
  // Multiple models tackle the same problem; their outputs are
  // synthesized into a single high-confidence answer.
  // ─────────────────────────────────────────
  async multiModel({ prompt, system, perspectives = ['analytical', 'pragmatic', 'creative'], synthesize = true }) {
    const startTime = Date.now();

    // Run all perspectives in parallel
    const results = await Promise.allSettled(
      perspectives.map(perspective =>
        this.smartCall({
          prompt: `[Perspective: ${perspective}]\n\n${prompt}`,
          system: system ? `${system}\n\nApproach this from a ${perspective} perspective.` : `You are a ${perspective} expert. Be specific and grounded.`,
          task: 'reasoning-deep',
          cacheable: false,
          max_tokens: 1500,
        })
      )
    );

    const successful = results
      .map((r, i) => r.status === 'fulfilled' ? { perspective: perspectives[i], ...r.value } : null)
      .filter(Boolean);

    if (!successful.length) throw new Error('All perspectives failed');

    if (!synthesize) {
      return { perspectives: successful, duration_ms: Date.now() - startTime };
    }

    // Synthesis pass — combine all perspectives
    const synthesisPrompt = `You are a synthesizer. Multiple experts gave perspectives on the same question. Produce a unified, high-quality answer.

ORIGINAL QUESTION:
${prompt}

EXPERT PERSPECTIVES:
${successful.map(s => `\n[${s.perspective.toUpperCase()}] (${s.model}):\n${typeof s.output === 'string' ? s.output.slice(0, 1500) : JSON.stringify(s.output).slice(0, 1500)}`).join('\n\n')}

TASK:
Synthesize these into a single, balanced, well-reasoned answer. Identify points of agreement, resolve contradictions, and integrate the strongest insights from each perspective.`;

    const synthesis = await this.smartCall({
      prompt: synthesisPrompt,
      task: 'reasoning-deep',
      cacheable: false,
      max_tokens: 2000,
    });

    return {
      synthesis: synthesis.output,
      perspectives: successful,
      models_used: successful.map(s => s.model),
      duration_ms: Date.now() - startTime,
    };
  }

  // ─────────────────────────────────────────
  // ✅ VALIDATOR — Score & critique an output
  // ─────────────────────────────────────────
  async validate({ output, criteria = [], original_prompt }) {
    const validationResult = await this.smartCall({
      prompt: `Score this output strictly. Be a harsh critic.

${original_prompt ? `ORIGINAL REQUEST:\n${original_prompt}\n\n` : ''}OUTPUT TO VALIDATE:
${typeof output === 'string' ? output.slice(0, 3000) : JSON.stringify(output).slice(0, 3000)}

${criteria.length ? `\nCRITERIA TO CHECK:\n${criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n` : ''}

Return JSON:
{
  "score": 0-100,
  "passes": true|false,
  "confidence": 0-100,
  "criteria_scores": [{"criterion":"...", "score":0-10, "issue":"..."}],
  "strengths": ["..."],
  "weaknesses": ["..."],
  "specific_issues": ["..."],
  "should_retry": true|false,
  "improvement_hint": "specific guidance for improving this output",
  "factual_concerns": ["any potential hallucinations or unverified claims"],
  "logical_concerns": ["any contradictions or logic gaps"]
}`,
      task: 'classification',
      json: true,
      max_tokens: 800,
      cacheable: false,
    });

    return validationResult.output;
  }

  // ─────────────────────────────────────────
  // 🔁 REFINE — Improve a weak output via feedback loop
  // ─────────────────────────────────────────
  async refine({ original_prompt, output, validation, max_iterations = 2 }) {
    let currentOutput = output;
    let currentValidation = validation;
    const history = [{ iteration: 0, output: currentOutput, validation: currentValidation }];

    for (let i = 1; i <= max_iterations; i++) {
      if (currentValidation && currentValidation.passes && currentValidation.score >= 80) break;

      const refinePrompt = `Improve this output based on specific feedback.

ORIGINAL REQUEST:
${original_prompt}

CURRENT OUTPUT:
${typeof currentOutput === 'string' ? currentOutput.slice(0, 2500) : JSON.stringify(currentOutput).slice(0, 2500)}

ISSUES TO FIX:
${currentValidation?.specific_issues?.join('\n- ') || 'Improve quality and depth'}

GUIDANCE:
${currentValidation?.improvement_hint || 'Make it more specific, accurate, and complete'}

Produce a refined output that fixes these issues. Don't just rewrite — fix the actual problems.`;

      const refined = await this.smartCall({
        prompt: refinePrompt,
        task: 'reasoning-deep',
        cacheable: false,
        max_tokens: 2500,
      });

      currentOutput = refined.output;
      currentValidation = await this.validate({
        output: currentOutput,
        original_prompt,
        criteria: currentValidation?.specific_issues || [],
      });

      history.push({ iteration: i, output: currentOutput, validation: currentValidation });

      if (currentValidation.passes && currentValidation.score >= 85) break;
    }

    return {
      final_output: currentOutput,
      final_score: currentValidation?.score || 0,
      iterations: history.length - 1,
      converged: currentValidation?.passes && currentValidation?.score >= 80,
      history: history.map(h => ({ iteration: h.iteration, score: h.validation?.score, passes: h.validation?.passes })),
    };
  }

  // ─────────────────────────────────────────
  // 🎯 EXECUTE WITH CONFIDENCE
  // Single high-quality call with auto-validation and refinement
  // ─────────────────────────────────────────
  async executeWithConfidence({ prompt, system, criteria = [], task, json = false, min_score = 75, max_refinements = 2 }) {
    const startTime = Date.now();

    // Initial call
    const initial = await this.smartCall({
      prompt,
      system,
      task,
      json,
      max_tokens: 2500,
      cacheable: false,
    });

    // Validate
    const validation = await this.validate({
      output: initial.output,
      original_prompt: prompt,
      criteria,
    });

    // If good enough, return
    if (validation.score >= min_score && validation.passes) {
      return {
        output: initial.output,
        confidence: validation.score,
        model: initial.model,
        provider: initial.provider,
        duration_ms: Date.now() - startTime,
        validation,
        refined: false,
      };
    }

    // Otherwise refine
    const refined = await this.refine({
      original_prompt: prompt,
      output: initial.output,
      validation,
      max_iterations: max_refinements,
    });

    return {
      output: refined.final_output,
      confidence: refined.final_score,
      model: initial.model,
      provider: initial.provider,
      duration_ms: Date.now() - startTime,
      validation,
      refined: true,
      refinement_iterations: refined.iterations,
      converged: refined.converged,
    };
  }

  // ─────────────────────────────────────────
  // 🌳 REASONING CHAIN
  // Decompose a complex problem into steps, solve each, recombine
  // ─────────────────────────────────────────
  async reasoningChain({ goal, max_steps = 6 }) {
    // Step 1: Decompose
    const decomp = await this.smartCall({
      prompt: `Break this goal into sequential reasoning steps. Each step should be solvable independently.

GOAL: ${goal}

Return JSON: {"steps":[{"id":1,"task":"...","depends_on":[]}], "expected_outcome":"..."}`,
      task: 'reasoning-deep',
      json: true,
      cacheable: false,
    });

    const plan = decomp.output;
    const steps = (plan.steps || []).slice(0, max_steps);
    if (!steps.length) throw new Error('Failed to decompose problem');

    // Step 2: Execute each step (with context from previous steps)
    const stepResults = {};
    for (const step of steps) {
      const context = (step.depends_on || [])
        .map(id => stepResults[id] ? `[Step ${id} result]: ${String(stepResults[id]).slice(0, 800)}` : '')
        .filter(Boolean)
        .join('\n\n');

      const result = await this.smartCall({
        prompt: `${context ? `PREVIOUS RESULTS:\n${context}\n\n` : ''}TASK: ${step.task}\n\nProvide a clear, specific answer.`,
        task: 'reasoning-deep',
        max_tokens: 1500,
        cacheable: false,
      });

      stepResults[step.id] = result.output;
    }

    // Step 3: Synthesize final answer
    const synthesis = await this.smartCall({
      prompt: `Synthesize the final answer from the reasoning chain.

ORIGINAL GOAL: ${goal}

REASONING STEPS:
${steps.map(s => `\n[Step ${s.id}: ${s.task}]\n${String(stepResults[s.id]).slice(0, 1000)}`).join('\n')}

Produce the final, complete answer that achieves the goal.`,
      task: 'reasoning-deep',
      max_tokens: 2000,
      cacheable: false,
    });

    return {
      goal,
      plan,
      steps_executed: steps.length,
      step_results: stepResults,
      final_answer: synthesis.output,
    };
  }

  // ─────────────────────────────────────────
  // 🧪 CONTRADICTION CHECK
  // Detect contradictions between multiple outputs/sources
  // ─────────────────────────────────────────
  async checkContradictions(claims) {
    const prompt = `Analyze these claims for contradictions.

CLAIMS:
${claims.map((c, i) => `${i + 1}. ${typeof c === 'string' ? c : JSON.stringify(c)}`).join('\n')}

Return JSON: {"has_contradictions":true|false, "contradictions":[{"claim_a":N,"claim_b":N,"explanation":"..."}], "consistent_claims":[N], "resolution":"how to reconcile"}`;

    const result = await this.smartCall({
      prompt,
      task: 'classification',
      json: true,
      max_tokens: 800,
      cacheable: false,
    });
    return result.output;
  }
}

module.exports = { CompoundIntelligence };