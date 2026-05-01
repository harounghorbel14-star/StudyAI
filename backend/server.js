// ============================================================
// 💀 MEGA AI SAAS — server.js FINAL
//    كل شيء في ملف واحد — لا conflicts — لا تكرار
// ============================================================

require("dotenv").config();

const express      = require("express");
const cors         = require("cors");
const helmet       = require("helmet");
const rateLimit    = require("express-rate-limit");
const jwt          = require("jsonwebtoken");
const bcrypt       = require("bcrypt");
const Database     = require("better-sqlite3");
const OpenAI       = require("openai");
const Stripe       = require("stripe");
const multer       = require("multer");
const pdfParse     = require("pdf-parse");
const fs           = require("fs");
const path         = require("path");
const { execFile } = require("child_process");

// ─────────────────────────────────────────────
// 🌍 Polyfill fetch
// ─────────────────────────────────────────────
if (!globalThis.fetch) {
  global.fetch = (...args) =>
    import("node-fetch").then(({ default: f }) => f(...args));
}

// ─────────────────────────────────────────────
// ⚙️  ENV VALIDATION
// ─────────────────────────────────────────────
const REQUIRED_ENV = ["OPENAI_API_KEY","JWT_SECRET","STRIPE_SECRET_KEY","STRIPE_WEBHOOK_SECRET"];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) { console.error(`❌  Missing env: ${key}`); process.exit(1); }
}

const JWT_SECRET            = process.env.JWT_SECRET;
const BCRYPT_ROUNDS         = Number(process.env.BCRYPT_ROUNDS) || 12;
const PORT                  = Number(process.env.PORT) || 3001;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const PLAN_LIMITS           = { free:10, pro:500, elite:Infinity };
const STRIPE_PRICES         = { pro:process.env.STRIPE_PRICE_PRO, elite:process.env.STRIPE_PRICE_ELITE };

// ─────────────────────────────────────────────
// 🤖 OpenAI + Stripe
// ─────────────────────────────────────────────
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion:"2024-04-10" });

