import * as dotenv from "dotenv";
dotenv.config();

// 💡 Normal Web Servers 101:
// Express is a framework that makes it easy to create a web server.
// Without it, setting up a web server in raw Node.js is incredibly verbose.
import express from "express";

// 💡 CORS (Cross-Origin Resource Sharing)
// 🛠️ IN DEVELOPMENT: Your React app runs on port 5173, and this server runs on 3000.
// Because they are on different ports, the browser's security blocks them from talking. CORS tells the browser "It's okay!"
// 🌍 IN PRODUCTION: We serve the React files directly from this Express server (see the bottom of this file).
// Since they both run on the exact same URL (e.g. https://my-app.com), CORS isn't actually required, but it's safe to leave anyway.
import cors from "cors";

// Our custom functions
import { scrapeLinkedInProfile } from "./index.js";
import { analyzePersonality } from "../gemini-logic/llm.js";
import type { OceanAnalysis } from "../gemini-logic/llm.js";

import path from "path";
import { fileURLToPath } from "url";

// 💡 ESM Path Resolution
// In modern TypeScript/JavaScript (ES Modules), there is no global `__dirname` variable.
// We have to calculate the current file's directory manually using these two lines.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize the Express server
const app = express();
const PORT = process.env.PORT || 3000;

// Apply "Middleware" (code that runs on EVERY request before it hits our actual routes)
app.use(cors()); // Allow frontend to talk to us
app.use(express.json()); // Allow server to understand JSON data sent in the request "body"

/**
 * --------------------------------------------------------------------------
 * SERVER SENT EVENTS (SSE) - LIVE UPDATES
 * --------------------------------------------------------------------------
 * ❓ What are Server Sent Events?
 * Normally, a server only speaks when spoken to (Request -> Response).
 * SSE allows the server to keep a connection open and constantly stream "live updates"
 * as they happen, which is perfect for progress bars!
 */

// We use a Map (Dictionary) to keep track of every person currently scraping a profile.
// Key = unique jobId, Value = their open browser connection.
const sseClients: Map<string, express.Response> = new Map();

/**
 * Helper function to send a text update to a specific user's browser.
 */
function sendProgress(jobId: string, message: string) {
  const client = sseClients.get(jobId);
  if (client) {
    // Note: SSE REQUIRES this exact formatting (`data: ... \n\n`) to work.
    client.write(`data: ${JSON.stringify({ message })}\n\n`);
  }
  console.log(`[Job: ${jobId}] ${message}`);
}

/**
 * --------------------------------------------------------------------------
 * API ROUTES (The Endpoints)
 * --------------------------------------------------------------------------
 */

// 1️⃣ Health Check
// It's a best practice to have a simple route that returns saying "I am alive".
// Cloud providers use this to see if they need to restart your server.
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 2️⃣ Load Existing Results
// Reads from the hard drive to load previously scraped data without running the whole scraper again.
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

    // Read the files and turn the text back into Javascript Objects
    const profile = JSON.parse(fs.readFileSync(profilePath, "utf-8"));
    const posts = fs.existsSync(postsPath)
      ? JSON.parse(fs.readFileSync(postsPath, "utf-8"))
      : [];
    const analysis = fs.existsSync(analysisPath)
      ? JSON.parse(fs.readFileSync(analysisPath, "utf-8"))
      : null;

    return res.json({ profile, posts, analysis });
  } catch (error) {
    // 💡 Beginner Mistake: Always catch errors! If you don't, the server could crash globally.
    return res.status(500).json({ error: (error as Error).message });
  }
});

// 3️⃣ Job Initiator
// Generates a unique Job ID ticket for the user and sends it back immediately.
app.post("/api/analyze", async (req, res) => {
  const { linkedinUrl } = req.body;

  if (!linkedinUrl || !linkedinUrl.includes("linkedin.com/in/")) {
    return res.status(400).json({
      error:
        "Invalid LinkedIn URL. Expected format: https://www.linkedin.com/in/username/",
    });
  }

  // Create a random ticket ID
  const jobId =
    Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  res.json({ jobId, status: "started" });
});

