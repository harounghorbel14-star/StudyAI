// ============================================================
// 🎤 services/voice.js — Voice & Multimodal Conversations
// Transcription · TTS · Voice agents · Voice-controlled workflows
// ============================================================

class VoiceService {
  constructor(options) {
    this.smartCall = options.smartCall;
    this.cache = options.cache;
    this.logger = options.logger;
    this.events = options.events;
  }

  // ─── Transcribe audio (Whisper) ──────────
  async transcribe({ audioData, audioUrl, language, format = 'mp3', user_id }) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing');

    const formData = new FormData();

    if (audioData) {
      // base64 string or Buffer
      const buffer = Buffer.isBuffer(audioData) ? audioData : Buffer.from(audioData, 'base64');
      const blob = new Blob([buffer], { type: `audio/${format}` });
      formData.append('file', blob, `audio.${format}`);
    } else if (audioUrl) {
      const r = await fetch(audioUrl);
      const buf = Buffer.from(await r.arrayBuffer());
      const blob = new Blob([buf], { type: `audio/${format}` });
      formData.append('file', blob, `audio.${format}`);
    } else {
      throw new Error('Need audioData or audioUrl');
    }

    formData.append('model', 'whisper-1');
    if (language) formData.append('language', language);

    const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      body: formData,
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error?.message || 'Transcription failed');

    this.events?.emit('voice.transcribed', { user_id, length: data.text?.length });
    return { text: data.text, language: data.language };
  }

  // ─── Text to speech ──────────────────────
  async tts({ text, voice = 'alloy', model = 'tts-1', format = 'mp3', user_id }) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing');

    const r = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, input: text, voice, response_format: format }),
    });

    if (!r.ok) {
      const err = await r.text();
      throw new Error('TTS failed: ' + err.slice(0, 200));
    }

    const buffer = Buffer.from(await r.arrayBuffer());
    const dataUrl = `data:audio/${format};base64,${buffer.toString('base64')}`;
    this.events?.emit('voice.synthesized', { user_id, length: text.length });
    return { audio_url: dataUrl, format, length: buffer.length };
  }

  // ─── Voice conversation (transcribe → AI → TTS) ──
  async voiceChat({ audioData, audioUrl, system, history = [], voice = 'alloy', user_id }) {
    // 1. Transcribe
    const transcription = await this.transcribe({ audioData, audioUrl, user_id });
    if (!transcription.text?.trim()) {
      throw new Error('Could not transcribe audio (empty)');
    }

    // 2. AI response
    const response = await this.smartCall({
      prompt: transcription.text,
      system: system || 'You are a helpful assistant. Reply concisely (under 50 words) for voice.',
      task: 'reasoning-fast',
      cacheable: false,
      history,
      user_id,
    });

    // 3. Synthesize
    const audio = await this.tts({
      text: typeof response.output === 'string' ? response.output : JSON.stringify(response.output),
      voice,
      user_id,
    });

    return {
      transcription: transcription.text,
      response: response.output,
      audio_url: audio.audio_url,
      model: response.model,
      provider: response.provider,
    };
  }

  // ─── Voice command parser (intent → action) ──
  async parseCommand({ text, available_actions = [], user_id }) {
    const result = await this.smartCall({
      prompt: `Parse this voice command into a structured action.

USER SAID: "${text}"

AVAILABLE ACTIONS:
${available_actions.map((a, i) => `${i + 1}. ${a.name}: ${a.description}`).join('\n')}

Return JSON: {
  "action": "name of matched action or 'none'",
  "confidence": 0-100,
  "parameters": {},
  "clarification_needed": true|false,
  "clarification_question": "if clarification needed"
}`,
      task: 'classification',
      json: true,
      cacheable: false,
      max_tokens: 400,
    });
    return result.output;
  }

  // ─── Available voices ────────────────────
  listVoices() {
    return [
      { id: 'alloy',   name: 'Alloy',   description: 'Neutral, balanced' },
      { id: 'echo',    name: 'Echo',    description: 'Calm, clear' },
      { id: 'fable',   name: 'Fable',   description: 'Warm, expressive' },
      { id: 'onyx',    name: 'Onyx',    description: 'Deep, authoritative' },
      { id: 'nova',    name: 'Nova',    description: 'Bright, engaging' },
      { id: 'shimmer', name: 'Shimmer', description: 'Soft, friendly' },
    ];
  }
}

module.exports = { VoiceService };