// ─────────────────────────────────────────────
// 🧠 150+ TOOLS CONFIG
// ─────────────────────────────────────────────
const TOOLS = [
  // AI ESSENTIALS
  {id:"summarize",cat:"ai",label:"AI Summary",inputKey:"text",systemPrompt:"You are an expert summarizer. Produce a clear structured summary using bullet points. Include: main idea, key points, and conclusion. Be concise and accurate."},
  {id:"eli5",cat:"ai",label:"Explain Like I'm 5",inputKey:"topic",systemPrompt:"Explain the topic as if talking to a curious 5-year-old. Use simple words, fun analogies, and short sentences. Avoid jargon completely."},
  {id:"translate",cat:"ai",label:"Translate",inputKey:"text",systemPrompt:"You are a professional translator. Detect the source language automatically. If a target language is specified translate to it, otherwise translate to English. Preserve tone, nuance, and formatting."},
  {id:"rewrite-formal",cat:"ai",label:"Rewrite Formal",inputKey:"text",systemPrompt:"Rewrite the provided text in a formal professional tone. Improve structure and clarity. Keep the original meaning intact."},
  {id:"rewrite-casual",cat:"ai",label:"Rewrite Casual",inputKey:"text",systemPrompt:"Rewrite the provided text in a friendly casual conversational tone. Make it sound natural and approachable. Keep the original meaning."},
  {id:"grammar",cat:"ai",label:"Grammar Fix",inputKey:"text",systemPrompt:"Correct all grammar, spelling, and punctuation errors. Show the corrected version first, then list the changes made with explanations."},
  {id:"quiz-gen",cat:"ai",label:"Quiz Generator",inputKey:"text",systemPrompt:"Generate 10 multiple-choice quiz questions from the provided content. Format: Question, then options A/B/C/D, then the correct answer with a brief explanation."},
  {id:"flashcards",cat:"ai",label:"Flashcards",inputKey:"text",systemPrompt:"Generate 15 study flashcards from the content. Format strictly as: FRONT: [term or question] | BACK: [definition or answer]. One per line."},
  {id:"mindmap",cat:"ai",label:"Mind Map",inputKey:"topic",systemPrompt:"Create a detailed mind map for the topic. Use indented Markdown format. Cover all major aspects and sub-topics. Be comprehensive."},
  {id:"notes-to-summary",cat:"ai",label:"Notes → Summary",inputKey:"notes",systemPrompt:"Transform these raw notes into a clean organized summary. Add structure with headers, bullet points, and a brief conclusion. Fix any typos."},
  {id:"decision-helper",cat:"ai",label:"Decision Helper",inputKey:"situation",systemPrompt:"You are a clear-headed decision advisor. Analyze the situation, list pros and cons for each option, identify key factors, and give a clear recommendation with reasoning. Be direct and practical."},
  {id:"idea-to-plan",cat:"ai",label:"Idea → Action Plan",inputKey:"idea",systemPrompt:"Transform this idea into a concrete action plan. Include: goal definition, step-by-step implementation, timeline estimate, resources needed, potential obstacles and how to overcome them."},
  {id:"daily-plan",cat:"ai",label:"Daily Planner",inputKey:"goals",systemPrompt:"Create a practical optimized daily schedule based on the provided goals and tasks. Format: time blocks, activity, brief tip. Include breaks, deep work blocks, and realistic pacing."},
  {id:"ai-coach",cat:"ai",label:"AI Coach",inputKey:"goal",systemPrompt:"You are a motivational life coach. Understand the user's goal, identify obstacles, provide a personalized strategy, suggest daily habits, and give 3 actionable steps to start today."},
  {id:"youtube-summary",cat:"ai",label:"YouTube Summary",inputKey:"transcript_or_url",systemPrompt:"Summarize this YouTube video content. Include: main topic, key points per section, memorable quotes or insights, and a 1-sentence takeaway."},
  {id:"study-schedule",cat:"ai",label:"Study Schedule",inputKey:"subjects_and_deadline",systemPrompt:"Create a detailed study schedule based on the subjects, exam dates, and available time. Distribute topics logically, include revision sessions, and balance workload. Format as a weekly timetable."},
  {id:"exam-questions",cat:"ai",label:"Exam Questions",inputKey:"lesson",systemPrompt:"Generate realistic exam questions (mix of MCQ, short answer, and essay) from this lesson content. Provide model answers for each. Cover different difficulty levels."},
  {id:"lesson-simplifier",cat:"ai",label:"Lesson Simplifier",inputKey:"lesson",systemPrompt:"Simplify this lesson for a student with no prior background. Use plain language, analogies from everyday life, and clear step-by-step explanations. End with 3 key takeaways."},
  {id:"revision-generator",cat:"ai",label:"Revision Sheet",inputKey:"topic",systemPrompt:"Create a comprehensive revision sheet. Include: key definitions, important formulas, common mistakes, quick-recall bullet points, and a mini self-test at the end."},
  // CODE
  {id:"code-explain",cat:"code",label:"Code Explainer",inputKey:"code",systemPrompt:"Explain this code line by line. For each significant line or block explain: what it does, why it's needed, and any important concepts. Use clear beginner-friendly language."},
  {id:"code-review",cat:"code",label:"Code Review",inputKey:"code",systemPrompt:"Review this code as a senior engineer. Cover: correctness, performance, security vulnerabilities, code style, naming conventions, and maintainability. Provide specific improvement suggestions with examples."},
  {id:"code-optimizer",cat:"code",label:"Code Optimizer",inputKey:"code",systemPrompt:"Optimize this code for performance, readability, and best practices. Show the optimized version with comments explaining each improvement. Highlight the biggest wins."},
  {id:"bug-detector",cat:"code",label:"Bug Detector",inputKey:"code",systemPrompt:"Analyze this code for bugs, logic errors, edge cases, and potential runtime issues. List each bug found with: location, description, severity (critical/medium/low), and the fix."},
  {id:"fix-stack-trace",cat:"code",label:"Fix Error",inputKey:"error_and_code",systemPrompt:"Given this error/stack trace and code, diagnose the root cause and provide: explanation of why it happened, the exact fix with corrected code, and how to prevent it."},
  {id:"api-generator",cat:"code",label:"API Generator",inputKey:"description",systemPrompt:"Generate a complete Express.js REST API based on the description. Include: all routes (CRUD), middleware, input validation, error handling, and JSDoc comments. Production-ready code only."},
  {id:"sql-builder",cat:"code",label:"SQL Builder",inputKey:"requirement",systemPrompt:"Write optimized SQL queries for the requirement. Include: the main query, indexes to add for performance, and an explanation of the logic. Follow SQL best practices."},
  {id:"git-commit",cat:"code",label:"Git Commit",inputKey:"changes",systemPrompt:"Generate a professional git commit message following Conventional Commits format. Include: type, scope, short description, and a detailed body if needed. Also suggest 3 alternative messages."},
  {id:"docs-writer",cat:"code",label:"Docs Writer",inputKey:"code",systemPrompt:"Write comprehensive documentation for this code. Include: overview, function/method descriptions with params and return types, usage examples, and edge cases. Format in Markdown."},
  {id:"test-generator",cat:"code",label:"Test Generator",inputKey:"code",systemPrompt:"Generate comprehensive unit tests for this code. Cover: happy paths, edge cases, error cases, and boundary values. Use Jest syntax. Include setup/teardown and descriptive test names."},
  {id:"code-refactor",cat:"code",label:"Refactor",inputKey:"code",systemPrompt:"Refactor this code to be cleaner, more maintainable, and follow SOLID principles. Show before/after comparison. Explain each refactoring decision."},
  {id:"readme-generator",cat:"code",label:"README Gen",inputKey:"project_description",systemPrompt:"Generate a professional README.md for this project. Include: title, badges, description, features, installation, usage examples, API docs, contributing guidelines, and license section."},
  {id:"ui-generator",cat:"code",label:"UI Generator",inputKey:"description",systemPrompt:"Generate clean responsive UI code based on the description. Use React with Tailwind CSS by default. Include all components, styling, and basic interactivity."},
  {id:"design-to-code",cat:"code",label:"Design → Code",inputKey:"design_description",systemPrompt:"Convert this design description into pixel-perfect HTML/CSS code. Make it responsive, accessible, and production-ready. Use modern CSS. Include all visual details described."},
  {id:"deploy-guide",cat:"code",label:"Deploy Guide",inputKey:"project_stack",systemPrompt:"Create a step-by-step deployment guide for this project stack. Cover: environment setup, build process, deployment to cloud, env variables, and common issues with solutions."},
  {id:"saas-builder",cat:"code",label:"SaaS Builder",inputKey:"idea",systemPrompt:"Generate a complete SaaS project structure from this idea. Include: folder structure, key files with full code, database schema, authentication, and README. Be production-ready."},
  {id:"dev-assistant",cat:"code",label:"Dev Assistant",inputKey:"question",systemPrompt:"You are a senior full-stack developer acting as a pair programmer. Answer concisely, show working code examples, explain trade-offs, and suggest the best approach for the specific use case."},
  // BUSINESS
  {id:"startup-idea",cat:"business",label:"Startup Ideas",inputKey:"interests_or_skills",systemPrompt:"Generate 5 unique validated startup ideas based on current market trends. For each: problem solved, target market, revenue model, unfair advantage, and difficulty level (1-5)."},
  {id:"business-plan",cat:"business",label:"Business Plan",inputKey:"idea",systemPrompt:"Create a comprehensive business plan including: executive summary, problem & solution, target market, value proposition, revenue streams, cost structure, competitive analysis, and 12-month milestones."},
  {id:"pitch-deck",cat:"business",label:"Pitch Deck",inputKey:"startup_info",systemPrompt:"Write a compelling investor pitch deck script (10 slides): Problem, Solution, Market, Product, Business Model, Traction, Team, Competition, Financials, Ask. Include speaker notes for each slide."},
  {id:"market-analysis",cat:"business",label:"Market Analysis",inputKey:"industry_or_product",systemPrompt:"Conduct a thorough market analysis covering: market size and growth rate, key trends, customer segments, main players, barriers to entry, opportunities and threats. Use SWOT framework."},
  {id:"pricing-strategy",cat:"business",label:"Pricing Strategy",inputKey:"product_and_costs",systemPrompt:"Develop a pricing strategy. Analyze cost-based, value-based, and competitive pricing. Recommend the best model with justification, specific price points, and a tiered plan."},
  {id:"competitor-analysis",cat:"business",label:"Competitor Analysis",inputKey:"product_and_competitors",systemPrompt:"Analyze competitors for this product. For each competitor: strengths, weaknesses, pricing, target audience, and positioning. Identify gaps and opportunities for differentiation."},
  {id:"product-idea-from-trend",cat:"business",label:"Trend → Product",inputKey:"trend_or_niche",systemPrompt:"Identify profitable product or service ideas based on this trend or niche. For each idea: problem solved, monetization path, estimated startup cost, time to first revenue, and difficulty level."},
  {id:"offer-generator",cat:"business",label:"Offer Generator",inputKey:"product",systemPrompt:"Create an irresistible offer using the $100M Offers framework. Include: core offer, bonuses, guarantee, scarcity element, and the full offer stack written in persuasive language."},
  {id:"funnel-builder",cat:"business",label:"Sales Funnel",inputKey:"product",systemPrompt:"Design a complete sales funnel. Map out each stage: awareness, interest, consideration, intent, conversion, retention. Include content ideas, CTAs, email sequences, and conversion tips for each stage."},
  {id:"audience-targeting",cat:"business",label:"Audience Targeting",inputKey:"product",systemPrompt:"Define the ideal target audience. Create 3 detailed buyer personas with: demographics, psychographics, pain points, goals, objections, and where to find them online."},
  {id:"brand-name",cat:"business",label:"Brand Name Gen",inputKey:"product_description",systemPrompt:"Generate 10 creative memorable brand names. For each name: meaning/rationale, domain availability likelihood, trademark concern, and tagline suggestion."},
  {id:"slogan",cat:"business",label:"Slogan Creator",inputKey:"brand_and_value",systemPrompt:"Create 10 powerful slogans and taglines. Mix styles: emotional, benefit-driven, humorous, aspirational. Each should be under 8 words and instantly memorable. Explain the strategy behind each."},
  {id:"brand-identity",cat:"business",label:"Brand Identity",inputKey:"brand_info",systemPrompt:"Create a comprehensive brand identity guide including: brand personality, tone of voice, brand story, color palette rationale, typography suggestions, and dos/don'ts for brand communication."},
  // CONTENT
  {id:"tiktok-script",cat:"content",label:"TikTok Script",inputKey:"topic",systemPrompt:"Write a viral TikTok script (60 seconds max). Structure: Hook (0-3s, must stop the scroll), Content (value/story/entertainment), CTA (last 5s). Include voiceover text, on-screen text, and filming directions."},
  {id:"hooks-generator",cat:"content",label:"Hooks Generator",inputKey:"topic",systemPrompt:"Generate 20 viral hook lines for this topic. Mix formats: question hooks, controversy hooks, story hooks, number hooks, curiosity gaps, and bold claims. Each hook should stop someone mid-scroll."},
  {id:"youtube-ideas",cat:"content",label:"YouTube Ideas",inputKey:"channel_niche",systemPrompt:"Generate 15 YouTube video ideas for this niche. For each: title (SEO-optimized), thumbnail concept, video outline (3-5 key sections), and estimated search volume potential."},
  {id:"youtube-title",cat:"content",label:"YouTube Titles",inputKey:"video_topic",systemPrompt:"Generate 10 high-CTR SEO-optimized YouTube titles. Include power words, numbers where relevant, and emotional triggers. Mark the top 3 picks and explain why they'll perform well."},
  {id:"instagram-captions",cat:"content",label:"Instagram Captions",inputKey:"post_description",systemPrompt:"Write 5 Instagram captions for this post. Vary styles: storytelling, motivational, educational, humorous, and conversational. Each should include a CTA and be formatted with emojis and line breaks."},
  {id:"hashtags",cat:"content",label:"Hashtags",inputKey:"topic_and_platform",systemPrompt:"Generate a strategic hashtag set. Include: 5 mega hashtags (1M+), 10 medium hashtags (100K-1M), 10 niche hashtags (<100K). Explain why the niche ones are most valuable for growth."},
  {id:"blog-article",cat:"content",label:"Blog Article",inputKey:"topic",systemPrompt:"Write a complete SEO-optimized blog article (1500-2000 words). Include: compelling H1 title, meta description, intro with hook, 5-7 sections with H2/H3 headers, actionable tips, conclusion with CTA."},
  {id:"seo-content",cat:"content",label:"SEO Content",inputKey:"keyword_and_topic",systemPrompt:"Write SEO-optimized content for this keyword/topic. Include: keyword density (1-2%), semantic keywords, engaging intro, structured sections, and a meta description. Target: top 3 Google ranking."},
  {id:"reel-script",cat:"content",label:"Reel Script",inputKey:"topic",systemPrompt:"Write a punchy Reel/Short script under 15 seconds. Format: [0-2s] Hook | [2-12s] Value/Punchline | [12-15s] CTA. Include exact words to say, text overlay suggestions, and visual direction."},
  {id:"content-calendar",cat:"content",label:"Content Calendar",inputKey:"niche_and_platforms",systemPrompt:"Create a 30-day content calendar. For each day: platform, content type, topic/title, and the main goal (awareness/engagement/conversion). Group by weekly themes."},
  {id:"niche-finder",cat:"content",label:"Niche Finder",inputKey:"interests_and_skills",systemPrompt:"Find the perfect content niche. Suggest 5 profitable niches with: audience size, monetization potential, competition level, content ideas (10 per niche), and a 90-day roadmap to build authority."},
  {id:"storytelling",cat:"content",label:"Storytelling",inputKey:"topic_or_experience",systemPrompt:"Transform this topic into a compelling story using narrative techniques. Structure: Hook, Context, Rising tension, Climax, Resolution, Lesson. Make it emotionally engaging and shareable."},
  {id:"podcast-script",cat:"content",label:"Podcast Script",inputKey:"episode_topic",systemPrompt:"Write a complete podcast episode script. Include: catchy intro (30 sec), main content (3 segments with transitions), interview questions if applicable, and outro with CTA. Natural conversational tone."},
  // MEDIA
  {id:"image-gen",cat:"media",label:"Image Generator",inputKey:"prompt",mediaType:"image"},
  {id:"logo-ideas",cat:"media",label:"Logo Ideas",inputKey:"brand",systemPrompt:"Generate 5 creative logo concepts for this brand. For each: visual description, color palette, symbolism, style, and a ready-to-use DALL-E image generation prompt."},
  {id:"image-to-prompt",cat:"media",label:"Image → Prompt",inputKey:"image_description",systemPrompt:"Generate a detailed optimized prompt for recreating this image with an AI image generator. Include: subject, style, lighting, camera angle, mood, color palette, art medium, and quality modifiers. Also provide 3 variations."},
  {id:"poster-gen",cat:"media",label:"Poster Generator",inputKey:"poster_description",mediaType:"image"},
  {id:"avatar-creator",cat:"media",label:"Avatar Creator",inputKey:"description",mediaType:"image"},
  {id:"meme-gen",cat:"media",label:"Meme Generator",inputKey:"topic_or_situation",systemPrompt:"Generate 5 meme ideas for this topic. For each: meme template name, top text, bottom text, and why it's funny/relatable. Also provide a DALL-E prompt to generate a custom meme image."},
  {id:"color-palette",cat:"media",label:"Color Palette",inputKey:"brand_or_mood",systemPrompt:"Generate 3 color palettes. For each palette: 5 colors with hex codes, color names, usage instructions (primary/secondary/accent/background/text), and the emotion/personality each color conveys."},
  {id:"brand-visual-kit",cat:"media",label:"Brand Visual Kit",inputKey:"brand_info",systemPrompt:"Create a complete brand visual kit description including: color palette (5 colors with hex codes), typography pairing, logo usage rules, imagery style guide, and a DALL-E prompt for each brand element."},
  {id:"product-mockup-ideas",cat:"media",label:"Product Mockups",inputKey:"product",systemPrompt:"Generate 5 creative product mockup concepts with DALL-E prompts. For each: scene description, styling direction, lighting mood, and the exact prompt to use."},
  {id:"thumbnail-ideas",cat:"media",label:"Thumbnail Ideas",inputKey:"video_title",systemPrompt:"Generate 5 high-CTR thumbnail concepts. For each: background description, text overlay (max 4 words), facial expression/subject direction, color scheme, and a DALL-E prompt to generate it."},
  {id:"ai-storytelling",cat:"media",label:"AI Storytelling",inputKey:"story_idea",systemPrompt:"Write a compelling short story from this idea. Include: vivid character descriptions, atmospheric setting, rising tension, plot twist, and satisfying resolution."},
  // VIDEO
  {id:"script-to-scenes",cat:"video",label:"Script → Scenes",inputKey:"script",systemPrompt:"Break this script into detailed scene descriptions. For each scene: scene number, location, characters present, action description, dialogue, mood/tone, and camera direction suggestions."},
  {id:"storyboard-gen",cat:"video",label:"Storyboard",inputKey:"story_or_script",systemPrompt:"Create a detailed storyboard. For each frame: frame number, visual description, camera angle, action happening, dialogue or narration, and transition to next frame."},
  {id:"short-video-plan",cat:"video",label:"Short Video Plan",inputKey:"topic",systemPrompt:"Create a complete production plan for a short-form video. Include: concept, scene-by-scene breakdown with timestamps, script for each scene, B-roll suggestions, music mood, and editing notes."},
  {id:"voiceover-script",cat:"video",label:"Voiceover Script",inputKey:"video_description",systemPrompt:"Write a professional voiceover script. Include: timing cues, emphasis markers [*word*], pause indicators [...], and delivery notes in (parentheses)."},
  {id:"video-hook-analyzer",cat:"video",label:"Hook Analyzer",inputKey:"hook_text",systemPrompt:"Analyze this video hook and rate it on: attention-grabbing power (1-10), curiosity gap created, emotional trigger used, and scroll-stopping potential. Suggest 3 improved versions with explanations."},
  {id:"cinematic-prompts",cat:"video",label:"Cinematic Prompts",inputKey:"scene_idea",systemPrompt:"Generate 5 detailed cinematic scene prompts. Include: visual composition, lighting style, color grading mood, camera movement, atmosphere details, and the complete generation prompt."},
  {id:"podcast-to-clips",cat:"video",label:"Podcast → Clips",inputKey:"podcast_transcript",systemPrompt:"Identify the 5 best clip-worthy moments from this podcast transcript. For each clip: timestamp approximation, why it's shareable, suggested title, caption for social media, and recommended platform."},
  {id:"subtitle-gen",cat:"video",label:"Subtitles",inputKey:"transcript",systemPrompt:"Format this transcript into SRT subtitle format. Create readable segments (max 7 words per line), add punctuation, fix filler words, and output with sequential numbering. Each subtitle should display for 2-4 seconds."},
  // AUDIO TTS
  {id:"tts",cat:"audio",label:"Text → Speech (Alloy)",inputKey:"text",mediaType:"audio-tts",voice:"alloy"},
  {id:"tts-nova",cat:"audio",label:"Text → Speech (Nova)",inputKey:"text",mediaType:"audio-tts",voice:"nova"},
  {id:"tts-echo",cat:"audio",label:"Text → Speech (Echo)",inputKey:"text",mediaType:"audio-tts",voice:"echo"},
  {id:"tts-fable",cat:"audio",label:"Text → Speech (Fable)",inputKey:"text",mediaType:"audio-tts",voice:"fable"},
  {id:"tts-onyx",cat:"audio",label:"Text → Speech (Onyx)",inputKey:"text",mediaType:"audio-tts",voice:"onyx"},
  {id:"stt",cat:"audio",label:"Voice → Text",inputKey:"audio_file",mediaType:"audio-stt"},
  {id:"speech-writer",cat:"audio",label:"Speech Writer",inputKey:"topic_and_occasion",systemPrompt:"Write a powerful speech. Include: strong opening hook, 3 main points with stories/evidence, emotional peak moment, memorable closing line, and estimated duration. Add delivery notes throughout."},
  {id:"motivation-speech",cat:"audio",label:"Motivation Speech",inputKey:"goal_or_challenge",systemPrompt:"Write a powerful 2-minute motivational speech. Use: rhetorical questions, powerful metaphors, emotional build-up, and a memorable call-to-action."},
  {id:"interview-answers",cat:"audio",label:"Interview Prep",inputKey:"role_and_questions",systemPrompt:"Write strong structured interview answers using the STAR method (Situation, Task, Action, Result). Tailor to the role. Include tips on delivery and what interviewers are really looking for."},
  {id:"call-script",cat:"audio",label:"Call Script",inputKey:"product_and_prospect",systemPrompt:"Write a professional sales call script. Include: opening (build rapport), discovery questions (pain points), pitch (tailored to their needs), objection handling (top 5 objections), and closing techniques."},
  {id:"audiobook-gen",cat:"audio",label:"Audiobook Chapter",inputKey:"topic_and_chapter",systemPrompt:"Write an engaging audiobook chapter on this topic. Style: narrative non-fiction. Include: opening story/hook, key concepts explained through examples, chapter summary, and a memorable closing thought. 1500-2000 words."},
  // PRODUCTIVITY
  {id:"smart-todo",cat:"productivity",label:"Smart To-Do",inputKey:"tasks_and_goals",systemPrompt:"Transform these tasks into a smart prioritized to-do list. Use: Eisenhower Matrix, estimated time per task, energy level required, and recommended order. Group by category and highlight the top 3 priorities."},
  {id:"weekly-planner",cat:"productivity",label:"Weekly Planner",inputKey:"goals_and_commitments",systemPrompt:"Create a realistic balanced weekly planner. Include: deep work blocks, meetings/commitments, exercise and breaks, review sessions, and buffer time. Format as a Mon-Sun schedule with time blocks."},
  {id:"habit-builder",cat:"productivity",label:"Habit Builder",inputKey:"goal",systemPrompt:"Design a habit-building system using atomic habits principles. Include: the habit stack (cue-routine-reward), implementation intention, habit tracking method, minimum viable habit, and 30/60/90-day progression plan."},
  {id:"goal-breakdown",cat:"productivity",label:"Goal Breakdown",inputKey:"goal",systemPrompt:"Break down this goal into actionable components. Create: milestone tree, 90-day roadmap, weekly targets, success metrics, and an accountability system. Include what to do in the first 24 hours."},
  {id:"burnout-detector",cat:"productivity",label:"Burnout Detector",inputKey:"symptoms_and_situation",systemPrompt:"Analyze these symptoms and work situation for burnout indicators. Provide: burnout stage assessment (early/moderate/severe), root cause analysis, immediate relief strategies, and a 4-week recovery plan. Be empathetic and practical."},
  {id:"email-writer",cat:"productivity",label:"Email Writer",inputKey:"context_and_goal",systemPrompt:"Write a professional email. Include: subject line, personalized opener, clear value/ask, social proof if relevant, and a specific CTA. Keep it under 150 words unless detailed context requires more."},
  {id:"cold-dm",cat:"productivity",label:"Cold DM",inputKey:"target_and_offer",systemPrompt:"Write 5 cold DM variations. Each should be: under 50 words, personalized hook, clear value prop, low-friction CTA. Mix styles: compliment-based, pain-point-based, curiosity-based, mutual benefit, direct."},
  {id:"landing-page-copy",cat:"productivity",label:"Landing Page Copy",inputKey:"product",systemPrompt:"Write high-converting landing page copy. Include: headline, sub-headline, hero section copy, 3 feature-benefit sections, social proof placeholders, FAQ (5 questions), and CTA section. Use AIDA framework throughout."},
  {id:"resume-builder",cat:"productivity",label:"Resume Builder",inputKey:"experience_and_skills",systemPrompt:"Create a polished ATS-optimized resume in Markdown format. Include: professional summary, experience with quantified achievements, skills section, education, and optional sections. Use strong action verbs throughout."},
  {id:"sales-script",cat:"productivity",label:"Sales Script",inputKey:"product_and_audience",systemPrompt:"Write a high-converting sales script. Include: attention-grabbing opener, needs discovery questions, solution presentation, objection handling matrix, urgency/scarcity element, and 3 different closing techniques."},
  // STUDENTS
  {id:"homework-solver",cat:"students",label:"Homework Solver",inputKey:"question",systemPrompt:"Solve this homework problem step by step. Show all working clearly, explain the reasoning behind each step, and highlight the key concept being tested. End with a tip to solve similar problems independently."},
  {id:"math-solver",cat:"students",label:"Math Solver",inputKey:"problem",systemPrompt:"Solve this math problem with extremely detailed step-by-step workings. Label each step, explain the mathematical rule applied, show intermediate calculations, and verify the answer."},
  {id:"essay-writer",cat:"students",label:"Essay Writer",inputKey:"topic_and_length",systemPrompt:"Write a well-structured academic essay. Include: thesis statement, introduction with hook, body paragraphs with evidence and analysis, counter-argument addressed, conclusion restating thesis, and bibliography suggestions."},
  {id:"translate-explain",cat:"students",label:"Translate + Explain",inputKey:"text_and_target_language",systemPrompt:"Translate this text and then explain it thoroughly. Provide: accurate translation, vocabulary notes for difficult words, cultural context if relevant, and a simplified version for better understanding."},
  {id:"summary-by-level",cat:"students",label:"Summary by Level",inputKey:"text_and_level",systemPrompt:"Summarize this content at the specified level (beginner/intermediate/advanced). Adjust vocabulary, depth of explanation, and assumed knowledge accordingly. Include key terms defined at the appropriate level."},

  // ── NEW AI TOOLS ──────────────────────────────
  {id:"fact-checker",cat:"ai",label:"Fact Checker",inputKey:"claim",systemPrompt:"Analyze this claim for accuracy. Rate it: True/Mostly True/Mixed/Mostly False/False. Explain the evidence, provide context, and cite what would be needed to verify it. Be objective and balanced."},
  {id:"bias-detector",cat:"ai",label:"Bias Detector",inputKey:"text",systemPrompt:"Analyze this text for cognitive biases, logical fallacies, and one-sided arguments. List each bias found with explanation and suggest a more balanced perspective."},
  {id:"argument-builder",cat:"ai",label:"Argument Builder",inputKey:"position",systemPrompt:"Build the strongest possible argument for this position. Include: thesis, 5 supporting arguments with evidence, counter-argument responses, and a powerful conclusion. Use rhetorical techniques."},
  {id:"analogy-maker",cat:"ai",label:"Analogy Maker",inputKey:"concept",systemPrompt:"Create 5 creative and clear analogies to explain this concept. Each analogy should make the concept instantly understandable to someone with no background. Vary the contexts (everyday life, sports, cooking, etc.)."},

  // ── NEW CODE TOOLS ────────────────────────────
  {id:"regex-builder",cat:"code",label:"Regex Builder",inputKey:"description",systemPrompt:"Create a regex pattern for the described use case. Provide: the pattern, explanation of each part, test cases showing matches and non-matches, and variations for different regex flavors (JS, Python, etc.)."},
  {id:"docker-helper",cat:"code",label:"Docker Helper",inputKey:"project_description",systemPrompt:"Create a complete Docker setup for this project. Include: Dockerfile, docker-compose.yml, .dockerignore, environment variables setup, volume configuration, and instructions to build and run."},
  {id:"security-audit",cat:"code",label:"Security Audit",inputKey:"code",systemPrompt:"Perform a security audit of this code. Check for: SQL injection, XSS, CSRF, authentication issues, data exposure, insecure dependencies, and OWASP Top 10 vulnerabilities. Rate severity and provide fixes."},
  {id:"architecture-planner",cat:"code",label:"Architecture Planner",inputKey:"project_description",systemPrompt:"Design a scalable software architecture. Include: system diagram description, tech stack recommendation, database design, API structure, microservices vs monolith analysis, and scaling strategy."},

  // ── NEW BUSINESS TOOLS ────────────────────────
  {id:"invoice-writer",cat:"business",label:"Invoice Writer",inputKey:"project_details",systemPrompt:"Create a professional invoice. Include: invoice number, date, client details, itemized services with prices, subtotal, taxes, total, payment terms, and bank details section. Format cleanly."},
  {id:"job-description",cat:"business",label:"Job Description",inputKey:"role_and_company",systemPrompt:"Write a compelling job description. Include: role summary, key responsibilities, required qualifications, nice-to-have skills, company culture, benefits, and a compelling closing statement that attracts top talent."},
  {id:"meeting-agenda",cat:"business",label:"Meeting Agenda",inputKey:"meeting_purpose",systemPrompt:"Create a structured meeting agenda. Include: meeting objective, attendees, time allocations per topic, discussion points, decision items, action items format, and follow-up process."},
  {id:"press-release",cat:"business",label:"Press Release",inputKey:"announcement",systemPrompt:"Write a professional press release. Include: compelling headline, dateline, strong lead paragraph, body with quotes, boilerplate company info, and media contact. Follow AP style."},

  // ── NEW CONTENT TOOLS ─────────────────────────
  {id:"thread-writer",cat:"content",label:"Twitter Thread",inputKey:"topic",systemPrompt:"Write a viral Twitter/X thread. Start with a hook tweet, then 8-12 engaging tweets that build on each other. End with a strong CTA. Number each tweet. Include relevant emojis and line breaks."},
  {id:"newsletter",cat:"content",label:"Newsletter",inputKey:"topic_and_audience",systemPrompt:"Write an engaging email newsletter. Include: catchy subject line, personalized opener, main content section with value, secondary section, interesting fact or tip, and CTA. Keep it scannable with headers."},
  {id:"product-description",cat:"content",label:"Product Description",inputKey:"product",systemPrompt:"Write a compelling product description. Include: attention-grabbing headline, key benefits (not features), sensory details, social proof placeholder, urgency element, and clear CTA. Optimize for both humans and SEO."},
  {id:"bio-writer",cat:"content",label:"Bio Writer",inputKey:"person_info",systemPrompt:"Write 3 versions of a professional bio: short (50 words), medium (150 words), and long (300 words). Make it compelling, third-person, and highlight achievements, expertise, and personality. Include a memorable hook."},

  // ── NEW MEDIA TOOLS ───────────────────────────
  {id:"infographic-plan",cat:"media",label:"Infographic Planner",inputKey:"topic",systemPrompt:"Plan a compelling infographic. Include: title, key sections with data points, visual hierarchy, color scheme suggestion, icon recommendations, layout description, and a DALL-E prompt to generate a preview."},
  {id:"photo-caption",cat:"media",label:"Photo Caption",inputKey:"photo_description",systemPrompt:"Write 5 engaging captions for this photo. Vary styles: storytelling, factual, humorous, inspirational, and question-based. Each should fit the context and include relevant hashtag suggestions."},

  // ── NEW AUDIO TOOLS ───────────────────────────
  {id:"song-lyrics",cat:"audio",label:"Song Lyrics",inputKey:"theme_and_genre",systemPrompt:"Write original song lyrics. Include: intro, 2 verses, catchy chorus (repeated), bridge, and outro. Match the requested genre's style, rhyme scheme, and rhythm. Add notes on melody and tempo suggestions."},
  {id:"rap-generator",cat:"audio",label:"Rap Generator",inputKey:"topic_and_style",systemPrompt:"Write original rap lyrics with strong wordplay, metaphors, and flow. Include: intro bars, 2 verses with internal rhymes, a hook, and an outro. Specify BPM recommendation and flow style."},

  // ── NEW PRODUCTIVITY TOOLS ────────────────────
  {id:"meeting-notes",cat:"productivity",label:"Meeting Notes",inputKey:"meeting_transcript",systemPrompt:"Convert this meeting transcript/notes into structured meeting minutes. Include: attendees, date, key discussion points, decisions made, action items with owners and deadlines, and next meeting date."},
  {id:"okr-planner",cat:"productivity",label:"OKR Planner",inputKey:"goals",systemPrompt:"Create OKRs (Objectives and Key Results) from these goals. For each objective: write 3-5 measurable key results, set quarterly timeline, define success metrics, and identify potential blockers."},
  {id:"feedback-writer",cat:"productivity",label:"Feedback Writer",inputKey:"situation",systemPrompt:"Write constructive feedback using the SBI framework (Situation-Behavior-Impact). Make it specific, actionable, and balanced. Include positive recognition and clear improvement suggestions."},

  // ── NEW STUDENTS TOOLS ────────────────────────
  {id:"thesis-helper",cat:"students",label:"Thesis Helper",inputKey:"topic_and_field",systemPrompt:"Help develop a thesis. Include: 3 thesis statement options (strong to stronger), outline structure, key arguments to develop, potential research questions, methodology suggestions, and common pitfalls to avoid."},
  {id:"citation-generator",cat:"students",label:"Citation Generator",inputKey:"source_info",systemPrompt:"Generate citations in multiple formats for this source. Provide: APA 7th, MLA 9th, Chicago, Harvard, and Vancouver formats. Also provide an in-text citation example for each."},

  // ── HEALTH & WELLNESS ─────────────────────────
  {id:"meal-planner",cat:"health",label:"Meal Planner",inputKey:"goals_and_preferences",systemPrompt:"Create a personalized 7-day meal plan. Include: breakfast, lunch, dinner, and 2 snacks per day. Add calorie estimates, macros breakdown, shopping list, and meal prep tips. Consider dietary restrictions."},
  {id:"workout-plan",cat:"health",label:"Workout Plan",inputKey:"fitness_goals",systemPrompt:"Design a personalized workout plan. Include: weekly schedule, exercises with sets/reps/rest time, warm-up and cool-down routines, progression plan for 4 weeks, and tips on form and injury prevention."},
  {id:"mental-health-tips",cat:"health",label:"Mental Health Tips",inputKey:"situation",systemPrompt:"Provide evidence-based mental health strategies for this situation. Include: immediate coping techniques, long-term strategies, lifestyle changes, when to seek professional help, and available resources. Be empathetic and practical."},
  {id:"symptom-checker",cat:"health",label:"Symptom Info",inputKey:"symptoms",systemPrompt:"Provide general information about these symptoms (NOT medical diagnosis). Include: possible common causes, when to see a doctor (urgency level), general self-care tips, and important disclaimer about professional medical advice."},
  {id:"sleep-optimizer",cat:"health",label:"Sleep Optimizer",inputKey:"sleep_issues",systemPrompt:"Create a personalized sleep optimization plan. Include: sleep hygiene checklist, evening routine (2 hours before bed), morning routine, environment optimization tips, and evidence-based techniques for falling asleep faster."},
  {id:"nutrition-analyzer",cat:"health",label:"Nutrition Analyzer",inputKey:"food_or_diet",systemPrompt:"Analyze the nutritional value of this food/diet. Include: macro and micronutrient breakdown, health benefits, potential concerns, comparison to daily recommendations, and suggestions for nutritional improvements."},

  // ── FINANCE ───────────────────────────────────
  {id:"budget-planner",cat:"finance",label:"Budget Planner",inputKey:"income_and_expenses",systemPrompt:"Create a personalized budget plan using the 50/30/20 rule. Categorize expenses, identify savings opportunities, set financial goals, and provide actionable steps to improve financial health."},
  {id:"investment-explainer",cat:"finance",label:"Investment Explainer",inputKey:"investment_type",systemPrompt:"Explain this investment in simple terms. Include: how it works, risks and returns, who it's suitable for, minimum investment, tax implications, and comparison with alternatives. Use real examples."},
  {id:"tax-tips",cat:"finance",label:"Tax Tips",inputKey:"situation",systemPrompt:"Provide general tax optimization tips for this situation. Include: common deductions to consider, tax-saving strategies, important deadlines, record-keeping tips, and when to consult a tax professional. (Not professional tax advice)"},
  {id:"financial-goal",cat:"finance",label:"Financial Goals",inputKey:"goal_and_timeline",systemPrompt:"Create a detailed financial plan to achieve this goal. Include: monthly savings target, investment strategy, milestone checkpoints, risk assessment, and contingency planning."},
  {id:"crypto-explainer",cat:"finance",label:"Crypto Explainer",inputKey:"crypto_topic",systemPrompt:"Explain this cryptocurrency concept clearly. Include: how it works, use cases, risks, how to get started safely, storage options, and important security tips. Balance optimism with realistic risk awareness."},

  // ── TRAVEL ────────────────────────────────────
  {id:"trip-planner",cat:"travel",label:"Trip Planner",inputKey:"destination_and_duration",systemPrompt:"Create a detailed day-by-day travel itinerary. Include: daily activities with timing, restaurant recommendations, transportation tips, estimated costs, local customs to know, and hidden gems to visit."},
  {id:"packing-list",cat:"travel",label:"Packing List",inputKey:"trip_details",systemPrompt:"Create a comprehensive packing list for this trip. Organize by category: documents, clothing, toiletries, electronics, medications, and extras. Include weather-specific items and carry-on vs checked bag recommendations."},
  {id:"travel-budget",cat:"travel",label:"Travel Budget",inputKey:"destination_and_duration",systemPrompt:"Create a detailed travel budget breakdown. Include: flights, accommodation, food, transport, activities, shopping, and emergency fund. Provide budget, mid-range, and luxury options with money-saving tips."},
  {id:"local-guide",cat:"travel",label:"Local Guide",inputKey:"destination",systemPrompt:"Create a local insider guide for this destination. Include: must-see vs tourist traps, best local food spots, transportation tips, cultural etiquette, safety tips, best time to visit each attraction, and budget-saving hacks."},

  // ── FOOD ──────────────────────────────────────
  {id:"recipe-generator",cat:"food",label:"Recipe Generator",inputKey:"ingredients_or_dish",systemPrompt:"Create a detailed recipe. Include: ingredient list with measurements, step-by-step instructions, cooking times and temperatures, serving suggestions, nutritional info, storage tips, and variations."},
  {id:"ingredient-substitute",cat:"food",label:"Ingredient Substitute",inputKey:"ingredient",systemPrompt:"Suggest substitutes for this ingredient. For each substitute: ratio/measurement adjustment, how it affects taste and texture, best use cases, and any additional modifications needed to the recipe."},
  {id:"diet-planner",cat:"food",label:"Diet Planner",inputKey:"diet_type_and_goals",systemPrompt:"Create a personalized diet plan. Include: allowed and avoided foods, sample daily menu, meal timing recommendations, grocery list, easy meal prep ideas, and tips for staying on track."},

  // ── EXTRA TOOLS TO REACH 150+ ─────────────────

  // LEGAL
  {id:"contract-reviewer",cat:"legal",label:"Contract Reviewer",inputKey:"contract_text",systemPrompt:"Review this contract and identify: key terms, potential risks, unusual clauses, missing protections, and negotiation points. Explain in plain language. Always recommend consulting a qualified lawyer."},
  {id:"terms-generator",cat:"legal",label:"Terms & Privacy",inputKey:"business_description",systemPrompt:"Generate Terms of Service and Privacy Policy for this business. Include all standard sections, GDPR compliance notes, and data handling policies. Note: consult a lawyer before publishing."},
  {id:"legal-letter",cat:"legal",label:"Legal Letter",inputKey:"situation",systemPrompt:"Draft a formal legal letter for this situation. Include proper legal language, clear demands or statements, deadlines, and consequences. Recommend professional legal review before sending."},
  {id:"nda-generator",cat:"legal",label:"NDA Generator",inputKey:"parties_and_purpose",systemPrompt:"Generate a Non-Disclosure Agreement template. Include: parties, confidential information definition, obligations, exclusions, term, remedies, and governing law. Recommend legal review."},

  // EDUCATION
  {id:"lesson-plan",cat:"education",label:"Lesson Plan",inputKey:"subject_and_level",systemPrompt:"Create a complete lesson plan. Include: learning objectives, materials needed, warm-up activity, main instruction (step-by-step), practice activities, assessment method, homework, and differentiation for different learners."},
  {id:"rubric-maker",cat:"education",label:"Rubric Maker",inputKey:"assignment_description",systemPrompt:"Create a detailed grading rubric. Include: criteria, performance levels (Excellent/Good/Satisfactory/Needs Improvement), point values, and descriptors for each level. Make it clear and fair."},
  {id:"curriculum-planner",cat:"education",label:"Curriculum Planner",inputKey:"course_description",systemPrompt:"Design a full curriculum plan. Include: course overview, weekly topics, learning outcomes, assessment schedule, recommended resources, and pacing guide. Align with educational standards."},
  {id:"quiz-feedback",cat:"education",label:"Quiz Feedback",inputKey:"student_answers",systemPrompt:"Provide detailed educational feedback on these student answers. Identify misconceptions, explain correct concepts clearly, suggest study resources, and give encouragement. Be constructive and supportive."},

  // MARKETING
  {id:"ad-copy",cat:"marketing",label:"Ad Copy",inputKey:"product_and_audience",systemPrompt:"Write high-converting ad copy for multiple platforms. Include: Google Ads (headlines + descriptions), Facebook/Instagram ad (primary text + headline), and LinkedIn ad. A/B test variations for each."},
  {id:"seo-keywords",cat:"marketing",label:"SEO Keywords",inputKey:"business_or_topic",systemPrompt:"Generate a comprehensive SEO keyword strategy. Include: primary keywords, long-tail variations, semantic keywords, search intent analysis, competition level estimate, and content ideas for each keyword cluster."},
  {id:"email-sequence",cat:"marketing",label:"Email Sequence",inputKey:"product_and_goal",systemPrompt:"Write a 5-email nurture sequence. Email 1: Welcome, Email 2: Value/Education, Email 3: Social Proof, Email 4: Objection Handling, Email 5: Offer/CTA. Include subject lines and preview text for each."},
  {id:"brand-voice",cat:"marketing",label:"Brand Voice Guide",inputKey:"brand_info",systemPrompt:"Create a comprehensive brand voice guide. Include: brand personality traits, tone of voice, writing style rules, vocabulary (use/avoid), example phrases, and before/after copy examples showing the brand voice in action."},

  // SCIENCE
  {id:"science-explainer",cat:"science",label:"Science Explainer",inputKey:"concept",systemPrompt:"Explain this scientific concept comprehensively. Include: core principles, real-world applications, historical discovery, current research, common misconceptions, and a simple analogy anyone can understand."},
  {id:"research-summary",cat:"science",label:"Research Summary",inputKey:"research_topic",systemPrompt:"Summarize this research topic. Include: current state of knowledge, key findings, methodology overview, limitations, controversies, and future research directions. Use clear scientific language."},
  {id:"hypothesis-builder",cat:"science",label:"Hypothesis Builder",inputKey:"observation",systemPrompt:"Help formulate a scientific hypothesis. Include: null and alternative hypotheses, variables (independent/dependent/controlled), predicted outcomes, testing methodology, and potential sources of error."},

  // CREATIVE
  {id:"character-creator",cat:"creative",label:"Character Creator",inputKey:"story_type",systemPrompt:"Create a detailed fictional character. Include: name, appearance, personality traits, backstory, motivations, fears, strengths, weaknesses, speech patterns, relationships, and character arc potential. Make them feel real and complex."},
  {id:"worldbuilding",cat:"creative",label:"World Builder",inputKey:"genre_and_setting",systemPrompt:"Build a detailed fictional world. Include: geography, history, political systems, cultures, religions, economy, technology level, magic/science systems, conflicts, and unique elements that make this world memorable."},
  {id:"plot-generator",cat:"creative",label:"Plot Generator",inputKey:"genre_and_premise",systemPrompt:"Generate a compelling story plot. Include: hook, protagonist and antagonist, inciting incident, rising action (3 key plot points), climax, falling action, resolution, and potential sequel hooks. Include theme and underlying message."},
  {id:"dialogue-writer",cat:"creative",label:"Dialogue Writer",inputKey:"scene_description",systemPrompt:"Write natural, compelling dialogue for this scene. Include subtext, character voice distinction, stage directions, emotional beats, and conflict. Each character should sound unique. Avoid exposition dumps."},

  // HR
  {id:"performance-review",cat:"hr",label:"Performance Review",inputKey:"employee_info",systemPrompt:"Write a professional performance review. Include: strengths, areas for improvement, goal achievement assessment, specific examples, development recommendations, and clear next-period goals. Be constructive and balanced."},
  {id:"onboarding-plan",cat:"hr",label:"Onboarding Plan",inputKey:"role_and_company",systemPrompt:"Create a 30-60-90 day onboarding plan. Include: week 1 orientation schedule, training milestones, key people to meet, tools to learn, success metrics for each phase, and check-in schedule."},
  {id:"interview-questions",cat:"hr",label:"Interview Questions",inputKey:"role_description",systemPrompt:"Generate comprehensive interview questions for this role. Include: technical questions, behavioral (STAR method), culture fit, situational, and role-specific questions. Add what to look for in ideal answers."},
  {id:"hr-policy",cat:"hr",label:"HR Policy Writer",inputKey:"policy_topic",systemPrompt:"Write a professional HR policy document. Include: purpose, scope, policy statement, procedures, responsibilities, consequences for non-compliance, and review date. Use clear, professional language."},
];