// 4️⃣ SSE Subscription Route
// Once the frontend gets the Job ID from step 3, it calls this route to "subscribe" to live updates.
app.get("/api/progress/:jobId", (req, res) => {
  const { jobId } = req.params;

  // We set special HTTP headers that tell the browser: "Keep this connection open forever!"
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Save their connection into our dictionary
  sseClients.set(jobId, res);

  // If the user closes their browser tab, remove them from our memory to avoid memory leaks!
  req.on("close", () => {
    sseClients.delete(jobId);
  });
});

// 5️⃣ The Main Execution Engine
// Once the frontend gets the Job ID and subscribes to SSE, it hits this route to actually start the heavy lifting.
app.post("/api/analyze/:jobId", async (req, res) => {
  const { jobId } = req.params;
  const { linkedinUrl } = req.body;

  if (!linkedinUrl || !linkedinUrl.includes("linkedin.com/in/")) {
    return res.status(400).json({ error: "Invalid LinkedIn URL." });
  }

  try {
    // --- Step 1: Scrape LinkedIn profile ---
    sendProgress(jobId, "Starting LinkedIn scraper...");

    // We pass our `sendProgress` function as a callback into the scraper function!
    const { profile, posts } = await scrapeLinkedInProfile(
      linkedinUrl,
      (
        msg, //inside index.ts
      ) => sendProgress(jobId, msg),
    );

    sendProgress(
      jobId,
      "Scraping complete. Starting AI personality analysis...",
    );

    // --- Step 2: Analyze personality with Gemini AI ---
    let analysis: OceanAnalysis;
    try {
      analysis = await analyzePersonality(profile, posts);
      sendProgress(jobId, "Personality analysis complete!");
    } catch (llmError) {
      sendProgress(
        jobId,
        "AI analysis failed (Check API Key). Returning scraped data only.",
      );

      // If AI fails, gracefully close the live stream, but still return the profile data.
      const sseClient = sseClients.get(jobId);
      if (sseClient) {
        sseClient.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        sseClient.end();
        sseClients.delete(jobId);
      }
      return res.json({ profile, posts, analysis: null });
    }

    // --- Step 3: Finish and Cleanup ---
    // At this point, everything succeeded! Send a final confirmation to the live stream.
    const sseClient = sseClients.get(jobId);
    if (sseClient) {
      sseClient.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      sseClient.end();
      sseClients.delete(jobId);
    }

    // Return the final data payload!
    return res.json({ profile, posts, analysis });
  } catch (error) {
    // If ANY step above fatally crashes (e.g., LinkedIn blocked us), catch it and relay the error to the frontend.
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

/**
 * --------------------------------------------------------------------------
 * PRODUCTION FRONTEND SERVING
 * --------------------------------------------------------------------------
 * When you host this live on the internet, you don't run two separate servers.
 * You "build" the React frontend into static HTML/CSS files, and this Express server serves them!
 */
const isProd = __dirname.includes("dist"); // Check if we are running the compiled production code
const frontendDist = isProd
  ? path.join(__dirname, "../../../Frontend/dist")
  : path.join(__dirname, "../../Frontend/dist");

app.use(express.static(frontendDist)); // Serve static files like CSS and images

// 💡 Single Page Application (SPA) Fallback
// Since React handles its own URL routing (like /profile or /about), if a user refeshes the page
// on /about, Express will look for an about.html file and crash. This code says, "If a route isn't an API, just give them the React App".
app.get(/.*/, (req, res) => {
  if (req.path.startsWith("/api")) return; // APIs should still 404 naturally
  res.sendFile(path.join(frontendDist, "index.html"));
});

/**
 * --------------------------------------------------------------------------
 * STARTUP 🚀
 * --------------------------------------------------------------------------
 */
app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`\n🚀 LinkedIn Persona API Server running at:`);
  console.log(`   http://0.0.0.0:${PORT}`);
  console.log(`   Health: http://0.0.0.0:${PORT}/api/health\n`);
});
