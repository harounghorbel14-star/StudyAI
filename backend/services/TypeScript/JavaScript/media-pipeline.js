// ============================================================
// 🎨 services/media-pipeline.js — Multimodal Generation
// Image · Video · 3D · Audio orchestration with provider routing
// ============================================================

const PROVIDERS = {
  image: {
    'flux-pro':         { provider: 'replicate', model: 'black-forest-labs/flux-1.1-pro',     speed: 5,  quality: 10 },
    'flux-schnell':     { provider: 'replicate', model: 'black-forest-labs/flux-schnell',     speed: 9,  quality: 7  },
    'sdxl':             { provider: 'replicate', model: 'stability-ai/sdxl',                  speed: 6,  quality: 8  },
    'dall-e-3':         { provider: 'openai',    model: 'dall-e-3',                           speed: 5,  quality: 9  },
  },
  video: {
    'runway-gen3':      { provider: 'replicate', model: 'runwayml/gen-3-alpha',                speed: 2,  quality: 10 },
    'kling':            { provider: 'replicate', model: 'kwaivgi/kling-v1.6-standard',         speed: 3,  quality: 9  },
    'minimax':          { provider: 'replicate', model: 'minimax/video-01',                    speed: 4,  quality: 8  },
  },
  '3d': {
    'hunyuan3d':        { provider: 'replicate', model: 'tencent/hunyuan3d-2',                 speed: 4,  quality: 9  },
    'trellis':          { provider: 'replicate', model: 'firtoz/trellis',                      speed: 5,  quality: 8  },
  },
  audio: {
    'elevenlabs-tts':   { provider: 'elevenlabs', model: 'eleven_turbo_v2_5',                  speed: 8,  quality: 10 },
    'musicgen':         { provider: 'replicate',  model: 'meta/musicgen',                      speed: 4,  quality: 8  },
  },
};

class MediaPipeline {
  constructor(options) {
    this.smartCall = options.smartCall;
    this.cache = options.cache;
    this.logger = options.logger;
    this.events = options.events;
    this.tracer = options.tracer;
  }

  // ─── Generate single asset ───────────────
  async generate({ type, prompt, model, options = {}, user_id }) {
    const traceId = this.tracer?.start('media_generate', { user_id, type });
    const t0 = Date.now();

    if (!PROVIDERS[type]) throw new Error(`Unknown media type: ${type}`);

    // Auto-pick model if not specified
    const choice = model && PROVIDERS[type][model]
      ? { ...PROVIDERS[type][model], key: model }
      : this._autoSelect(type, options);

    if (!choice) throw new Error(`No models available for ${type}`);

    this.events?.emit('media.generate.start', { type, model: choice.model, user_id });

    try {
      const result = await this._callProvider(choice, prompt, options);
      this.tracer?.finish(traceId, 'success');
      this.events?.emit('media.generate.done', { type, duration_ms: Date.now() - t0 });

      return {
        type,
        url: result.url,
        urls: result.urls,
        model: choice.model,
        provider: choice.provider,
        duration_ms: Date.now() - t0,
        prompt,
      };
    } catch (err) {
      this.tracer?.finish(traceId, 'error', err.message);
      this.events?.emit('media.generate.fail', { type, error: err.message });
      throw err;
    }
  }

  // ─── Call provider ───────────────────────
  async _callProvider(choice, prompt, options) {
    if (choice.provider === 'replicate') {
      return await this._callReplicate(choice.model, prompt, options);
    }
    if (choice.provider === 'openai') {
      return await this._callOpenAIImage(choice.model, prompt, options);
    }
    if (choice.provider === 'elevenlabs') {
      return await this._callElevenLabs(prompt, options);
    }
    throw new Error(`Unsupported provider: ${choice.provider}`);
  }

  async _callReplicate(model, prompt, options) {
    if (!process.env.REPLICATE_API_KEY) throw new Error('REPLICATE_API_KEY missing');

    const r = await fetch('https://api.replicate.com/v1/models/' + model + '/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait=60',
      },
      body: JSON.stringify({
        input: { prompt, ...options },
      }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.detail || 'Replicate failed');

    const output = data.output;
    if (typeof output === 'string') return { url: output };
    if (Array.isArray(output)) return { url: output[0], urls: output };
    if (output?.url) return { url: output.url };
    return { url: null, raw: output };
  }

  async _callOpenAIImage(model, prompt, options) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing');

    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        size: options.size || '1024x1024',
        quality: options.quality || 'standard',
        n: 1,
      }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message || 'OpenAI image failed');
    return { url: data.data?.[0]?.url };
  }

  async _callElevenLabs(text, options) {
    if (!process.env.ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY missing');
    const voice = options.voice || '21m00Tcm4TlvDq8ikWAM';

    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: options.model_id || 'eleven_turbo_v2_5',
      }),
    });
    if (!r.ok) {
      const err = await r.text();
      throw new Error('ElevenLabs failed: ' + err.slice(0, 200));
    }
    const buffer = await r.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return { url: `data:audio/mpeg;base64,${base64}` };
  }

  _autoSelect(type, options) {
    const candidates = Object.entries(PROVIDERS[type] || {}).map(([key, v]) => ({ ...v, key }));
    if (!candidates.length) return null;
    if (options.preferFast) return candidates.sort((a, b) => b.speed - a.speed)[0];
    return candidates.sort((a, b) => b.quality - a.quality)[0];
  }

  // ─── Multi-modal asset pipeline (e.g. landing page) ──
  async assetPipeline({ brand, theme = 'modern', user_id }) {
    const traceId = this.tracer?.start('asset_pipeline', { user_id });

    try {
      // Generate prompts in parallel using LLM
      const prompts = await this.smartCall({
        prompt: `Generate prompts for brand assets for: "${brand}" theme: ${theme}\n\nReturn JSON: {"hero_image":"...","logo":"...","social_banner":"...","favicon":"..."}`,
        task: 'creative',
        json: true,
        cacheable: false,
      });

      const promptSet = prompts.output;

      // Generate all images in parallel
      const results = await Promise.allSettled([
        this.generate({ type: 'image', prompt: promptSet.hero_image, options: { size: '1792x1024' }, user_id }),
        this.generate({ type: 'image', prompt: promptSet.logo, options: { size: '1024x1024' }, user_id }),
        this.generate({ type: 'image', prompt: promptSet.social_banner, options: { size: '1792x1024' }, user_id }),
      ]);

      const assets = {
        hero: results[0].status === 'fulfilled' ? results[0].value : null,
        logo: results[1].status === 'fulfilled' ? results[1].value : null,
        social: results[2].status === 'fulfilled' ? results[2].value : null,
        prompts: promptSet,
      };

      this.tracer?.finish(traceId, 'success');
      return assets;
    } catch (err) {
      this.tracer?.finish(traceId, 'error', err.message);
      throw err;
    }
  }

  // ─── List models ─────────────────────────
  listModels() {
    return PROVIDERS;
  }
}

module.exports = { MediaPipeline, PROVIDERS };