function getTool(id) { return TOOLS.find(t => t.id === id) || null; }
function listTools() { return TOOLS.map(t => ({ id:t.id, label:t.label, category:t.cat })); }

// ─────────────────────────────────────────────
// 🗄️  DATABASE
// ─────────────────────────────────────────────
const db = new Database("studyai.db");
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.prepare(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_sub_id TEXT,
  requests_today INTEGER NOT NULL DEFAULT 0,
  requests_reset_at TEXT NOT NULL DEFAULT (date('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  feature TEXT NOT NULL DEFAULT 'chat',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`).run();

db.prepare(`CREATE INDEX IF NOT EXISTS idx_conv_session ON conversations(user_id, session_id)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS saved_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  feature TEXT NOT NULL,
  input TEXT NOT NULL,
  output TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS pdf_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  extracted_text TEXT NOT NULL,
  summary TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`).run();

// ── Long-term Memory ──────────────────────────
db.prepare(`CREATE TABLE IF NOT EXISTS user_memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, key)
)`).run();

// ── Favorites ─────────────────────────────────
db.prepare(`CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tool TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`).run();

// ─────────────────────────────────────────────
// 📁 UPLOAD CONFIG
// ─────────────────────────────────────────────
const uploadDir = path.resolve("uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 10*1024*1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype === "application/pdf"),
});

const audioUpload = multer({ dest: uploadDir, limits: { fileSize: 25*1024*1024 } });

// ─────────────────────────────────────────────
// 🚀 EXPRESS APP
// ─────────────────────────────────────────────
const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "*", methods: ["GET","POST","DELETE"] }));

