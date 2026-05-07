// ============================================================
// 🎼 services/orchestrator.js — DAG Execution Engine
// Parallel + sequential, retries, validators, fallbacks
// ============================================================
const router = require('./router');

class Orchestrator {
  constructor(graph, options = {}) {
    this.graph = graph;
    this.results = {};
    this.errors = {};
    this.metrics = {};
    this.maxRetries = options.maxRetries ?? 2;
    this.timeout = options.timeout || 60000;
    this.openai = options.openai;
    this.cache = options.cache;
    this.onEvent = options.onEvent || (() => {});
    this.userId = options.userId;
  }

  // Topological sort with parallel layers detection
  buildLayers() {
    const layers = [];
    const completed = new Set();
    const remaining = new Set(Object.keys(this.graph));
    let safety = 100;

    while (remaining.size > 0 && safety-- > 0) {
      const layer = [];
      for (const node of remaining) {
        const deps = this.graph[node].depends_on || [];
        if (deps.every(d => completed.has(d))) layer.push(node);
      }
      if (!layer.length) {
        const stuck = Array.from(remaining);
        throw new Error('Circular dependency or missing nodes: ' + stuck.join(', '));
      }
      layers.push(layer);
      layer.forEach(n => { completed.add(n); remaining.delete(n); });
    }
    return layers;
  }

  buildContext(node) {
    const ctx = {};
    (node.depends_on || []).forEach(dep => { ctx[dep] = this.results[dep]; });
    return ctx;
  }

  async runNode(nodeName) {
    const node = this.graph[nodeName];
    let lastError;
    const nodeStart = Date.now();

    for (let attempt = 1; attempt <= this.maxRetries + 1; attempt++) {
      try {
        this.onEvent({ type: 'node_start', node: nodeName, attempt, time: Date.now() });

        // Build prompt
        const ctx = this.buildContext(node);
        const prompt = typeof node.prompt === 'function' ? node.prompt(ctx) : node.prompt;
        const system = typeof node.system === 'function' ? node.system(ctx) : (node.system || 'You are an expert AI agent. Respond clearly and accurately.');

        // Cache check
        if (node.cacheable !== false && this.cache) {
          const cached = this.cache.get([nodeName, prompt, system]);
          if (cached) {
            this.results[nodeName] = cached;
            this.metrics[nodeName] = { cached: true, duration_ms: Date.now() - nodeStart };
            this.onEvent({ type: 'node_done', node: nodeName, cached: true, duration_ms: Date.now() - nodeStart });
            return cached;
          }
        }

        // Execute via router
        const execResult = await router.execute(this.openai, {
          prompt,
          system,
          task: node.task,
          max_tokens: node.max_tokens,
          temperature: node.temperature,
          json: node.json,
          maxRetries: 0, // we handle retries here
        });

        let output = execResult.output;

        // Validation step
        if (node.validator) {
          const valid = await this.validate(output, node.validator);
          if (!valid.passes) {
            this.onEvent({ type: 'node_validation_failed', node: nodeName, attempt, reason: valid.reason });
            if (attempt <= this.maxRetries) continue;
            // Use anyway after max retries
          }
        }

        this.results[nodeName] = output;
        this.metrics[nodeName] = {
          duration_ms: Date.now() - nodeStart,
          model: execResult.model,
          task_type: execResult.task_type,
          attempt,
        };

        // Cache
        if (node.cacheable !== false && this.cache) {
          this.cache.set([nodeName, prompt, system], output, { ttl: node.ttl, model: execResult.model, task_type: execResult.task_type });
        }

        this.onEvent({
          type: 'node_done',
          node: nodeName,
          duration_ms: Date.now() - nodeStart,
          model: execResult.model,
          task_type: execResult.task_type,
          attempt,
        });
        return output;

      } catch (err) {
        lastError = err;
        this.onEvent({ type: 'node_error', node: nodeName, attempt, error: err.message });

        if (attempt > this.maxRetries) {
          // Try fallback
          if (node.fallback !== undefined) {
            const fb = typeof node.fallback === 'function' ? node.fallback(this.buildContext(node)) : node.fallback;
            this.results[nodeName] = fb;
            this.metrics[nodeName] = { fallback: true, error: err.message };
            this.onEvent({ type: 'node_fallback', node: nodeName, error: err.message });
            return fb;
          }
          this.errors[nodeName] = err.message;
          if (node.required === false) {
            this.results[nodeName] = null;
            return null;
          }
          throw err;
        }

        await new Promise(r => setTimeout(r, Math.min(1000 * Math.pow(2, attempt - 1), 8000)));
      }
    }
  }

  async validate(output, validator) {
    if (typeof validator === 'function') {
      try {
        const result = await validator(output);
        return typeof result === 'boolean' ? { passes: result, reason: '' } : result;
      } catch (e) { return { passes: false, reason: e.message }; }
    }
    if (typeof validator === 'string' && this.openai) {
      try {
        const result = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          max_tokens: 200,
          response_format: { type: 'json_object' },
          messages: [{
            role: 'user',
            content: `Validate this output:\n${JSON.stringify(output).slice(0, 1500)}\n\nCriteria: ${validator}\n\nReturn JSON: {"passes":true/false,"reason":"..."}`
          }],
        });
        return JSON.parse(result.choices[0]?.message?.content || '{"passes":true}');
      } catch (_) { return { passes: true }; }
    }
    return { passes: true };
  }

  async run() {
    const startTime = Date.now();
    const layers = this.buildLayers();

    this.onEvent({
      type: 'orchestration_start',
      total_nodes: Object.keys(this.graph).length,
      layers: layers.length,
    });

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      this.onEvent({ type: 'layer_start', layer: i + 1, total_layers: layers.length, parallel_nodes: layer });

      // Run all nodes in this layer in parallel
      await Promise.allSettled(layer.map(nodeName => this.runNode(nodeName)));

      this.onEvent({ type: 'layer_done', layer: i + 1 });
    }

    const summary = {
      duration_ms: Date.now() - startTime,
      total_nodes: Object.keys(this.graph).length,
      successful: Object.keys(this.results).length,
      failed: Object.keys(this.errors).length,
    };

    this.onEvent({ type: 'orchestration_complete', summary });

    return { results: this.results, errors: this.errors, metrics: this.metrics, summary };
  }
}

module.exports = { Orchestrator };