// ============================================================
// ⚡ tool-engine.js
//    Single endpoint that powers ALL 150+ tools
//    Add to server.js: require('./tool-engine')(app, deps)
// ============================================================

const fs      = require("fs");
const path    = require("path");
const multer  = require("multer");
const { getTool, listTools } = require("./tools.config");

// Multer for audio uploads (STT)
const audioUpload = multer({
  dest  : path.resolve("uploads"),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB (Whisper limit)
  fileFilter: (_req, file, cb) => {
    const ok = ["audio/mpeg","audio/mp4","audio/wav","audio/webm","audio/ogg","video/mp4"].includes(file.mimetype);
    cb(ok ? null : new Error("Unsupported audio format."), ok);
  },
});

module.exports = function mountToolEngine(app, { openai, requireAuth, requireQuota, aiLimiter, wrap, chatComplete, saveMessage, getHistory, saveProject, newSessionId }) {

  // ── GET /api/tools ──────────────────────────────────────────
  // Returns the full tool catalog (no auth needed)
  app.get("/api/tools", (_req, res) => {
    res.json({ tools: listTools(), total: listTools().length });
  });

  // ── GET /api/tools/:id ──────────────────────────────────────
  // Returns a single tool's metadata
  app.get("/api/tools/:id", (_req, res) => {
    const tool = getTool(_req.params.id);
    if (!tool) return res.status(404).json({ error: "Tool not found." });
    const { systemPrompt, ...safe } = tool; // don't expose system prompt
    res.json({ tool: safe });
  });

  // ── POST /api/tool ──────────────────────────────────────────
  // The ONE endpoint that runs any of the 150 text-based tools
  app.post(
    "/api/tool",
    requireAuth,
    requireQuota,
    aiLimiter,
    wrap(async (req, res) => {
      const { tool_id, input, session_id } = req.body;

      // ── Validate ──────────────────────────────────────────
      if (!tool_id || typeof tool_id !== "string")
        return res.status(400).json({ error: "Missing field: tool_id" });

      if (!input || typeof input !== "string" || !input.trim())
        return res.status(400).json({ error: "Missing field: input" });

      const tool = getTool(tool_id);
      if (!tool)
        return res.status(404).json({ error: `Unknown tool: "${tool_id}". GET /api/tools for the full list.` });

      // Route media tools to their dedicated endpoints
      if (tool.mediaType === "image")
        return res.status(400).json({ error: `Tool "${tool_id}" requires POST /api/tool/image` });
      if (tool.mediaType === "audio-tts")
        return res.status(400).json({ error: `Tool "${tool_id}" requires POST /api/tool/tts` });
      if (tool.mediaType === "audio-stt")
        return res.status(400).json({ error: `Tool "${tool_id}" requires POST /api/tool/stt (multipart audio)` });

      // ── Memory ────────────────────────────────────────────
      const sid      = session_id || newSessionId();
      const history  = getHistory(req.user.id, sid);

      // ── Run the tool ──────────────────────────────────────
      const output = await chatComplete(
        tool.systemPrompt,
        input.trim(),
        "gpt-4o",
        history
      );

      // ── Persist ───────────────────────────────────────────
      saveMessage(req.user.id, sid, "user",      input.trim(), tool_id);
      saveMessage(req.user.id, sid, "assistant", output,       tool_id);

      // Auto-save output as a project
      const projectId = saveProject(
        req.user.id,
        `${tool.label} — ${input.slice(0, 50)}`,
        tool_id,
        input.trim(),
        output
      );

      res.json({
        tool_id,
        label     : tool.label,
        category  : tool.category,
        output,
        session_id: sid,
        project_id: projectId,
      });
    })
  );

  // ── POST /api/tool/image ────────────────────────────────────
  // Handles all image-type tools (dall-e-3)
  app.post(
    "/api/tool/image",
    requireAuth,
    requireQuota,
    aiLimiter,
    wrap(async (req, res) => {
      const { tool_id = "image-gen", input, size = "1024x1024", quality = "standard" } = req.body;

      if (!input || typeof input !== "string" || !input.trim())
        return res.status(400).json({ error: "Missing field: input (image prompt)" });

      const tool = getTool(tool_id);
      if (!tool || tool.mediaType !== "image")
        return res.status(400).json({ error: `Tool "${tool_id}" is not an image tool.` });

      const validSizes    = ["1024x1024", "1792x1024", "1024x1792"];
      const validQuality  = ["standard", "hd"];
      const safeSize      = validSizes.includes(size)   ? size    : "1024x1024";
      const safeQuality   = validQuality.includes(quality) ? quality : "standard";

      const imgRes = await openai.images.generate({
        model  : "dall-e-3",
        prompt : input.trim().slice(0, 4000),
        size   : safeSize,
        quality: safeQuality,
        n      : 1,
      });

      const imageUrl     = imgRes.data[0].url;
      const revisedPrompt = imgRes.data[0].revised_prompt;

      // Save as project
      const projectId = saveProject(
        req.user.id,
        `${tool.label} — ${input.slice(0, 50)}`,
        tool_id,
        input.trim(),
        imageUrl
      );

      res.json({
        tool_id,
        label          : tool.label,
        image_url      : imageUrl,
        revised_prompt : revisedPrompt,
        size           : safeSize,
        quality        : safeQuality,
        project_id     : projectId,
      });
    })
  );

  // ── POST /api/tool/tts ──────────────────────────────────────
  // Text → Speech — all 5 OpenAI voices
  app.post(
    "/api/tool/tts",
    requireAuth,
    requireQuota,
    aiLimiter,
    wrap(async (req, res) => {
      const { tool_id = "tts", input } = req.body;

      if (!input || typeof input !== "string" || !input.trim())
        return res.status(400).json({ error: "Missing field: input (text to speak)" });

      const tool = getTool(tool_id);
      if (!tool || tool.mediaType !== "audio-tts")
        return res.status(400).json({ error: `Tool "${tool_id}" is not a TTS tool.` });

      const voice     = tool.voice || "alloy";
      const text      = input.trim().slice(0, 4096);
      const outPath   = path.resolve(`tts_${req.user.id}_${Date.now()}.mp3`);

      const speech = await openai.audio.speech.create({
        model : "tts-1",
        voice,
        input : text,
      });

      fs.writeFileSync(outPath, Buffer.from(await speech.arrayBuffer()));

      res.download(outPath, `speech_${voice}.mp3`, () => {
        fs.unlink(outPath, () => {});
      });
    })
  );

  // ── POST /api/tool/stt ──────────────────────────────────────
  // Voice → Text (Whisper) — multipart/form-data, field: "audio"
  app.post(
    "/api/tool/stt",
    requireAuth,
    requireQuota,
    aiLimiter,
    audioUpload.single("audio"),
    wrap(async (req, res) => {
      if (!req.file)
        return res.status(400).json({ error: "No audio file uploaded. Use field name: audio" });

      const filePath = req.file.path;
      let transcript = "";

      try {
        const result = await openai.audio.transcriptions.create({
          file  : fs.createReadStream(filePath),
          model : "whisper-1",
          response_format: "verbose_json", // includes language + segments
        });

        transcript = result.text;

        // Also save as project for history
        saveProject(
          req.user.id,
          `Transcription — ${req.file.originalname}`,
          "stt",
          req.file.originalname,
          transcript
        );

        res.json({
          tool_id   : "stt",
          label     : "Voice → Text",
          transcript,
          language  : result.language,
          duration  : result.duration,
          segments  : result.segments?.map(s => ({
            start: s.start,
            end  : s.end,
            text : s.text,
          })) || [],
        });

      } finally {
        fs.unlink(filePath, () => {}); // always clean up
      }
    })
  );

  // ── POST /api/tool/batch ────────────────────────────────────
  // Run multiple tools in parallel (Pro/Elite plan only)
  app.post(
    "/api/tool/batch",
    requireAuth,
    aiLimiter,
    wrap(async (req, res) => {
      // Pro/Elite only
      if (!["pro", "elite"].includes(req.dbUser?.plan)) {
        return res.status(403).json({ error: "Batch processing requires Pro or Elite plan." });
      }

      const { jobs } = req.body; // [{ tool_id, input }]
      if (!Array.isArray(jobs) || jobs.length === 0)
        return res.status(400).json({ error: "Missing field: jobs (array of {tool_id, input})" });

      if (jobs.length > 10)
        return res.status(400).json({ error: "Max 10 jobs per batch request." });

      // Validate all jobs before running any
      for (const job of jobs) {
        if (!job.tool_id || !job.input)
          return res.status(400).json({ error: "Each job needs tool_id and input." });
        const tool = getTool(job.tool_id);
        if (!tool)
          return res.status(404).json({ error: `Unknown tool: "${job.tool_id}"` });
        if (tool.mediaType)
          return res.status(400).json({ error: `Tool "${job.tool_id}" is a media tool — batch only supports text tools.` });
      }

      // Run all in parallel
      const results = await Promise.allSettled(
        jobs.map(async (job) => {
          const tool   = getTool(job.tool_id);
          const output = await chatComplete(tool.systemPrompt, job.input.trim());
          saveProject(req.user.id, `${tool.label} — ${job.input.slice(0, 40)}`, job.tool_id, job.input.trim(), output);
          return { tool_id: job.tool_id, label: tool.label, output };
        })
      );

      const response = results.map((r, i) =>
        r.status === "fulfilled"
          ? { ...r.value, success: true }
          : { tool_id: jobs[i].tool_id, success: false, error: r.reason?.message || "Failed" }
      );

      res.json({ results: response, total: jobs.length });
    })
  );

};