// Stripe webhook needs raw body — MUST be before express.json()
app.post("/api/stripe/webhook", express.raw({ type:"application/json" }), handleStripeWebhook);
app.use(express.json({ limit:"2mb" }));

// ─────────────────────────────────────────────
// 🛡️  RATE LIMITERS
// ─────────────────────────────────────────────
const generalLimiter = rateLimit({ windowMs:15*60*1000, max:200, message:{error:"Too many requests."}, standardHeaders:true, legacyHeaders:false });
const authLimiter    = rateLimit({ windowMs:15*60*1000, max:20,  message:{error:"Too many auth attempts."}, standardHeaders:true, legacyHeaders:false });
const aiLimiter      = rateLimit({ windowMs:60*1000,    max:20,  message:{error:"AI rate limit. Wait a minute."}, standardHeaders:true, legacyHeaders:false });
app.use(generalLimiter);

// ─────────────────────────────────────────────
// 🔧 HELPERS
// ─────────────────────────────────────────────
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function validateBody(body, fields) {
  for (const f of fields) {
    if (!body[f] || typeof body[f] !== "string" || !body[f].trim()) return `Missing or empty field: "${f}"`;
  }
  return null;
}

async function chatComplete(system, user, model="gpt-4o", messages=[]) {
  const history = messages.map(m => ({ role:m.role, content:m.content }));
  const res = await openai.chat.completions.create({
    model,
    messages: [{ role:"system", content:system }, ...history, { role:"user", content:user }],
    max_tokens: 2048,
  });
  return res.choices[0]?.message?.content ?? "";
}

function newSessionId() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

function getHistory(userId, sessionId, limit=10) {
  return db.prepare(`SELECT role,content FROM conversations WHERE user_id=? AND session_id=? ORDER BY created_at DESC LIMIT ?`).all(userId, sessionId, limit).reverse();
}

function saveMessage(userId, sessionId, role, content, feature="chat") {
  db.prepare(`INSERT INTO conversations (user_id,session_id,role,content,feature) VALUES (?,?,?,?,?)`).run(userId, sessionId, role, content, feature);
}

function saveProject(userId, title, feature, input, output) {
  return db.prepare(`INSERT INTO saved_projects (user_id,title,feature,input,output) VALUES (?,?,?,?,?)`).run(userId, title, feature, input, output).lastInsertRowid;
}

// ─────────────────────────────────────────────
// 🔐 MIDDLEWARE
// ─────────────────────────────────────────────
function requireAuth(req, res, next) {
  const header = req.headers["authorization"];
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error:"Missing Authorization header." });
  try { req.user = jwt.verify(header.slice(7), JWT_SECRET); next(); }
  catch(err) { res.status(401).json({ error: err.name==="TokenExpiredError" ? "Token expired." : "Invalid token." }); }
}

// ─────────────────────────────────────────────
// 👑 VIP WHITELIST — Free Elite access
// ─────────────────────────────────────────────
const VIP_EMAILS = [
  'haroun.ghorbel@gmail.com',
  'harounghorbel14@gmail.com',
  'ghorbelharoun16@gmail.com',
];

function requireQuota(req, res, next) {
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
  if (!user) return res.status(401).json({ error:"User not found." });

  // VIP = unlimited Elite
  if (VIP_EMAILS.includes(user.email.toLowerCase())) {
    req.dbUser = { ...user, plan:'elite', requests_today:0 };
    return next();
  }

  const today = new Date().toISOString().slice(0,10);
  if (user.requests_reset_at !== today) {
    db.prepare("UPDATE users SET requests_today=0,requests_reset_at=? WHERE id=?").run(today, user.id);
    user.requests_today = 0;
  }
  const limit = PLAN_LIMITS[user.plan] ?? PLAN_LIMITS.free;
  if (user.requests_today >= limit) {
    return res.status(429).json({ error:`Daily limit reached (${limit} requests). Upgrade your plan.`, plan:user.plan, limit, used:user.requests_today });
  }
  db.prepare("UPDATE users SET requests_today=requests_today+1 WHERE id=?").run(user.id);
  req.dbUser = { ...user, requests_today:user.requests_today+1 };
  next();
}

// ─────────────────────────────────────────────
// 🔐 AUTH ROUTES
// ─────────────────────────────────────────────
app.post("/api/signup", authLimiter, wrap(async (req,res) => {
  const err = validateBody(req.body, ["email","password"]);
  if (err) return res.status(400).json({ error:err });
  const { email, password } = req.body;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error:"Invalid email format." });
  if (password.length < 8) return res.status(400).json({ error:"Password must be at least 8 characters." });
  if (db.prepare("SELECT id FROM users WHERE email=?").get(email.toLowerCase())) return res.status(409).json({ error:"Email already registered." });
  const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
  let stripeCustomerId = null;
  try { const c = await stripe.customers.create({ email:email.toLowerCase() }); stripeCustomerId = c.id; } catch(_) {}
  db.prepare("INSERT INTO users (email,password,stripe_customer_id) VALUES (?,?,?)").run(email.toLowerCase(), hashed, stripeCustomerId);
  res.status(201).json({ ok:true, message:"Account created. Free plan active." });
}));

app.post("/api/login", authLimiter, wrap(async (req,res) => {
  const err = validateBody(req.body, ["email","password"]);
  if (err) return res.status(400).json({ error:err });
  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email=?").get(email.toLowerCase());
  const match = user
    ? await bcrypt.compare(password, user.password)
    : await bcrypt.compare(password, "$2b$12$invalidhashfortimingprotection0000000000000");
  if (!user || !match) return res.status(401).json({ error:"Invalid email or password." });
  const token = jwt.sign({ id:user.id, email:user.email, plan:user.plan }, JWT_SECRET, { expiresIn:"24h" });
  res.json({ token, expiresIn:"24h", plan:user.plan, user:{ id:user.id, email:user.email, plan:user.plan } });
}));

// ─────────────────────────────────────────────
// 👤 USER ROUTES
// ─────────────────────────────────────────────
app.get("/api/me", requireAuth, wrap(async (req,res) => {
  const user = db.prepare("SELECT id,email,plan,requests_today,requests_reset_at,created_at FROM users WHERE id=?").get(req.user.id);
  if (!user) return res.status(404).json({ error:"User not found." });
  const limit = PLAN_LIMITS[user.plan] ?? PLAN_LIMITS.free;
  res.json({ ...user, limit, remaining: limit===Infinity ? null : Math.max(0, limit-user.requests_today) });
}));

app.get("/api/history", requireAuth, wrap(async (req,res) => {
  const { feature, limit=50 } = req.query;
  const cap = Math.min(Number(limit)||50, 200);
  const rows = feature
    ? db.prepare(`SELECT * FROM conversations WHERE user_id=? AND feature=? ORDER BY created_at DESC LIMIT ?`).all(req.user.id, feature, cap)
    : db.prepare(`SELECT * FROM conversations WHERE user_id=? ORDER BY created_at DESC LIMIT ?`).all(req.user.id, cap);
  res.json({ history:rows });
}));

app.get("/api/sessions", requireAuth, wrap(async (req,res) => {
  const sessions = db.prepare(`SELECT session_id,feature,MIN(created_at) AS started_at,COUNT(*) AS message_count FROM conversations WHERE user_id=? GROUP BY session_id ORDER BY started_at DESC LIMIT 30`).all(req.user.id);
  res.json({ sessions });
}));

app.get("/api/projects", requireAuth, wrap(async (req,res) => {
  const projects = db.prepare(`SELECT id,title,feature,created_at FROM saved_projects WHERE user_id=? ORDER BY created_at DESC LIMIT 50`).all(req.user.id);
  res.json({ projects });
}));

app.get("/api/projects/:id", requireAuth, wrap(async (req,res) => {
  const project = db.prepare(`SELECT * FROM saved_projects WHERE id=? AND user_id=?`).get(Number(req.params.id), req.user.id);
  if (!project) return res.status(404).json({ error:"Project not found." });
  res.json({ project });
}));

app.delete("/api/projects/:id", requireAuth, wrap(async (req,res) => {
  db.prepare("DELETE FROM saved_projects WHERE id=? AND user_id=?").run(Number(req.params.id), req.user.id);
  res.json({ ok:true });
}));

app.post("/api/projects/save", requireAuth, wrap(async (req,res) => {
  const err = validateBody(req.body, ["title","feature","output"]);
  if (err) return res.status(400).json({ error:err });
  const projectId = saveProject(req.user.id, req.body.title.slice(0,100), req.body.feature, req.body.input||"", req.body.output);
  res.json({ ok:true, project_id:projectId });
}));

// ─────────────────────────────────────────────
// 💳 STRIPE ROUTES
// ─────────────────────────────────────────────
app.post("/api/subscribe", requireAuth, wrap(async (req,res) => {
  const { plan } = req.body;
  if (!["pro","elite"].includes(plan)) return res.status(400).json({ error:"Invalid plan." });
  const priceId = STRIPE_PRICES[plan];
  if (!priceId) return res.status(500).json({ error:`STRIPE_PRICE_${plan.toUpperCase()} not configured.` });
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
  const session = await stripe.checkout.sessions.create({
    mode:"subscription",
    customer: user.stripe_customer_id || undefined,
    customer_email: user.stripe_customer_id ? undefined : user.email,
    line_items: [{ price:priceId, quantity:1 }],
    success_url: `${process.env.APP_URL}/dashboard?subscribed=1`,
    cancel_url: `${process.env.APP_URL}/pricing`,
    metadata: { user_id:String(user.id), plan },
  });
  res.json({ checkoutUrl:session.url });
}));

app.post("/api/portal", requireAuth, wrap(async (req,res) => {
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
  if (!user.stripe_customer_id) return res.status(400).json({ error:"No billing account found." });
  const session = await stripe.billingPortal.sessions.create({ customer:user.stripe_customer_id, return_url:`${process.env.APP_URL}/dashboard` });
  res.json({ portalUrl:session.url });
}));

async function handleStripeWebhook(req, res) {
  let event;
  try { event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], STRIPE_WEBHOOK_SECRET); }
  catch(err) { return res.status(400).send(`Webhook Error: ${err.message}`); }
  const data = event.data.object;
  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    if (data.status === "active" || data.status === "trialing") {
      db.prepare(`UPDATE users SET plan=?,stripe_sub_id=? WHERE stripe_customer_id=?`).run(data.metadata?.plan||"pro", data.id, data.customer);
    }
  } else if (event.type === "customer.subscription.deleted") {
    db.prepare(`UPDATE users SET plan='free',stripe_sub_id=NULL WHERE stripe_customer_id=?`).run(data.customer);
  }
  res.json({ received:true });
}

