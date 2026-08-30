import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, GenerateVideosOperation, Modality } from "@google/genai";

// Shared Google GenAI client (server-side only)
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON middleware with increased payload size for images/audio
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // --- API Routes ---

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      timestamp: new Date().toISOString(),
    });
  });

  // 1. Gemini Chat & Multi-Turn Completion
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const ai = getGeminiClient();
      if (!ai) {
        return res.status(400).json({
          error: "GEMINI_API_KEY is not configured on the server. Please add your key in Settings > Secrets or switch to Offline WebLLM / Groq.",
        });
      }

      const {
        messages = [],
        model = "gemini-3.7-flash",
        systemInstruction,
        temperature = 0.7,
        enableSearch = false,
        enableMaps = false,
        imageParts = [],
      } = req.body;

      const tools: any[] = [];
      if (enableSearch) {
        tools.push({ googleSearch: {} });
      } else if (enableMaps) {
        tools.push({ googleMaps: {} });
      }

      // Convert messages to Gemini format or contents
      const contents: any[] = [];

      for (const msg of messages) {
        const parts: any[] = [];
        if (msg.image) {
          parts.push({
            inlineData: {
              data: msg.image.replace(/^data:image\/\w+;base64,/, ""),
              mimeType: msg.mimeType || "image/jpeg",
            },
          });
        }
        if (msg.content) {
          parts.push({ text: msg.content });
        }
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: parts.length > 0 ? parts : [{ text: "" }],
        });
      }

      // If extra imageParts sent with prompt
      if (imageParts && imageParts.length > 0 && contents.length > 0) {
        const lastContent = contents[contents.length - 1];
        for (const img of imageParts) {
          lastContent.parts.unshift({
            inlineData: {
              data: img.data.replace(/^data:image\/\w+;base64,/, ""),
              mimeType: img.mimeType || "image/jpeg",
            },
          });
        }
      }

      const config: any = {
        temperature: Number(temperature) || 0.7,
      };

      if (systemInstruction) {
        config.systemInstruction = systemInstruction;
      }

      if (tools.length > 0) {
        config.tools = tools;
      }

      const response = await ai.models.generateContent({
        model: model || "gemini-3.7-flash",
        contents: contents.length > 0 ? contents : [{ parts: [{ text: "Привет" }] }],
        config,
      });

      const text = response.text || "";
      res.json({
        success: true,
        text,
        modelUsed: model,
      });
    } catch (err: any) {
      console.error("[Server Gemini Chat Error]:", err);
      res.status(500).json({
        error: err.message || "Failed to generate response from Gemini API.",
      });
    }
  });

  // 2. Gemini Image Generation & Editing
  app.post("/api/gemini/image", async (req, res) => {
    try {
      const ai = getGeminiClient();
      if (!ai) {
        return res.status(400).json({
          error: "GEMINI_API_KEY is not configured on the server.",
        });
      }

      const {
        prompt,
        model = "gemini-3.1-flash-lite-image",
        aspectRatio = "1:1",
        imageSize = "1K",
        baseImage,
        mimeType = "image/png",
      } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required." });
      }

      const parts: any[] = [];
      if (baseImage) {
        parts.push({
          inlineData: {
            data: baseImage.replace(/^data:image\/\w+;base64,/, ""),
            mimeType: mimeType || "image/png",
          },
        });
      }
      parts.push({ text: prompt });

      const config: any = {
        imageConfig: {
          aspectRatio,
        },
      };

      if (model === "gemini-3.1-flash-image" || model === "gemini-3-pro-image") {
        config.imageConfig.imageSize = imageSize || "1K";
      }

      const response = await ai.models.generateContent({
        model: model || "gemini-3.1-flash-lite-image",
        contents: { parts },
        config,
      });

      let generatedImageUrl = "";
      let responseText = "";

      if (response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            const mime = part.inlineData.mimeType || "image/png";
            generatedImageUrl = `data:${mime};base64,${part.inlineData.data}`;
          } else if (part.text) {
            responseText += part.text;
          }
        }
      }

      if (!generatedImageUrl && !responseText) {
        return res.status(500).json({ error: "No image or response data returned from model." });
      }

      res.json({
        success: true,
        imageUrl: generatedImageUrl,
        text: responseText,
        modelUsed: model,
      });
    } catch (err: any) {
      console.error("[Server Gemini Image Error]:", err);
      res.status(500).json({
        error: err.message || "Failed to generate/edit image with Gemini API.",
      });
    }
  });

  // 3. Veo Video Generation (Start)
  app.post("/api/generate-video", async (req, res) => {
    try {
      const ai = getGeminiClient();
      if (!ai) {
        return res.status(400).json({ error: "GEMINI_API_KEY is required for Veo video generation." });
      }

      const {
        prompt,
        model = "veo-3.1-lite-generate-preview",
        aspectRatio = "16:9",
        resolution = "720p",
        imageBytes,
        mimeType = "image/png",
      } = req.body;

      const videoPayload: any = {
        model: model || "veo-3.1-lite-generate-preview",
        config: {
          numberOfVideos: 1,
          resolution: resolution || "720p",
          aspectRatio: aspectRatio || "16:9",
        },
      };

      if (prompt) {
        videoPayload.prompt = prompt;
      }

      if (imageBytes) {
        videoPayload.image = {
          imageBytes: imageBytes.replace(/^data:image\/\w+;base64,/, ""),
          mimeType: mimeType || "image/png",
        };
      }

      const operation = await ai.models.generateVideos(videoPayload);
      res.json({
        success: true,
        operationName: operation.name,
      });
    } catch (err: any) {
      console.error("[Server Veo Video Start Error]:", err);
      res.status(500).json({ error: err.message || "Failed to start video generation." });
    }
  });

  // Alias route for video generation
  app.post("/api/gemini/video", async (req, res) => {
    // Forward to generate-video
    req.url = "/api/generate-video";
    return app._router.handle(req, res);
  });

  // 4. Veo Video Status Poll
  app.post("/api/video-status", async (req, res) => {
    try {
      const ai = getGeminiClient();
      if (!ai) {
        return res.status(400).json({ error: "GEMINI_API_KEY is not configured." });
      }

      const { operationName } = req.body;
      if (!operationName) {
        return res.status(400).json({ error: "operationName is required." });
      }

      const op = new GenerateVideosOperation();
      op.name = operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });

      res.json({
        done: !!updated.done,
        error: updated.error || null,
        hasVideo: !!updated.response?.generatedVideos?.[0]?.video?.uri,
      });
    } catch (err: any) {
      console.error("[Server Video Status Error]:", err);
      res.status(500).json({ error: err.message || "Failed to check video status." });
    }
  });

  app.post("/api/gemini/video-status", async (req, res) => {
    req.url = "/api/video-status";
    return app._router.handle(req, res);
  });

  // 5. Veo Video Download Stream
  app.post("/api/video-download", async (req, res) => {
    try {
      const ai = getGeminiClient();
      const apiKey = process.env.GEMINI_API_KEY;
      if (!ai || !apiKey) {
        return res.status(400).json({ error: "GEMINI_API_KEY is not configured." });
      }

      const { operationName } = req.body;
      if (!operationName) {
        return res.status(400).json({ error: "operationName is required." });
      }

      const op = new GenerateVideosOperation();
      op.name = operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });
      const uri = updated.response?.generatedVideos?.[0]?.video?.uri;

      if (!uri) {
        return res.status(404).json({ error: "Video URI not found or video not yet ready." });
      }

      const videoRes = await fetch(uri, {
        headers: { "x-goog-api-key": apiKey },
      });

      if (!videoRes.ok) {
        return res.status(videoRes.status).json({ error: "Failed to fetch video stream from storage." });
      }

      res.setHeader("Content-Type", "video/mp4");
      videoRes.body!.pipeTo(
        new WritableStream({
          write(chunk) {
            res.write(chunk);
          },
          close() {
            res.end();
          },
          abort(err) {
            console.error("Video pipe aborted:", err);
            res.end();
          },
        })
      );
    } catch (err: any) {
      console.error("[Server Video Download Error]:", err);
      res.status(500).json({ error: err.message || "Failed to download video stream." });
    }
  });

  app.post("/api/gemini/video-download", async (req, res) => {
    req.url = "/api/video-download";
    return app._router.handle(req, res);
  });

  // 6. Text-to-Speech (TTS) for Nova Jarvis Voice
  app.post("/api/gemini/tts", async (req, res) => {
    try {
      const ai = getGeminiClient();
      if (!ai) {
        return res.status(400).json({ error: "GEMINI_API_KEY is not configured." });
      }

      const { text, voice = "Zephyr", promptModifier = "Say clearly, intelligently and with confident, warm technological Jarvis cadence" } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Text is required for TTS." });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: `${promptModifier}: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice || "Zephyr" },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        return res.status(500).json({ error: "No audio data generated." });
      }

      res.json({
        success: true,
        audioBase64: base64Audio,
        mimeType: response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || "audio/pcm;rate=24000",
      });
    } catch (err: any) {
      console.error("[Server Gemini TTS Error]:", err);
      res.status(500).json({ error: err.message || "Failed to generate speech with Gemini TTS." });
    }
  });

  // 7. Audio Transcription
  app.post("/api/gemini/transcribe", async (req, res) => {
    try {
      const ai = getGeminiClient();
      if (!ai) {
        return res.status(400).json({ error: "GEMINI_API_KEY is not configured." });
      }

      const { audioData, mimeType = "audio/webm" } = req.body;
      if (!audioData) {
        return res.status(400).json({ error: "audioData is required." });
      }

      const audioPart = {
        inlineData: {
          mimeType: mimeType || "audio/webm",
          data: audioData.replace(/^data:audio\/\w+;base64,/, ""),
        },
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.5-transcribe",
        contents: {
          parts: [audioPart, { text: "Transcribe this audio verbatim in its original language." }],
        },
      });

      res.json({
        success: true,
        text: response.text || "",
      });
    } catch (err: any) {
      console.error("[Server Transcribe Error]:", err);
      res.status(500).json({ error: err.message || "Failed to transcribe audio." });
    }
  });

  // 8. Music Generation with Lyria
  app.post("/api/gemini/music", async (req, res) => {
    try {
      const ai = getGeminiClient();
      if (!ai) {
        return res.status(400).json({ error: "GEMINI_API_KEY is not configured." });
      }

      const { prompt, model = "lyria-3-clip-preview", imageBase64, mimeType = "image/jpeg" } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required for music generation." });
      }

      let contentsPayload: any = prompt;
      if (imageBase64) {
        contentsPayload = {
          parts: [
            { text: prompt },
            { inlineData: { data: imageBase64.replace(/^data:image\/\w+;base64,/, ""), mimeType } },
          ],
        };
      }

      const response = await ai.models.generateContentStream({
        model: model || "lyria-3-clip-preview",
        contents: contentsPayload,
      });

      let audioBase64 = "";
      let lyrics = "";
      let audioMimeType = "audio/wav";

      for await (const chunk of response) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.inlineData?.data) {
            if (!audioBase64 && part.inlineData.mimeType) {
              audioMimeType = part.inlineData.mimeType;
            }
            audioBase64 += part.inlineData.data;
          }
          if (part.text && !lyrics) {
            lyrics = part.text;
          }
        }
      }

      res.json({
        success: true,
        audioBase64,
        mimeType: audioMimeType,
        lyrics,
      });
    } catch (err: any) {
      console.error("[Server Music Generation Error]:", err);
      res.status(500).json({ error: err.message || "Failed to generate music." });
    }
  });

  // Local Ollama proxy forwarding
  app.all("/api/ollama/*", async (req, res) => {
    try {
      const ollamaPath = req.url.replace(/^\/api\/ollama/, "");
      const targetUrl = `http://127.0.0.1:11434${ollamaPath}`;

      const options: RequestInit = {
        method: req.method,
        headers: {
          "Content-Type": "application/json",
        },
      };

      if (req.method !== "GET" && req.method !== "HEAD" && Object.keys(req.body || {}).length > 0) {
        options.body = JSON.stringify(req.body);
      }

      const response = await fetch(targetUrl, options);
      res.status(response.status);
      response.headers.forEach((val, key) => {
        res.setHeader(key, val);
      });

      if (response.body) {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      }
      res.end();
    } catch (err: any) {
      res.status(502).json({ error: `Ollama local proxy unreachable: ${err.message}` });
    }
  });

  // --- Vite middleware for development & static serving for production ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Zenith Personal OS Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
