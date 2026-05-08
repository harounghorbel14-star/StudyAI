// ============================================================
// 🎼 services/orchestrator.js — DAG Execution Engine
// Uses smartCall (multi-provider router) for intelligent execution
// Parallel + sequential, retries, validators, fallbacks, caching
// ============================================================

class Orchestrator {
  constructor(graph, options = {}) {
    this.graph = graph;
    this.results = {};
    this.errors = {};
    this.metrics = {};
    this.maxRetries = options.maxRetries ?? 2;
    this.timeout = options.timeout || 60000;

    this.openai = options.openai;
    this.anthropic = options.anthropic;
    this.cache = options.cache;
    this.smartCall = options.smartCall; // routed call from services
    this.onEvent = options.onEvent || (() => {});
    this.userId = options.userId;
  }

  /**
   * Topological sort with parallel layers.
   */
  buildLayers() {
    const layers = [];
    const completed = new Set();
    const remaining = new Set(Object.keys(this.graph));
    let safety = 200;

    while (remaining.size > 0 && safety-- > 0) {
      const layer = [];
      for (const node of remaining) {
        const deps = this.graph[node].depends_on || [];
        if (deps.every(d => completed.has(d))) layer.push(node);
      }
      if (!layer.length) {
        throw new Error('Circular dependency or missing nodes: ' + Array.from(remaining).join(', '));
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
        this.onEvent({ type: 'node_start', node: nodeName, attempt });

        const ctx = this.buildContext(node);
        const prompt = typeof node.prompt === 'function' ? node.prompt(ctx) : node.prompt;
        const system = typeof node.system === 'function' ? node.system(ctx) : (node.system || 'You are an expert AI agent.');

        let result;

        // Use smartCall (router + cache) if available
        if (this.smartCall) {
          result = await this.smartCall({
            prompt,
            system,
            task: node.task,
            max_tokens: node.max_tokens,
            temperature: node.temperature,
            json: node.json,
            cacheable: node.cacheable !== false,
            cacheTTL: node.ttl,
          });
        } else if (this.openai) {
          // Fallback direct call
          const messages = [];
          if (system) messages.push({ role: 'system', content: system });
          messages.push({ role: 'user', content: prompt });

          const config = {
            model: 'gpt-4o-mini',
            max_tokens: node.max_tokens || 1500,
            temperature: node.temperature || 0.7,
            messages,
          };
          if (node.json) config.response_format = { type: 'json_object' };

          const apiResult = await this.openai.chat.completions.create(config);
          let output = apiResult.choices[0]?.message?.content || '';
          if (node.json) {
            try { output = JSON.parse(output); }
            catch (_) { output = { _raw: output, _parse_error: true }; }
          }
          result = { output, model: 'gpt-4o-mini', provider: 'openai' };
        } else {
          throw new Error('No execution client available');
        }

        const output = result.output;

        // Validate
        if (node.validator) {
          const valid = await this.validate(output, node.validator);
          if (!valid.passes) {
            this.onEvent({ type: 'node_validation_failed', node: nodeName, attempt, reason: valid.reason });
            if (attempt <= this.maxRetries) continue;
          }
        }

        this.results[nodeName] = output;
        this.metrics[nodeName] = {
          duration_ms: Date.now() - nodeStart,
          model: result.model,
          provider: result.provider,
          task_type: result.task_type,
          cached: !!result._cached,
          attempt,
        };

        this.onEvent({
          type: 'node_done',
          node: nodeName,
          duration_ms: Date.now() - nodeStart,
          model: result.model,
          provider: result.provider,
          task_type: result.task_type,
          cached: !!result._cached,
          attempt,
        });
        return output;

      } catch (err) {
        lastError = err;
        this.onEvent({ type: 'node_error', node: nodeName, attempt, error: err.message });

        if (attempt > this.maxRetries) {
          if (node.fallback !== undefined) {
            const fb = typeof node.fallback === 'function' ? node.fallback(this.buildContext(node)) : node.fallback;
            this.results[nodeName] = fb;
            this.metrics[nodeName] = { fallback: true, error: err.message };
            this.onEvent({ type: 'node_fallback', node: nodeName });
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
        return typeof result === 'boolean' ? { passes: result } : result;
      } catch (e) { return { passes: false, reason: e.message }; }
    }
    if (typeof validator === 'string' && this.smartCall) {
      try {
        const result = await this.smartCall({
          prompt: `Validate this output:\n${JSON.stringify(output).slice(0, 1500)}\n\nCriteria: ${validator}\n\nReturn JSON: {"passes":true|false,"reason":"..."}`,
          task: 'classification',
          json: true,
          max_tokens: 200,
          cacheable: false,
        });
        return result.output || { passes: true };
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
      this.onEvent({
        type: 'layer_start',
        layer: i + 1,
        total_layers: layers.length,
        parallel_nodes: layer,
      });

      // Parallel execution within layer
      await Promise.allSettled(layer.map(n => this.runNode(n)));

      this.onEvent({ type: 'layer_done', layer: i + 1 });
    }

    const summary = {
      duration_ms: Date.now() - startTime,
      total_nodes: Object.keys(this.graph).length,
      successful: Object.keys(this.results).filter(k => this.results[k] !== null && !this.errors[k]).length,
      failed: Object.keys(this.errors).length,
      cached: Object.values(this.metrics).filter(m => m.cached).length,
    };

    this.onEvent({ type: 'orchestration_complete', summary });

    return { results: this.results, errors: this.errors, metrics: this.metrics, summary };
  }
}

module.exports = { Orchestrator };