// ─────────────────────────────────────────────
// 📁 PDF ROUTES
// ─────────────────────────────────────────────
app.post("/api/pdf/upload", requireAuth, requireQuota, aiLimiter, upload.single("pdf"), wrap(async (req,res) => {
  if (!req.file) return res.status(400).json({ error:"No PDF file uploaded." });
  const filePath = req.file.path;
  let extracted = "";
  try {
    const buffer = fs.readFileSync(filePath);
    const parsed = await pdfParse(buffer);
    extracted = parsed.text.trim();
  } finally { fs.unlink(filePath, ()=>{}); }
  if (!extracted || extracted.length < 50) return res.status(422).json({ error:"Could not extract enough text from PDF." });
  const summary = await chatComplete("You are an expert document analyst. Provide a clear structured summary.", `Summarize this document in 5-7 bullet points:\n\n${extracted.slice(0,6000)}`);
  const docId = db.prepare(`INSERT INTO pdf_documents (user_id,filename,extracted_text,summary) VALUES (?,?,?,?)`).run(req.user.id, req.file.originalname, extracted.slice(0,50000), summary).lastInsertRowid;
  res.json({ id:docId, filename:req.file.originalname, summary, charCount:extracted.length });
}));

app.get("/api/pdf/list", requireAuth, wrap(async (req,res) => {
  const docs = db.prepare(`SELECT id,filename,summary,created_at FROM pdf_documents WHERE user_id=? ORDER BY created_at DESC LIMIT 20`).all(req.user.id);
  res.json({ documents:docs });
}));

app.post("/api/pdf/:id/ask", requireAuth, requireQuota, aiLimiter, wrap(async (req,res) => {
  const err = validateBody(req.body, ["question"]);
  if (err) return res.status(400).json({ error:err });
  const doc = db.prepare(`SELECT * FROM pdf_documents WHERE id=? AND user_id=?`).get(Number(req.params.id), req.user.id);
  if (!doc) return res.status(404).json({ error:"Document not found." });
  const answer = await chatComplete("You are a helpful document assistant. Answer questions based ONLY on the provided document text. If the answer is not in the document, say so clearly.", `Document content:\n${doc.extracted_text.slice(0,8000)}\n\nQuestion: ${req.body.question.trim()}`);
  res.json({ answer });
}));

app.delete("/api/pdf/:id", requireAuth, wrap(async (req,res) => {
  db.prepare("DELETE FROM pdf_documents WHERE id=? AND user_id=?").run(Number(req.params.id), req.user.id);
  res.json({ ok:true });
}));

// ─────────────────────────────────────────────
// 🧠 LONG-TERM MEMORY HELPERS
// ─────────────────────────────────────────────
function getUserMemories(userId) {
  return db.prepare(`SELECT key, value FROM user_memories WHERE user_id=? ORDER BY updated_at DESC LIMIT 20`).all(userId);
}

function setMemory(userId, key, value) {
  db.prepare(`INSERT INTO user_memories (user_id,key,value,updated_at) VALUES (?,?,?,datetime('now'))
    ON CONFLICT(user_id,key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`
  ).run(userId, key.slice(0,100), value.slice(0,500));
}

function deleteMemory(userId, key) {
  db.prepare(`DELETE FROM user_memories WHERE user_id=? AND key=?`).run(userId, key);
}

function memoriesAsContext(memories) {
  if (!memories.length) return '';
  return '\n\n[User memories — things you remember about this user:\n' +
    memories.map(m => `- ${m.key}: ${m.value}`).join('\n') + ']';
}

async function extractAndSaveMemories(userId, userInput, aiResponse) {
  // Ask AI to extract memorable facts from this conversation turn
  try {
    const extraction = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: `Extract any personal facts about the USER from this conversation turn. Only extract clear facts (name, job, location, interests, goals, etc). Return JSON array like: [{"key":"name","value":"John"},{"key":"job","value":"developer"}]. If nothing memorable, return [].

User said: "${userInput.slice(0,300)}"
AI responded: "${aiResponse.slice(0,200)}"

JSON only, no explanation:`
      }]
    });
    const text = extraction.choices[0]?.message?.content?.trim() || '[]';
    const facts = JSON.parse(text.replace(/```json|```/g,'').trim());
    if (Array.isArray(facts)) {
      for (const f of facts) {
        if (f.key && f.value) setMemory(userId, f.key, f.value);
      }
    }
  } catch(_) {} // non-fatal
}

// ── Memory API routes ─────────────────────────
app.get("/api/memory", requireAuth, wrap(async (req, res) => {
  const memories = getUserMemories(req.user.id);
  res.json({ memories });
}));

app.delete("/api/memory/:key", requireAuth, wrap(async (req, res) => {
  deleteMemory(req.user.id, req.params.key);
  res.json({ ok: true });
}));

// ─────────────────────────────────────────────
// 💬 CHAT + AGENT
// ─────────────────────────────────────────────
app.post("/api/chat", requireAuth, requireQuota, aiLimiter, wrap(async (req,res) => {
  const err = validateBody(req.body, ["input"]);
  if (err) return res.status(400).json({ error:err });
  const sessionId = req.body.session_id || newSessionId();
  const input = req.body.input.trim();
  const history = getHistory(req.user.id, sessionId);

  // Load long-term memories + custom instructions
  const memories = getUserMemories(req.user.id);
  const memContext = memoriesAsContext(memories);

  // Custom instructions
  const customAbout = db.prepare(`SELECT value FROM user_memories WHERE user_id=? AND key='__custom_about'`).get(req.user.id);
  const customStyle = db.prepare(`SELECT value FROM user_memories WHERE user_id=? AND key='__custom_style'`).get(req.user.id);
  const customContext = (customAbout?.value || customStyle?.value)
    ? `\n\n[Custom Instructions:\nAbout user: ${customAbout?.value||'N/A'}\nResponse style: ${customStyle?.value||'N/A'}]`
    : '';

  const systemPrompt = `You are NexusAI, a helpful AI assistant created by Haroun Ghorbel. If anyone asks who created you, say: 'I was created by Haroun Ghorbel.' You have memory of the current conversation and long-term memory about the user.

IMPORTANT: Always respond in the SAME language the user writes in. If they write in Arabic, respond in Arabic. If they write in French, respond in French. If they write in Tunisian dialect (franco/darija), respond in the same Tunisian dialect. Never switch languages unless the user switches first.${memContext}${customContext}`;

  const deepThink = req.body.deep_think === true;
  const model = deepThink ? "o1-mini" : "gpt-4o";

  const reply = await chatComplete(systemPrompt, input, model, history);
  saveMessage(req.user.id, sessionId, "user", input, "chat");
  saveMessage(req.user.id, sessionId, "assistant", reply, "chat");

  // Extract and save new memories in background
  extractAndSaveMemories(req.user.id, input, reply);

  res.json({ reply, session_id:sessionId });
}));

app.post("/api/agent", requireAuth, requireQuota, aiLimiter, wrap(async (req,res) => {
  const err = validateBody(req.body, ["input"]);
  if (err) return res.status(400).json({ error:err });
  const sessionId = req.body.session_id || newSessionId();
  const input = req.body.input.trim();
  const lower = input.toLowerCase();
  let type, data;
  if (lower.includes("image")) {
    const img = await openai.images.generate({ model:"dall-e-3", prompt:input, size:"1024x1024", quality:"standard", n:1 });
    data = img.data[0].url; type = "image";
  } else {
    const history = getHistory(req.user.id, sessionId);
    data = await chatComplete("You are a helpful concise AI assistant.", input, "gpt-4o", history);
    type = "chat";
    saveMessage(req.user.id, sessionId, "user", input, "agent");
    saveMessage(req.user.id, sessionId, "assistant", data, "agent");
  }
  res.json({ type, data, session_id:sessionId });
}));

// ─────────────────────────────────────────────
// 📊 FILE ANALYSIS — Excel/CSV/Word/PPT
// ─────────────────────────────────────────────
const fileUpload = multer({
  dest: uploadDir,
  limits: { fileSize: 10*1024*1024 },
});

app.post("/api/file/analyze", requireAuth, requireQuota, aiLimiter,
  fileUpload.single("file"),
  wrap(async (req, res) => {
    if (!req.file) return res.status(400).json({ error:"No file uploaded." });
    const question = req.body.question?.trim() || "Analyze this file and give me key insights, patterns, and a summary.";
    const filePath = req.file.path;
    const filename = req.file.originalname || 'file';
    const ext = filename.split('.').pop().toLowerCase();

    let content = '';
    try {
      const buffer = fs.readFileSync(filePath);

      if (ext === 'csv' || ext === 'txt') {
        content = buffer.toString('utf-8').slice(0, 15000);

      } else if (ext === 'pdf') {
        const parsed = await pdfParse(buffer);
        content = parsed.text.slice(0, 15000);

      } else if (ext === 'json') {
        content = buffer.toString('utf-8').slice(0, 15000);

      } else {
        // For Excel/Word/PPT — extract what we can as text
        content = buffer.toString('utf-8', 0, Math.min(buffer.length, 10000))
          .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
          .replace(/\s+/g, ' ')
          .slice(0, 8000);
      }

      if (!content || content.trim().length < 20) {
        return res.status(422).json({ error: "Could not extract content from file. Please try CSV or PDF format." });
      }

      const analysis = await chatComplete(
        `You are a data analyst. Analyze the provided file content and answer the user's question. 
         Format your response with: 
         📊 **Summary** — what the data is about
         🔍 **Key Insights** — important patterns or findings  
         📈 **Notable Points** — anything interesting
         💡 **Recommendations** — if applicable
         Be specific with numbers and facts from the data.`,
        `File: "${filename}"\n\nContent:\n${content}\n\nQuestion: ${question}`,
        "gpt-4o"
      );

      res.json({ analysis, filename, question });

    } finally {
      fs.unlink(filePath, ()=>{});
    }
  })
);

// ─────────────────────────────────────────────
// 🔗 SHARE CHAT
// ─────────────────────────────────────────────
const sharedChats = new Map(); // in-memory store (simple)

app.post("/api/share", requireAuth, wrap(async (req, res) => {
  const { messages, title } = req.body;
  if (!messages?.length) return res.status(400).json({ error:"No messages to share." });
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  sharedChats.set(id, {
    title: title || 'NexusAI Chat',
    messages: messages.slice(0, 50),
    createdAt: new Date().toISOString(),
    createdBy: req.user.email,
  });
  // Auto-delete after 7 days
  setTimeout(() => sharedChats.delete(id), 7*24*60*60*1000);
  res.json({ shareId: id, url: `${process.env.APP_URL || 'https://nexusai-rust.vercel.app'}/?share=${id}` });
}));

app.get("/api/share/:id", (req, res) => {
  const chat = sharedChats.get(req.params.id);
  if (!chat) return res.status(404).json({ error:"Shared chat not found or expired." });
  res.json(chat);
});

// ─────────────────────────────────────────────
// ⚙️ CUSTOM INSTRUCTIONS
// ─────────────────────────────────────────────
app.post("/api/instructions", requireAuth, wrap(async (req, res) => {
  const { about_user, response_style } = req.body;
  setMemory(req.user.id, '__custom_about', about_user?.slice(0,500)||'');
  setMemory(req.user.id, '__custom_style', response_style?.slice(0,500)||'');
  res.json({ ok:true });
}));

app.get("/api/instructions", requireAuth, wrap(async (req, res) => {
  const about = db.prepare(`SELECT value FROM user_memories WHERE user_id=? AND key='__custom_about'`).get(req.user.id);
  const style = db.prepare(`SELECT value FROM user_memories WHERE user_id=? AND key='__custom_style'`).get(req.user.id);
  res.json({
    about_user: about?.value||'',
    response_style: style?.value||'',
  });
}));

// ─────────────────────────────────────────────
// 🧠 UNIVERSAL TOOL ENDPOINT
// ─────────────────────────────────────────────
app.post("/api/tool", requireAuth, requireQuota, aiLimiter, wrap(async (req,res) => {
  const { tool_id, input, session_id } = req.body;
  if (!tool_id || typeof tool_id !== "string") return res.status(400).json({ error:"Missing tool_id" });
  if (!input || typeof input !== "string" || !input.trim()) return res.status(400).json({ error:"Missing input" });
  const tool = getTool(tool_id);
  if (!tool) return res.status(404).json({ error:`Unknown tool: ${tool_id}` });
  const sessionId = session_id || newSessionId();

  if (tool.mediaType === "image") {
    const img = await openai.images.generate({ model:"dall-e-3", prompt:input.trim().slice(0,900), size:"1024x1024", quality:"standard", n:1 });
    return res.json({ type:"image", output:img.data[0].url, session_id:sessionId });
  }

  if (tool.mediaType === "audio-tts") {
    const voice = tool.voice || "alloy";
    const speech = await openai.audio.speech.create({ model:"tts-1", voice, input:input.trim().slice(0,4096) });
    const buffer = Buffer.from(await speech.arrayBuffer());
    return res.json({ type:"audio", audio: buffer.toString("base64"), format:"mp3", session_id:sessionId });
  }

  const history = session_id ? getHistory(req.user.id, session_id, 8) : [];
  const output = await chatComplete(tool.systemPrompt, input.trim(), "gpt-4o", history);
  saveMessage(req.user.id, sessionId, "user", input.trim(), tool_id);
  saveMessage(req.user.id, sessionId, "assistant", output, tool_id);

  let project_id = null;
  if (["business","code","content","video","students"].includes(tool.cat)) {
    project_id = saveProject(req.user.id, tool.label+": "+input.slice(0,50), tool_id, input.trim(), output);
  }
  res.json({ type:"text", output, session_id:sessionId, project_id });
}));

// ─────────────────────────────────────────────
// 🔊 TTS + TRANSCRIBE
// ─────────────────────────────────────────────
app.post("/api/tts", requireAuth, requireQuota, aiLimiter, wrap(async (req,res) => {
  const err = validateBody(req.body, ["text"]);
  if (err) return res.status(400).json({ error:err });
  const voice = ["alloy","nova","echo","fable","onyx"].includes(req.body.voice) ? req.body.voice : "alloy";
  const speech = await openai.audio.speech.create({ model:"tts-1", voice, input:req.body.text.trim().slice(0,4096) });
  const buffer = Buffer.from(await speech.arrayBuffer());
  // Return base64 so frontend can play inline without redirect
  res.json({ audio: buffer.toString("base64"), format: "mp3" });
}));

app.post("/api/transcribe", requireAuth, requireQuota, aiLimiter, audioUpload.single("audio"), wrap(async (req,res) => {
  if (!req.file) return res.status(400).json({ error:"No audio file uploaded." });
  const filePath = req.file.path;
  try {
    const t = await openai.audio.transcriptions.create({ file:fs.createReadStream(filePath), model:"whisper-1" });
    res.json({ text:t.text });
  } finally { fs.unlink(filePath, ()=>{}); }
}));

