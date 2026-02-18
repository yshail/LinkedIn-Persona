import * as dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { scrapeLinkedInProfile } from "./index.js";
import { analyzePersonality } from "../gemini-logic/llm.js";
import type { OceanAnalysis } from "../gemini-logic/llm.js";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ─── Store active SSE connections for progress updates ───
const sseClients: Map<string, express.Response> = new Map();

function sendProgress(jobId: string, message: string) {
  const client = sseClients.get(jobId);
  if (client) {
    client.write(`data: ${JSON.stringify({ message })}\n\n`);
  }
  console.log(`[${jobId}] ${message}`);
}

// ─── Health Check ───
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Load existing results from disk ───
app.get("/api/results", async (_req, res) => {
  try {
    const fs = await import("fs");
    const profilePath = "./scraped-profile.json";
    const postsPath = "./scraped-posts.json";
    const analysisPath = "./personality-analysis.json";

    if (!fs.existsSync(profilePath)) {
      return res
        .status(404)
        .json({ error: "No scraped data found. Run the scraper first." });
    }

    const profile = JSON.parse(fs.readFileSync(profilePath, "utf-8"));
    const posts = fs.existsSync(postsPath)
      ? JSON.parse(fs.readFileSync(postsPath, "utf-8"))
      : [];
    const analysis = fs.existsSync(analysisPath)
      ? JSON.parse(fs.readFileSync(analysisPath, "utf-8"))
      : null;

    return res.json({ profile, posts, analysis });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// ─── SSE Progress Stream ───
app.get("/api/progress/:jobId", (req, res) => {
  const { jobId } = req.params;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  sseClients.set(jobId, res);

  req.on("close", () => {
    sseClients.delete(jobId);
  });
});

// ─── Main Analyze Endpoint ───
app.post("/api/analyze", async (req, res) => {
  const { linkedinUrl } = req.body;

  if (!linkedinUrl || !linkedinUrl.includes("linkedin.com/in/")) {
    return res.status(400).json({
      error:
        "Invalid LinkedIn URL. Expected format: https://www.linkedin.com/in/username/",
    });
  }

  // Generate a unique job ID for SSE tracking
  const jobId =
    Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  // Return the job ID immediately so frontend can connect to SSE
  res.json({ jobId, status: "started" });
});

// ─── Job Execution Endpoint (called after SSE is connected) ───
app.post("/api/analyze/:jobId", async (req, res) => {
  const { jobId } = req.params;
  const { linkedinUrl } = req.body;

  if (!linkedinUrl || !linkedinUrl.includes("linkedin.com/in/")) {
    return res.status(400).json({ error: "Invalid LinkedIn URL." });
  }

  try {
    // Step 1: Scrape LinkedIn profile
    sendProgress(jobId, "Starting LinkedIn scraper...");

    const { profile, posts } = await scrapeLinkedInProfile(linkedinUrl, (msg) =>
      sendProgress(jobId, msg),
    );

    sendProgress(jobId, "Scraping complete. Starting personality analysis...");

    // Step 2: Analyze personality with Gemini
    let analysis: OceanAnalysis;
    try {
      analysis = await analyzePersonality(profile, posts);
      sendProgress(jobId, "Personality analysis complete!");
    } catch (llmError) {
      sendProgress(jobId, "LLM analysis failed. Returning scraped data only.");
      // Return scraped data without analysis
      const sseClient = sseClients.get(jobId);
      if (sseClient) {
        sseClient.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        sseClient.end();
        sseClients.delete(jobId);
      }
      return res.json({ profile, posts, analysis: null });
    }

    // Send completion to SSE
    const sseClient = sseClients.get(jobId);
    if (sseClient) {
      sseClient.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      sseClient.end();
      sseClients.delete(jobId);
    }

    return res.json({ profile, posts, analysis });
  } catch (error) {
    sendProgress(jobId, `Error: ${(error as Error).message}`);

    const sseClient = sseClients.get(jobId);
    if (sseClient) {
      sseClient.write(
        `data: ${JSON.stringify({ error: (error as Error).message })}\n\n`,
      );
      sseClient.end();
      sseClients.delete(jobId);
    }

    return res.status(500).json({ error: (error as Error).message });
  }
});

// ─── Serve Frontend Static Files ───
const isProd = __dirname.includes("dist");
const frontendDist = isProd
  ? path.join(__dirname, "../../../Frontend/dist")
  : path.join(__dirname, "../../Frontend/dist");

app.use(express.static(frontendDist));

// Fallback for SPA (React Router)
app.get(/.*/, (req, res) => {
  if (req.path.startsWith("/api")) return; // Don't fallback for API routes
  res.sendFile(path.join(frontendDist, "index.html"));
});

// ─── Start Server ───
app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`\n🚀 LinkedIn Persona API Server running at:`);
  console.log(`   http://0.0.0.0:${PORT}`);
  console.log(`   Health: http://0.0.0.0:${PORT}/api/health\n`);
});