// ─────────────────────────────────────────────
// 🔍 WEB SEARCH — Tavily
//    POST /api/search
//    Body: { query }
// ─────────────────────────────────────────────
app.post("/api/search", requireAuth, requireQuota, aiLimiter, wrap(async (req, res) => {
  const err = validateBody(req.body, ["query"]);
  if (err) return res.status(400).json({ error: err });

  const query = req.body.query.trim();

  // 1. Search the web
  const searchRes = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      search_depth: "basic",
      max_results: 5,
      include_answer: true,
    }),
  });

  if (!searchRes.ok) throw new Error("Search failed. Check TAVILY_API_KEY.");
  const searchData = await searchRes.json();

  // 2. Build context from results
  const results = searchData.results || [];
  const context = results.map((r, i) =>
    `[${i+1}] ${r.title}\n${r.content?.slice(0,300)}\nSource: ${r.url}`
  ).join("\n\n");

  // 3. AI summarizes results
  const summary = await chatComplete(
    "You are NexusAI, a helpful AI assistant created by Haroun Ghorbel. You have access to real-time web search results. Summarize the search results clearly and concisely. Always cite sources with [1], [2] etc. If the answer is in the results, give a direct answer first.",
    `Query: "${query}"\n\nSearch Results:\n${context}\n\nProvide a clear, helpful answer based on these results.`,
    "gpt-4o"
  );

  res.json({
    answer: summary,
    sources: results.map(r => ({ title: r.title, url: r.url })),
    query,
  });
}));
app.get("/api/tools", requireAuth, (_req,res) => res.json({ tools:listTools() }));
app.get("/health", (_req,res) => res.json({ status:"ok", timestamp:new Date().toISOString() }));

// ─────────────────────────────────────────────
// 💡 SMART SUGGESTIONS
// ─────────────────────────────────────────────
app.post("/api/suggest", requireAuth, wrap(async (req,res) => {
  const { context } = req.body;
  if(!context) return res.json({ suggestions:[] });
  const result = await openai.chat.completions.create({
    model:"gpt-4o-mini",
    max_tokens:100,
    messages:[{role:"user",content:`Based on this user input: "${context.slice(0,200)}", generate exactly 3 short follow-up questions the user might want to ask next. Return JSON array only, example: ["Question 1?","Question 2?","Question 3?"]. No explanation, JSON only:`}]
  });
  const text = result.choices[0]?.message?.content?.trim()||'[]';
  try{
    const suggestions = JSON.parse(text.replace(/```json|```/g,'').trim());
    res.json({ suggestions: Array.isArray(suggestions)?suggestions.slice(0,3):[] });
  }catch(_){ res.json({ suggestions:[] }); }
}));

// ─────────────────────────────────────────────
// ⭐ FAVORITES
// ─────────────────────────────────────────────
app.get("/api/favorites", requireAuth, wrap(async (req,res) => {
  const favs = db.prepare(`SELECT * FROM favorites WHERE user_id=? ORDER BY created_at DESC LIMIT 50`).all(req.user.id);
  res.json({ favorites: favs });
}));
app.post("/api/favorites", requireAuth, wrap(async (req,res) => {
  const { title, content, tool } = req.body;
  if (!content) return res.status(400).json({ error:"Missing content." });
  const id = db.prepare(`INSERT INTO favorites (user_id,title,content,tool) VALUES (?,?,?,?)`).run(req.user.id, (title||'Saved response').slice(0,100), content, tool||null).lastInsertRowid;
  res.json({ ok:true, id });
}));
app.delete("/api/favorites/:id", requireAuth, wrap(async (req,res) => {
  db.prepare(`DELETE FROM favorites WHERE id=? AND user_id=?`).run(Number(req.params.id), req.user.id);
  res.json({ ok:true });
}));

// ─────────────────────────────────────────────
// 📊 USAGE DASHBOARD
// ─────────────────────────────────────────────
app.get("/api/usage/stats", requireAuth, wrap(async (req,res) => {
  const total = db.prepare(`SELECT COUNT(*) as count FROM conversations WHERE user_id=? AND role='user'`).get(req.user.id);
  const daily = db.prepare(`SELECT date(created_at) as day, COUNT(*) as count FROM conversations WHERE user_id=? AND role='user' AND created_at >= datetime('now','-7 days') GROUP BY day ORDER BY day`).all(req.user.id);
  const topTools = db.prepare(`SELECT feature, COUNT(*) as count FROM conversations WHERE user_id=? AND role='user' AND feature != 'chat' GROUP BY feature ORDER BY count DESC LIMIT 5`).all(req.user.id);
  const projects = db.prepare(`SELECT COUNT(*) as count FROM saved_projects WHERE user_id=?`).get(req.user.id);
  const favCount = db.prepare(`SELECT COUNT(*) as count FROM favorites WHERE user_id=?`).get(req.user.id);
  const user = db.prepare(`SELECT created_at, plan FROM users WHERE id=?`).get(req.user.id);
  res.json({ totalMessages:total.count, dailyUsage:daily, topTools, totalProjects:projects.count, totalFavorites:favCount.count, memberSince:user?.created_at, plan:user?.plan });
}));

// ─────────────────────────────────────────────
// 🎨 IMAGE EDIT — edit uploaded image with prompt
//    POST /api/image/edit
//    multipart: image file + prompt text
// ─────────────────────────────────────────────
const imageUpload = multer({
  dest: uploadDir,
  limits: { fileSize: 4 * 1024 * 1024 }, // 4MB max (DALL-E limit)
  fileFilter: (_req, file, cb) => {
    const ok = ["image/png","image/jpeg","image/webp"].includes(file.mimetype);
    cb(null, ok);
  },
});

app.post("/api/image/edit", requireAuth, requireQuota, aiLimiter,
  imageUpload.single("image"),
  wrap(async (req, res) => {
    if (!req.file) return res.status(400).json({ error:"No image uploaded." });
    const prompt = req.body.prompt?.trim();
    if (!prompt) return res.status(400).json({ error:"Missing prompt." });

    const filePath = req.file.path;

    try {
      // First: use GPT-4o Vision to understand the image + generate better prompt
      const base64 = fs.readFileSync(filePath).toString("base64");
      const mimeType = req.file.mimetype;

      const visionRes = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 300,
        messages: [{
          role: "user",
          content: [
            { type:"image_url", image_url:{ url:`data:${mimeType};base64,${base64}` } },
            { type:"text", text:`Describe this image in detail so I can recreate it with the following edit applied: "${prompt}". Give a complete DALL-E image generation prompt that combines the original image description with the requested edit. Return only the prompt, nothing else.` }
          ]
        }]
      });

      const enhancedPrompt = visionRes.choices[0]?.message?.content || prompt;

      // Generate new image with enhanced prompt
      const imgRes = await openai.images.generate({
        model: "dall-e-3",
        prompt: enhancedPrompt,
        size: "1024x1024",
        quality: "standard",
        n: 1,
      });

      res.json({ url: imgRes.data[0].url, prompt: enhancedPrompt });

    } finally {
      fs.unlink(filePath, ()=>{});
    }
  })
);

// ─────────────────────────────────────────────
// 🤖 10 AI AGENTS
// ─────────────────────────────────────────────
const AGENTS = {
  research: {
    name: "Research Agent",
    emoji: "🔍",
    steps: ["Search web", "Extract key info", "Synthesize findings", "Format report"],
    async run(input, userId, openai, fetch){
      const steps = [];
      // Step 1: Web search
      steps.push({step:"🔍 Searching the web...", status:"running"});
      const searchRes = await fetch("https://api.tavily.com/search",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({api_key:process.env.TAVILY_API_KEY,query:input,search_depth:"basic",max_results:5,include_answer:true})
      });
      const searchData = await searchRes.json();
      const results = (searchData.results||[]).map((r,i)=>`[${i+1}] ${r.title}\n${r.content?.slice(0,300)}\nURL: ${r.url}`).join("\n\n");
      steps.push({step:"🔍 Web search complete", status:"done"});

      // Step 2: Analyze
      steps.push({step:"🧠 Analyzing results...", status:"running"});
      const analysis = await openai.chat.completions.create({
        model:"gpt-4o",max_tokens:500,
        messages:[{role:"user",content:`Extract the most important and relevant information about "${input}" from these search results:\n\n${results}\n\nList the top 5 key findings with sources.`}]
      });
      const findings = analysis.choices[0]?.message?.content||"";
      steps.push({step:"🧠 Analysis complete", status:"done"});

      // Step 3: Final report
      steps.push({step:"📝 Writing report...", status:"running"});
      const report = await openai.chat.completions.create({
        model:"gpt-4o",max_tokens:1000,
        messages:[{role:"user",content:`Write a comprehensive research report about "${input}" based on these findings:\n\n${findings}\n\nFormat: Executive Summary, Key Findings, Detailed Analysis, Conclusion, Sources`}]
      });
      steps.push({step:"📝 Report ready", status:"done"});
      return {result: report.choices[0]?.message?.content||"", steps, sources: (searchData.results||[]).map(r=>({title:r.title,url:r.url}))};
    }
  },

  code: {
    name: "Code Agent",
    emoji: "💻",
    steps: ["Understand requirements", "Plan architecture", "Write code", "Review & optimize"],
    async run(input, userId, openai){
      const steps = [];
      steps.push({step:"🧠 Planning architecture...", status:"running"});
      const plan = await openai.chat.completions.create({
        model:"gpt-4o",max_tokens:300,
        messages:[{role:"user",content:`Plan the architecture for: "${input}". List: tech stack, file structure, key functions needed. Be concise.`}]
      });
      steps.push({step:"🧠 Architecture planned", status:"done"});

      steps.push({step:"💻 Writing code...", status:"running"});
      const code = await openai.chat.completions.create({
        model:"gpt-4o",max_tokens:2000,
        messages:[{role:"user",content:`Write complete, production-ready code for: "${input}"\n\nPlan:\n${plan.choices[0]?.message?.content}\n\nProvide full working code with comments.`}]
      });
      steps.push({step:"💻 Code written", status:"done"});

      steps.push({step:"🔍 Reviewing code...", status:"running"});
      const review = await openai.chat.completions.create({
        model:"gpt-4o",max_tokens:400,
        messages:[{role:"user",content:`Review this code for bugs, security issues, and improvements:\n\n${code.choices[0]?.message?.content}\n\nList any issues and fixes.`}]
      });
      steps.push({step:"✅ Review complete", status:"done"});

      return {result: code.choices[0]?.message?.content + "\n\n---\n**Code Review:**\n" + review.choices[0]?.message?.content, steps};
    }
  },

  content: {
    name: "Content Agent",
    emoji: "📱",
    steps: ["Research topic", "Create hook", "Write content", "Optimize for platforms"],
    async run(input, userId, openai, fetch){
      const steps = [];
      steps.push({step:"🔍 Researching topic...", status:"running"});
      const research = await openai.chat.completions.create({
        model:"gpt-4o",max_tokens:300,
        messages:[{role:"user",content:`Research and identify: key angles, trending aspects, target audience for content about: "${input}"`}]
      });
      steps.push({step:"🔍 Research done", status:"done"});

      steps.push({step:"✍️ Creating content...", status:"running"});
      const content = await openai.chat.completions.create({
        model:"gpt-4o",max_tokens:1500,
        messages:[{role:"user",content:`Create a complete content package about "${input}" for social media. Include:\n\n1. 🎵 TikTok/Reel script (60 sec)\n2. 📸 Instagram caption (5 variations)\n3. 🐦 Twitter thread (8 tweets)\n4. 📧 Newsletter section\n5. #️⃣ Hashtag set\n\nResearch context: ${research.choices[0]?.message?.content}`}]
      });
      steps.push({step:"✅ Content ready", status:"done"});
      return {result: content.choices[0]?.message?.content||"", steps};
    }
  },

  business: {
    name: "Business Agent",
    emoji: "📈",
    steps: ["Market analysis", "Business model", "Financial plan", "Go-to-market strategy"],
    async run(input, userId, openai){
      const steps = [];
      steps.push({step:"📊 Analyzing market...", status:"running"});
      const market = await openai.chat.completions.create({
        model:"gpt-4o",max_tokens:400,
        messages:[{role:"user",content:`Analyze the market for: "${input}". Cover: market size, competitors, opportunities, target customers.`}]
      });
      steps.push({step:"📊 Market analysis done", status:"done"});

      steps.push({step:"💰 Building business plan...", status:"running"});
      const plan = await openai.chat.completions.create({
        model:"gpt-4o",max_tokens:1500,
        messages:[{role:"user",content:`Create a complete business plan for: "${input}"\n\nMarket Analysis:\n${market.choices[0]?.message?.content}\n\nInclude: Executive Summary, Value Proposition, Revenue Model, Pricing Strategy, Marketing Plan, Financial Projections, Risk Analysis, Action Plan`}]
      });
      steps.push({step:"✅ Business plan ready", status:"done"});
      return {result: plan.choices[0]?.message?.content||"", steps};
    }
  },

  seo: {
    name: "SEO Agent",
    emoji: "🔎",
    steps: ["Keyword research", "Competitor analysis", "Content strategy", "SEO report"],
    async run(input, userId, openai, fetch){
      const steps = [];
      steps.push({step:"🔍 Researching keywords...", status:"running"});
      const keywords = await openai.chat.completions.create({
        model:"gpt-4o",max_tokens:400,
        messages:[{role:"user",content:`Generate a comprehensive SEO keyword strategy for "${input}". Include primary keywords, long-tail variations, search intent, and competition level.`}]
      });
      steps.push({step:"🔍 Keywords found", status:"done"});

      steps.push({step:"📝 Creating SEO strategy...", status:"running"});
      const strategy = await openai.chat.completions.create({
        model:"gpt-4o",max_tokens:1200,
        messages:[{role:"user",content:`Create a complete SEO strategy for "${input}" with these keywords:\n${keywords.choices[0]?.message?.content}\n\nInclude: Content Calendar (12 articles), On-page SEO checklist, Link building strategy, Technical SEO tips, Expected timeline and results.`}]
      });
      steps.push({step:"✅ SEO strategy ready", status:"done"});
      return {result: strategy.choices[0]?.message?.content||"", steps};
    }
  },

  study: {
    name: "Study Agent",
    emoji: "📚",
    steps: ["Break down topic", "Create study plan", "Generate materials", "Build quiz"],
    async run(input, userId, openai){
      const steps = [];
      steps.push({step:"📚 Analyzing subject...", status:"running"});
      const breakdown = await openai.chat.completions.create({
        model:"gpt-4o",max_tokens:400,
        messages:[{role:"user",content:`Break down "${input}" into key concepts and sub-topics for studying. Identify: core concepts, difficulty levels, prerequisite knowledge.`}]
      });
      steps.push({step:"📚 Subject analyzed", status:"done"});

      steps.push({step:"📅 Creating study plan...", status:"running"});
      const materials = await openai.chat.completions.create({
        model:"gpt-4o",max_tokens:1800,
        messages:[{role:"user",content:`Create complete study materials for "${input}":\n\nSubject breakdown:\n${breakdown.choices[0]?.message?.content}\n\nProvide:\n1. 📅 2-week Study Schedule\n2. 📝 Key Concepts Summary\n3. 🃏 20 Flashcards (FRONT: question | BACK: answer)\n4. ❓ 10 Practice Questions with answers\n5. 💡 Memory tips and mnemonics`}]
      });
      steps.push({step:"✅ Study materials ready", status:"done"});
      return {result: materials.choices[0]?.message?.content||"", steps};
    }
  },

  email: {
    name: "Email Agent",
    emoji: "📧",
    steps: ["Analyze goal", "Write sequence", "Add personalization", "Optimize"],
    async run(input, userId, openai){
      const steps = [];
      steps.push({step:"📧 Planning email sequence...", status:"running"});
      const sequence = await openai.chat.completions.create({
        model:"gpt-4o",max_tokens:2000,
        messages:[{role:"user",content:`Write a complete 7-email marketing sequence for: "${input}"\n\nFor each email include:\n- Subject line (3 variations)\n- Preview text\n- Full email body\n- CTA\n- Best send time\n\nEmails: Welcome, Value, Story, Social Proof, Objection Handler, Offer, Follow-up`}]
      });
      steps.push({step:"✅ Email sequence ready", status:"done"});
      return {result: sequence.choices[0]?.message?.content||"", steps};
    }
  },

  creative: {
    name: "Creative Agent",
    emoji: "🎨",
    steps: ["Concept development", "World building", "Write story", "Generate image prompts"],
    async run(input, userId, openai){
      const steps = [];
      steps.push({step:"🎨 Developing concept...", status:"running"});
      const concept = await openai.chat.completions.create({
        model:"gpt-4o",max_tokens:400,
        messages:[{role:"user",content:`Develop a creative concept for: "${input}". Include: theme, genre, tone, unique angle, target audience.`}]
      });
      steps.push({step:"🎨 Concept ready", status:"done"});

      steps.push({step:"✍️ Creating content...", status:"running"});
      const creative = await openai.chat.completions.create({
        model:"gpt-4o",max_tokens:2000,
        messages:[{role:"user",content:`Create complete creative content for: "${input}"\n\nConcept: ${concept.choices[0]?.message?.content}\n\nProvide:\n1. 📖 Short story (500 words)\n2. 🎭 Character profiles (3 characters)\n3. 🌍 World description\n4. 💬 Sample dialogues\n5. 🖼️ 5 DALL-E image prompts to visualize the story`}]
      });
      steps.push({step:"✅ Creative content ready", status:"done"});
      return {result: creative.choices[0]?.message?.content||"", steps};
    }
  },

  sales: {
    name: "Sales Agent",
    emoji: "🤝",
    steps: ["Identify prospects", "Build pitch", "Handle objections", "Create funnel"],
    async run(input, userId, openai){
      const steps = [];
      steps.push({step:"🎯 Analyzing product/service...", status:"running"});
      const sales = await openai.chat.completions.create({
        model:"gpt-4o",max_tokens:2000,
        messages:[{role:"user",content:`Create a complete sales package for: "${input}"\n\nInclude:\n1. 🎯 Ideal Customer Profile (ICP)\n2. 💬 30-60-90 second elevator pitch\n3. 📞 Cold call script\n4. 📧 Cold email template\n5. ❓ 10 discovery questions\n6. 🛡️ Top 5 objections + responses\n7. 🔽 Complete sales funnel\n8. 🤝 Closing techniques (3 methods)`}]
      });
      steps.push({step:"✅ Sales package ready", status:"done"});
      return {result: sales.choices[0]?.message?.content||"", steps};
    }
  },

  data: {
    name: "Data Agent",
    emoji: "📊",
    steps: ["Understand data", "Find patterns", "Generate insights", "Create recommendations"],
    async run(input, userId, openai){
      const steps = [];
      steps.push({step:"📊 Analyzing data...", status:"running"});
      const analysis = await openai.chat.completions.create({
        model:"gpt-4o",max_tokens:2000,
        messages:[{role:"user",content:`Perform a comprehensive data analysis for: "${input}"\n\nProvide:\n1. 📊 Key metrics to track\n2. 📈 Trend analysis\n3. 🔍 Pattern identification\n4. ⚠️ Anomalies or concerns\n5. 💡 Data-driven recommendations\n6. 📋 Dashboard design suggestion\n7. 🎯 KPIs to monitor\n8. 📅 Reporting schedule recommendation`}]
      });
      steps.push({step:"✅ Analysis complete", status:"done"});
      return {result: analysis.choices[0]?.message?.content||"", steps};
    }
  },
};

// Agent endpoint
app.post("/api/agent/run", requireAuth, requireQuota, aiLimiter, wrap(async (req, res) => {
  const { agent_id, input } = req.body;
  if(!agent_id || !input) return res.status(400).json({ error:"Missing agent_id or input" });
  const agent = AGENTS[agent_id];
  if(!agent) return res.status(404).json({ error:"Agent not found" });

  try {
    const result = await agent.run(input, req.user.id, openai, fetch);
    // Save as project
    saveProject(req.user.id, `${agent.emoji} ${agent.name}: ${input.slice(0,50)}`, agent_id, input, result.result);
    res.json({ ...result, agent_name: agent.name, agent_emoji: agent.emoji });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}));

app.get("/api/agents", requireAuth, (_req, res) => {
  res.json({ agents: Object.entries(AGENTS).map(([id,a])=>({id, name:a.name, emoji:a.emoji, steps:a.steps})) });
});

// ─────────────────────────────────────────────
// 🔄 AI WORKFLOWS
// ─────────────────────────────────────────────
app.post("/api/workflow/run", requireAuth, requireQuota, aiLimiter, wrap(async (req, res) => {
  const { steps, input } = req.body;
  // steps = [{tool_id: "summarize"}, {tool_id: "translate"}, ...]
  if(!steps?.length || !input) return res.status(400).json({ error:"Missing steps or input" });

  const results = [];
  let currentInput = input;

  for(const step of steps.slice(0, 5)) { // max 5 steps
    const tool = TOOLS.find(t=>t.id===step.tool_id);
    if(!tool) continue;
    try {
      const output = await chatComplete(tool.systemPrompt, currentInput, "gpt-4o");
      results.push({ tool_id: step.tool_id, tool_name: tool.label, input: currentInput.slice(0,100), output });
      currentInput = output; // chain output as next input
    } catch(e) {
      results.push({ tool_id: step.tool_id, tool_name: tool.label, error: e.message });
      break;
    }
  }

  const finalOutput = results[results.length-1]?.output || "";
  saveProject(req.user.id, `Workflow: ${input.slice(0,50)}`, 'workflow', input, finalOutput);
  res.json({ results, final_output: finalOutput });
}));

// ─────────────────────────────────────────────
// 🎤 VOICE CLONING — ElevenLabs
// ─────────────────────────────────────────────
app.post("/api/voice/clone-tts", requireAuth, requireQuota, aiLimiter, wrap(async (req, res) => {
  const { text, voice_id } = req.body;
  if(!text) return res.status(400).json({ error:"Missing text" });

  const elevenKey = process.env.ELEVENLABS_API_KEY;
  if(!elevenKey) {
    // Fallback to OpenAI TTS
    const speech = await openai.audio.speech.create({ model:"tts-1", voice:"nova", input:text.slice(0,4096) });
    const buffer = Buffer.from(await speech.arrayBuffer());
    return res.json({ audio: buffer.toString("base64"), format:"mp3", provider:"openai" });
  }

  // ElevenLabs TTS
  const vid = voice_id || "21m00Tcm4TlvDq8ikWAM"; // default Rachel voice
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vid}`, {
    method:"POST",
    headers:{"Content-Type":"application/json","xi-api-key":elevenKey},
    body:JSON.stringify({text:text.slice(0,2500), model_id:"eleven_multilingual_v2", voice_settings:{stability:.5,similarity_boost:.75}})
  });
  if(!r.ok) throw new Error("ElevenLabs API error");
  const buf = Buffer.from(await r.arrayBuffer());
  res.json({ audio: buf.toString("base64"), format:"mp3", provider:"elevenlabs" });
}));

app.get("/api/voice/list", requireAuth, wrap(async (req, res) => {
  const elevenKey = process.env.ELEVENLABS_API_KEY;
  if(!elevenKey) return res.json({ voices:[
    {id:"alloy",name:"Alloy"},
    {id:"nova",name:"Nova"},
    {id:"echo",name:"Echo"},
    {id:"fable",name:"Fable"},
    {id:"onyx",name:"Onyx"},
  ]});

  const r = await fetch("https://api.elevenlabs.io/v1/voices",{
    headers:{"xi-api-key":elevenKey}
  });
  const d = await r.json();
  res.json({ voices: (d.voices||[]).map(v=>({id:v.voice_id, name:v.name, preview_url:v.preview_url})) });
}));

// ─────────────────────────────────────────────
// 🎨 REPLICATE — Image Edit + Music + FLUX
// ─────────────────────────────────────────────
async function replicateRun(model, input){
  const r = await fetch('https://api.replicate.com/v1/models/'+model+'/predictions',{
    method:'POST',
    headers:{'Authorization':'Token '+process.env.REPLICATE_API_KEY,'Content-Type':'application/json'},
    body:JSON.stringify({input}),
  });
  if(!r.ok) throw new Error('Replicate API error: '+r.status);
  let pred = await r.json();
  const id = pred.id;
  for(let i=0;i<30;i++){
    await new Promise(res=>setTimeout(res,2000));
    const poll = await fetch('https://api.replicate.com/v1/predictions/'+id,{
      headers:{'Authorization':'Token '+process.env.REPLICATE_API_KEY},
    });
    pred = await poll.json();
    if(pred.status==='succeeded') return pred.output;
    if(pred.status==='failed') throw new Error('Replicate failed: '+(pred.error||'unknown'));
  }
  throw new Error('Replicate timeout');
}

// True image editing with flux-kontext-pro
app.post("/api/image/edit-pro", requireAuth, requireQuota, aiLimiter,
  imageUpload.single("image"),
  wrap(async (req,res)=>{
    if(!req.file) return res.status(400).json({error:"No image uploaded."});
    if(!process.env.REPLICATE_API_KEY) return res.status(500).json({error:"REPLICATE_API_KEY not set."});
    const prompt = req.body.prompt?.trim();
    if(!prompt) return res.status(400).json({error:"Missing prompt."});
    const filePath = req.file.path;
    try{
      const buffer = fs.readFileSync(filePath);
      const base64 = buffer.toString('base64');
      const mimeType = req.file.mimetype||'image/png';
      const dataUrl = `data:${mimeType};base64,${base64}`;
      const output = await replicateRun('black-forest-labs/flux-kontext-pro',{prompt,input_image:dataUrl});
      const imageUrl = Array.isArray(output)?output[0]:output;
      res.json({url:imageUrl,type:'edited'});
    }finally{fs.unlink(filePath,()=>{});}
  })
);

// Music generation with MusicGen
app.post("/api/music/generate", requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  if(!process.env.REPLICATE_API_KEY) return res.status(500).json({error:"REPLICATE_API_KEY not set."});
  const {prompt, duration=15} = req.body;
  if(!prompt) return res.status(400).json({error:"Missing prompt."});
  const output = await replicateRun('meta/musicgen',{
    prompt,model_version:'stereo-large',output_format:'mp3',
    duration:Math.min(Number(duration)||15,30),
  });
  const audioUrl = Array.isArray(output)?output[0]:output;
  const audioRes = await fetch(audioUrl);
  const buf = Buffer.from(await audioRes.arrayBuffer());
  res.json({audio:buf.toString('base64'),format:'mp3',url:audioUrl});
}));

// Better image gen with FLUX 1.1 Pro
app.post("/api/image/flux", requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  if(!process.env.REPLICATE_API_KEY) return res.status(500).json({error:"REPLICATE_API_KEY not set."});
  const {prompt} = req.body;
  if(!prompt) return res.status(400).json({error:"Missing prompt."});
  const output = await replicateRun('black-forest-labs/flux-1.1-pro',{
    prompt,width:1024,height:1024,output_format:'webp',output_quality:90,
  });
  const imageUrl = Array.isArray(output)?output[0]:output;
  res.json({url:imageUrl});
}));

// Imagen-4 (Google) - best image quality
app.post("/api/image/imagen4", requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  if(!process.env.REPLICATE_API_KEY) return res.status(500).json({error:"REPLICATE_API_KEY not set."});
  const {prompt} = req.body;
  if(!prompt) return res.status(400).json({error:"Missing prompt."});
  const output = await replicateRun('google/imagen-4',{
    prompt, aspect_ratio:'1:1', output_format:'webp',
  });
  const imageUrl = Array.isArray(output)?output[0]:output;
  res.json({url:imageUrl});
}));

// FLUX-2-Pro - image generation + editing with references
app.post("/api/image/flux2pro", requireAuth, requireQuota, aiLimiter,
  clipdropUpload.array("images", 8),
  wrap(async (req,res)=>{
    if(!process.env.REPLICATE_API_KEY) return res.status(500).json({error:"REPLICATE_API_KEY not set."});
    const prompt = req.body.prompt?.trim();
    if(!prompt) return res.status(400).json({error:"Missing prompt."});
    const files = req.files||[];
    const input = {prompt, output_format:'webp', output_quality:90};
    // Add reference images if provided
    if(files.length>0){
      const { Blob } = await import('node:buffer');
      const refs = [];
      for(const f of files){
        const buf = fs.readFileSync(f.path);
        refs.push(`data:${f.mimetype};base64,${buf.toString('base64')}`);
        fs.unlink(f.path,()=>{});
      }
      input.input_images = refs;
    }
    const output = await replicateRun('black-forest-labs/flux-2-pro', input);
    const imageUrl = Array.isArray(output)?output[0]:output;
    res.json({url:imageUrl});
  })
);
const clipdropUpload = multer({ dest: uploadDir, limits:{ fileSize:30*1024*1024 } });

// ─────────────────────────────────────────────
// 🎬 MORE REPLICATE MODELS
// ─────────────────────────────────────────────

// GPT-Image-2 (OpenAI latest image model)
app.post("/api/image/gpt2", requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  const {prompt} = req.body;
  if(!prompt) return res.status(400).json({error:"Missing prompt."});
  const result = await openai.images.generate({
    model:"gpt-image-1", prompt, size:"1024x1024", quality:"high", n:1,
  });
  const url = result.data[0].url || `data:image/png;base64,${result.data[0].b64_json}`;
  res.json({url});
}));

// OCR - extract text from image using GPT-4o vision
app.post("/api/image/ocr", requireAuth, requireQuota, aiLimiter,
  clipdropUpload.single("image"),
  wrap(async (req,res)=>{
    if(!req.file) return res.status(400).json({error:"No image uploaded."});
    const filePath = req.file.path;
    try{
      const buffer = fs.readFileSync(filePath);
      const base64 = buffer.toString('base64');
      const mimeType = req.file.mimetype||'image/png';
      const result = await openai.chat.completions.create({
        model:"gpt-4o", max_tokens:2000,
        messages:[{role:"user",content:[
          {type:"image_url",image_url:{url:`data:${mimeType};base64,${base64}`}},
          {type:"text",text:"Extract ALL text from this image. Preserve formatting and structure. Return only the extracted text."}
        ]}]
      });
      res.json({text: result.choices[0]?.message?.content||""});
    }finally{fs.unlink(filePath,()=>{});}
  })
);

// Sketch to Image (Seedream-4)
app.post("/api/image/sketch", requireAuth, requireQuota, aiLimiter,
  clipdropUpload.single("image"),
  wrap(async (req,res)=>{
    if(!req.file) return res.status(400).json({error:"No image uploaded."});
    if(!process.env.REPLICATE_API_KEY) return res.status(500).json({error:"REPLICATE_API_KEY not set."});
    const prompt = req.body.prompt?.trim()||"a detailed realistic image";
    const filePath = req.file.path;
    try{
      const buffer = fs.readFileSync(filePath);
      const base64 = `data:${req.file.mimetype};base64,${buffer.toString('base64')}`;
      const output = await replicateRun('bytedance/seedream-4',{
        prompt, image:base64, guidance_scale:7, num_inference_steps:28,
      });
      res.json({url: Array.isArray(output)?output[0]:output});
    }finally{fs.unlink(filePath,()=>{});}
  })
);

// Face Swap
app.post("/api/image/faceswap", requireAuth, requireQuota, aiLimiter,
  clipdropUpload.fields([{name:'source',maxCount:1},{name:'target',maxCount:1}]),
  wrap(async (req,res)=>{
    if(!process.env.REPLICATE_API_KEY) return res.status(500).json({error:"REPLICATE_API_KEY not set."});
    const source = req.files?.source?.[0];
    const target = req.files?.target?.[0];
    if(!source||!target) return res.status(400).json({error:"Need source and target images."});
    try{
      const srcB64 = `data:${source.mimetype};base64,${fs.readFileSync(source.path).toString('base64')}`;
      const tgtB64 = `data:${target.mimetype};base64,${fs.readFileSync(target.path).toString('base64')}`;
      const output = await replicateRun('codeplugtech/face-swap',{swap_image:srcB64,target_image:tgtB64});
      res.json({url: Array.isArray(output)?output[0]:output});
    }finally{
      fs.unlink(source.path,()=>{});
      fs.unlink(target.path,()=>{});
    }
  })
);

// Restore old/damaged images
app.post("/api/image/restore", requireAuth, requireQuota, aiLimiter,
  clipdropUpload.single("image"),
  wrap(async (req,res)=>{
    if(!req.file) return res.status(400).json({error:"No image uploaded."});
    if(!process.env.REPLICATE_API_KEY) return res.status(500).json({error:"REPLICATE_API_KEY not set."});
    const filePath = req.file.path;
    try{
      const base64 = `data:${req.file.mimetype};base64,${fs.readFileSync(filePath).toString('base64')}`;
      const output = await replicateRun('flux-kontext-apps/restore-image',{
        image:base64, prompt:"restore and enhance this image, fix damage, improve quality",
      });
      res.json({url: Array.isArray(output)?output[0]:output});
    }finally{fs.unlink(filePath,()=>{});}
  })
);

// Music Cover
app.post("/api/music/cover", requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  if(!process.env.REPLICATE_API_KEY) return res.status(500).json({error:"REPLICATE_API_KEY not set."});
  const {prompt, style} = req.body;
  if(!prompt) return res.status(400).json({error:"Missing prompt."});
  const output = await replicateRun('minimax/music-cover',{
    prompt:`${prompt} in ${style||'pop'} style`, quality:"high",
  });
  const audioUrl = Array.isArray(output)?output[0]:output;
  const buf = Buffer.from(await (await fetch(audioUrl)).arrayBuffer());
  res.json({audio:buf.toString('base64'),format:'mp3',url:audioUrl});
}));

// Lipsync video
app.post("/api/video/lipsync", requireAuth, requireQuota, aiLimiter,
  clipdropUpload.fields([{name:'video',maxCount:1},{name:'audio',maxCount:1}]),
  wrap(async (req,res)=>{
    if(!process.env.REPLICATE_API_KEY) return res.status(500).json({error:"REPLICATE_API_KEY not set."});
    const video = req.files?.video?.[0];
    if(!video) return res.status(400).json({error:"Need video file."});
    try{
      const vidB64 = `data:video/mp4;base64,${fs.readFileSync(video.path).toString('base64')}`;
      const input = {video:vidB64};
      if(req.files?.audio?.[0]){
        const aud = req.files.audio[0];
        input.audio = `data:audio/mp3;base64,${fs.readFileSync(aud.path).toString('base64')}`;
        fs.unlink(aud.path,()=>{});
      }
      if(req.body.text) input.text = req.body.text;
      const output = await replicateRun('heygen/lipsync-precision',input);
      res.json({url: Array.isArray(output)?output[0]:output});
    }finally{fs.unlink(video.path,()=>{});}
  })
);

// Video Generation
app.post("/api/video/generate", requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  if(!process.env.REPLICATE_API_KEY) return res.status(500).json({error:"REPLICATE_API_KEY not set."});
  const {prompt} = req.body;
  if(!prompt) return res.status(400).json({error:"Missing prompt."});
  const output = await replicateRun('bytedance/seedance-2.0',{
    prompt, duration:5, resolution:"720p", watermark:false,
  });
  res.json({url: Array.isArray(output)?output[0]:output});
}));

// Music 2.6 - full songs with lyrics
app.post("/api/music/song", requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  if(!process.env.REPLICATE_API_KEY) return res.status(500).json({error:"REPLICATE_API_KEY not set."});
  const {prompt, lyrics} = req.body;
  if(!prompt) return res.status(400).json({error:"Missing prompt."});
  const output = await replicateRun('minimax/music-2.6',{
    prompt, lyrics:lyrics||'', auto_lyrics:!lyrics,
  });
  const audioUrl = Array.isArray(output)?output[0]:output;
  const buf = Buffer.from(await (await fetch(audioUrl)).arrayBuffer());
  res.json({audio:buf.toString('base64'),format:'mp3',url:audioUrl});
}));

// Nano Banana 2 - Google fast image gen
app.post("/api/image/nanobanana", requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  if(!process.env.REPLICATE_API_KEY) return res.status(500).json({error:"REPLICATE_API_KEY not set."});
  const {prompt} = req.body;
  if(!prompt) return res.status(400).json({error:"Missing prompt."});
  const output = await replicateRun('google/nano-banana-2',{prompt, aspect_ratio:'1:1'});
  res.json({url: Array.isArray(output)?output[0]:output});
}));

// Seedream 5 Lite - smart image gen
app.post("/api/image/seedream5", requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  if(!process.env.REPLICATE_API_KEY) return res.status(500).json({error:"REPLICATE_API_KEY not set."});
  const {prompt} = req.body;
  if(!prompt) return res.status(400).json({error:"Missing prompt."});
  const output = await replicateRun('bytedance/seedream-5-lite',{prompt, aspect_ratio:'1:1'});
  res.json({url: Array.isArray(output)?output[0]:output});
}));

// Grok TTS - xAI text to speech
app.post("/api/tts/grok", requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  if(!process.env.REPLICATE_API_KEY) return res.status(500).json({error:"REPLICATE_API_KEY not set."});
  const {text, voice='Default'} = req.body;
  if(!text) return res.status(400).json({error:"Missing text."});
  const output = await replicateRun('xai/grok-text-to-speech',{
    text:text.slice(0,2000), voice,
  });
  const audioUrl = Array.isArray(output)?output[0]:output;
  const buf = Buffer.from(await (await fetch(audioUrl)).arrayBuffer());
  res.json({audio:buf.toString('base64'),format:'mp3'});
}));

// Grok STT - xAI speech to text (25 languages)
app.post("/api/stt/grok", requireAuth, requireQuota, aiLimiter,
  clipdropUpload.single("audio"),
  wrap(async (req,res)=>{
    if(!process.env.REPLICATE_API_KEY) return res.status(500).json({error:"REPLICATE_API_KEY not set."});
    if(!req.file) return res.status(400).json({error:"No audio uploaded."});
    const filePath = req.file.path;
    try{
      const base64 = `data:audio/mp3;base64,${fs.readFileSync(filePath).toString('base64')}`;
      const output = await replicateRun('xai/grok-speech-to-text',{audio:base64});
      res.json({text: typeof output==='string'?output:output?.text||''});
    }finally{fs.unlink(filePath,()=>{});}
  })
);

// PixVerse v6 - cinematic video
app.post("/api/video/pixverse", requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  if(!process.env.REPLICATE_API_KEY) return res.status(500).json({error:"REPLICATE_API_KEY not set."});
  const {prompt} = req.body;
  if(!prompt) return res.status(400).json({error:"Missing prompt."});
  const output = await replicateRun('pixverse/pixverse-v6',{
    prompt, duration:5, resolution:"720p", quality:"high",
  });
  res.json({url: Array.isArray(output)?output[0]:output});
}));

// HappyHorse - video from image
app.post("/api/video/from-image", requireAuth, requireQuota, aiLimiter,
  clipdropUpload.single("image"),
  wrap(async (req,res)=>{
    if(!process.env.REPLICATE_API_KEY) return res.status(500).json({error:"REPLICATE_API_KEY not set."});
    const prompt = req.body.prompt?.trim()||"animate this image naturally";
    const filePath = req.file?.path;
    try{
      const input = {prompt};
      if(filePath){
        const base64 = `data:${req.file.mimetype};base64,${fs.readFileSync(filePath).toString('base64')}`;
        input.image = base64;
      }
      const output = await replicateRun('alibaba/happyhorse-1.0',input);
      res.json({url: Array.isArray(output)?output[0]:output});
    }finally{if(filePath)fs.unlink(filePath,()=>{});}
  })
);

// Veo 3.1 Lite - Google video gen
app.post("/api/video/veo", requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  if(!process.env.REPLICATE_API_KEY) return res.status(500).json({error:"REPLICATE_API_KEY not set."});
  const {prompt} = req.body;
  if(!prompt) return res.status(400).json({error:"Missing prompt."});
  const output = await replicateRun('google/veo-3.1-lite',{prompt, duration:5});
  res.json({url: Array.isArray(output)?output[0]:output});
}));

// Grok Imagine Video - xAI video gen
app.post("/api/video/grok", requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  if(!process.env.REPLICATE_API_KEY) return res.status(500).json({error:"REPLICATE_API_KEY not set."});
  const {prompt} = req.body;
  if(!prompt) return res.status(400).json({error:"Missing prompt."});
  const output = await replicateRun('xai/grok-imagine-video',{prompt, duration:5});
  res.json({url: Array.isArray(output)?output[0]:output});
}));

// Gemini 3.1 Flash TTS - Google fast TTS 70+ languages
app.post("/api/tts/gemini", requireAuth, requireQuota, aiLimiter, wrap(async (req,res)=>{
  if(!process.env.REPLICATE_API_KEY) return res.status(500).json({error:"REPLICATE_API_KEY not set."});
  const {text, voice='Aoede'} = req.body;
  if(!text) return res.status(400).json({error:"Missing text."});
  const output = await replicateRun('google/gemini-3.1-flash-tts',{
    text:text.slice(0,3000), voice,
  });
  const audioUrl = Array.isArray(output)?output[0]:output;
  const buf = Buffer.from(await (await fetch(audioUrl)).arrayBuffer());
  res.json({audio:buf.toString('base64'),format:'mp3'});
}));

// Remove background
app.post("/api/clipdrop/remove-bg", requireAuth, requireQuota, aiLimiter,
  clipdropUpload.single("image"),
  wrap(async (req,res)=>{
    if(!req.file) return res.status(400).json({error:"No image uploaded."});
    if(!process.env.CLIPDROP_API_KEY) return res.status(500).json({error:"CLIPDROP_API_KEY not set."});
    const filePath = req.file.path;
    try{
      const form = new FormData();
      const { Blob } = await import('node:buffer');
      const buffer = fs.readFileSync(filePath);
      form.append('image_file', new Blob([buffer],{type:req.file.mimetype||'image/png'}), req.file.originalname||'image.png');
      const r = await fetch('https://clipdrop-api.co/remove-background/v1',{
        method:'POST',
        headers:{'x-api-key':process.env.CLIPDROP_API_KEY},
        body:form,
      });
      if(!r.ok) throw new Error('Clipdrop error: '+r.status);
      const buf = Buffer.from(await r.arrayBuffer());
      res.json({image:buf.toString('base64'),format:'png'});
    }finally{fs.unlink(filePath,()=>{});}
  })
);

// Replace background
app.post("/api/clipdrop/replace-bg", requireAuth, requireQuota, aiLimiter,
  clipdropUpload.single("image"),
  wrap(async (req,res)=>{
    if(!req.file) return res.status(400).json({error:"No image uploaded."});
    if(!process.env.CLIPDROP_API_KEY) return res.status(500).json({error:"CLIPDROP_API_KEY not set."});
    const prompt = req.body.prompt?.trim();
    if(!prompt) return res.status(400).json({error:"Missing background prompt."});
    const filePath = req.file.path;
    try{
      const form = new FormData();
      const { Blob } = await import('node:buffer');
      const buffer = fs.readFileSync(filePath);
      form.append('image_file', new Blob([buffer],{type:req.file.mimetype||'image/png'}), 'image.png');
      form.append('prompt', prompt);
      const r = await fetch('https://clipdrop-api.co/replace-background/v1',{
        method:'POST',
        headers:{'x-api-key':process.env.CLIPDROP_API_KEY},
        body:form,
      });
      if(!r.ok) throw new Error('Clipdrop error: '+r.status);
      const buf = Buffer.from(await r.arrayBuffer());
      res.json({image:buf.toString('base64'),format:'png'});
    }finally{fs.unlink(filePath,()=>{});}
  })
);

// Upscale image
app.post("/api/clipdrop/upscale", requireAuth, requireQuota, aiLimiter,
  clipdropUpload.single("image"),
  wrap(async (req,res)=>{
    if(!req.file) return res.status(400).json({error:"No image uploaded."});
    if(!process.env.CLIPDROP_API_KEY) return res.status(500).json({error:"CLIPDROP_API_KEY not set."});
    const filePath = req.file.path;
    try{
      const form = new FormData();
      const { Blob } = await import('node:buffer');
      const buffer = fs.readFileSync(filePath);
      form.append('image_file', new Blob([buffer],{type:req.file.mimetype||'image/png'}), 'image.png');
      form.append('target_width', req.body.width||'2048');
      form.append('target_height', req.body.height||'2048');
      const r = await fetch('https://clipdrop-api.co/image-upscaling/v1/upscale',{
        method:'POST',
        headers:{'x-api-key':process.env.CLIPDROP_API_KEY},
        body:form,
      });
      if(!r.ok) throw new Error('Clipdrop error: '+r.status);
      const buf = Buffer.from(await r.arrayBuffer());
      res.json({image:buf.toString('base64'),format:'png'});
    }finally{fs.unlink(filePath,()=>{});}
  })
);

// Reimagine (style transfer)
app.post("/api/clipdrop/reimagine", requireAuth, requireQuota, aiLimiter,
  clipdropUpload.single("image"),
  wrap(async (req,res)=>{
    if(!req.file) return res.status(400).json({error:"No image uploaded."});
    if(!process.env.CLIPDROP_API_KEY) return res.status(500).json({error:"CLIPDROP_API_KEY not set."});
    const filePath = req.file.path;
    try{
      const form = new FormData();
      const { Blob } = await import('node:buffer');
      const buffer = fs.readFileSync(filePath);
      form.append('image_file', new Blob([buffer],{type:req.file.mimetype||'image/png'}), 'image.png');
      const r = await fetch('https://clipdrop-api.co/reimagine/v1/reimagine',{
        method:'POST',
        headers:{'x-api-key':process.env.CLIPDROP_API_KEY},
        body:form,
      });
      if(!r.ok) throw new Error('Clipdrop error: '+r.status);
      const buf = Buffer.from(await r.arrayBuffer());
      res.json({image:buf.toString('base64'),format:'png'});
    }finally{fs.unlink(filePath,()=>{});}
  })
);

// ─────────────────────────────────────────────
// 🧯 ERROR HANDLER
// ─────────────────────────────────────────────
app.use((err,_req,res,_next) => {
  console.error("❌", err.message || err);
  if (err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error:"File too large." });
  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === "production" ? "Internal server error." : err.message || "Unknown error";
  res.status(status).json({ error:message });
});

// ─────────────────────────────────────────────
// 🚀 START
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`💀 NexusAI running on port ${PORT}`);
  console.log(`   Tools loaded: ${TOOLS.length}`);
  console.log(`   Mode: ${process.env.NODE_ENV || "development"}`);
});