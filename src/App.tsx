import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, Brain, Search, ArrowRight } from "lucide-react";
import {
  startAnalysis,
  executeAnalysis,
  subscribeToProgress,
  loadExistingResults,
} from "./lib/api";
import type { AnalysisResponse } from "./types";
import { ProfileHeader } from "./components/ProfileHeader";
import { OceanRadarChart } from "./components/OceanRadarChart";
import { TraitCard } from "./components/TraitCard";

type AppState = "idle" | "loading" | "done" | "error";

const TRAIT_ICONS: Record<string, string> = {
  Openness: "◇",
  Conscientiousness: "▣",
  Extraversion: "△",
  Agreeableness: "○",
  Neuroticism: "◈",
};

function App() {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<AppState>("idle");
  const [progress, setProgress] = useState<string[]>([]);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState("");
  const [showSavedBlink, setShowSavedBlink] = useState(false);

  async function handleAnalyze() {
    if (!url.includes("linkedin.com/in/")) {
      setError("Please enter a valid LinkedIn profile URL.");
      return;
    }

    setState("loading");
    setProgress([]);
    setError("");
    setResult(null);

    try {
      const jobId = await startAnalysis(url);
      setProgress((p) => [...p, "Job queued..."]);

      subscribeToProgress(
        jobId,
        (msg) => setProgress((p) => [...p, msg]),
        () => {},
        (err) => setProgress((p) => [...p, `⚠ ${err}`]),
      );

      const data = await executeAnalysis(jobId, url);
      setResult(data);
      setState("done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(msg);
      setState("error");
    }
  }

  async function handleLoadExisting() {
    setState("loading");
    setProgress(["Loading saved results..."]);
    setError("");
    setResult(null);
    setShowSavedBlink(true);

    try {
      const data = await loadExistingResults();
      setResult(data);
      setState("done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "No existing data found.";
      setError(msg);
      setState("error");
    } finally {
      // Allow blink to finish (3s) before turning off state
      setTimeout(() => setShowSavedBlink(false), 3100);
    }
  }

  return (
    <div className="min-h-screen text-[#e8e8e8] flex flex-col" style={{ backgroundColor: "#1b1f23" }}>
      {/* ─── Background ─── */}
      <div
        className={`fixed inset-0 z-0 overflow-hidden ${state === "loading" ? "ambient-loading" : ""}`}
      >
        {/* Ambient orbs — LinkedIn blue tones */}
        <div
          className="ambient-orb w-[500px] h-[500px] top-[-10%] left-[-5%]"
          style={{ background: "rgba(10, 102, 194, 0.08)" }}
        />
        <div
          className="ambient-orb-2 w-[400px] h-[400px] bottom-[-10%] right-[-5%]"
          style={{ background: "rgba(55, 143, 233, 0.06)" }}
        />
        {state === "loading" && (
          <div
            className="ambient-orb ambient-orb-3 w-[600px] h-[600px] top-[20%] left-[30%]"
            style={{ background: "rgba(10, 102, 194, 0.12)" }}
          />
        )}

        {/* Tech brick wallpaper */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {[
            ["Gemini AI", "React", "TypeScript", "OCEAN", "Node.js", "SSE"],
            ["Express", "Big Five", "AI Analysis", "Vite", "LinkedIn", "Tailwind", "LLM"],
            ["Personality", "Scraper", "REST API", "shadcn/ui", "Recharts", "Dashboard"],
            ["Radar Chart", "JSON", "Psychology", "Archetype", "Playwright", "Traits", "API"],
            ["Profiler", "Dark Mode", "Gemini AI", "OCEAN", "TypeScript", "Node.js"],
            ["LinkedIn", "Playwright", "React", "Big Five", "AI Analysis", "SSE", "Vite"],
            ["Gemini", "Express", "Scraper", "REST API", "Personality", "Tailwind"],
            ["LLM", "Dashboard", "Recharts", "Traits", "Archetype", "Psychology", "JSON"],
            ["Playwright", "OCEAN", "Node.js", "Gemini AI", "React", "TypeScript"],
            ["Big Five", "Vite", "SSE", "LinkedIn", "Scraper", "Express", "Playwright"],
            ["AI Analysis", "Dark Mode", "Profiler", "shadcn/ui", "Playwright", "Gemini"],
            ["TypeScript", "React", "OCEAN", "LLM", "Traits", "Dashboard", "Tailwind"],
          ].map((row, rowIdx) => (
            <div
              key={rowIdx}
              style={{
                display: "flex",
                flex: 1,
                marginLeft: rowIdx % 2 === 1 ? "-5%" : "0",
              }}
            >
              {row.map((label, colIdx) => {
                const isPlaywright = label === "Playwright";
                const isJSON = label === "JSON";
                
                let animationClass = "";
                if (isPlaywright && state === "loading" && !showSavedBlink) {
                  animationClass = "animate-brick-blink";
                } else if ((isPlaywright || isJSON) && showSavedBlink) {
                  animationClass = "animate-brick-blink-3";
                }

                return (
                  <div
                    key={`${rowIdx}-${colIdx}`}
                    className={animationClass}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.008)",
                      letterSpacing: "1.5px",
                      userSelect: "none",
                      pointerEvents: "none",
                      margin: "-0.5px",
                    }}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Header — LinkedIn-style top bar */}
      <header className="sticky top-0 z-50 relative" style={{ backgroundColor: "#1d2226", borderBottom: "1px solid #313740" }}>
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-3">
          <div style={{ color: "#0a66c2" }}>
            <Brain className="w-6 h-6" />
          </div>
          <h1 className="text-base font-semibold tracking-tight text-white">
            LinkedIn Persona
          </h1>
          <span className="text-[10px] uppercase tracking-widest ml-1" style={{ color: "#8b8f94" }}>
            OCEAN Analysis
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 flex-1 w-full relative z-10">
        {/* ─── HERO / INPUT ─── */}
        <section className="mb-14">
          <p className="text-xs uppercase tracking-[0.2em] mb-3" style={{ color: "#0a66c2" }}>
            Personality Intelligence
          </p>
          <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
            Analyze a LinkedIn Profile
          </h2>
          <p className="text-sm mb-8 max-w-md" style={{ color: "#8b8f94" }}>
            Reveal personality traits using the Big Five psychological model.
            Powered by Gemini AI.
          </p>

          {/* Form */}
          <div className="flex gap-3 max-w-lg">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#8b8f94" }} />
              <Input
                placeholder="linkedin.com/in/username"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                className="pl-10 h-11 text-white rounded-lg"
                style={{
                  backgroundColor: "#38434f",
                  borderColor: "#313740",
                  color: "#e8e8e8",
                }}
                disabled={state === "loading"}
              />
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={state === "loading" || !url}
              className="h-11 font-semibold px-6 gap-2 rounded-lg cursor-pointer transition-all"
              style={{
                backgroundColor: "#0a66c2",
                color: "#ffffff",
              }}
            >
              {state === "loading" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              {state === "loading" ? "Analyzing" : "Analyze"}
            </Button>
          </div>

          <button
            onClick={handleLoadExisting}
            className="text-xs mt-4 underline underline-offset-4 cursor-pointer transition-colors block"
            style={{ color: "#8b8f94" }}
          >
            or load previously saved results
          </button>

          {error && (
            <p className="text-sm mt-3" style={{ color: "#cc3333" }}>{error}</p>
          )}
        </section>

        {/* ─── LOADING STATE ─── */}
        {state === "loading" && (
          <Card style={{ backgroundColor: "#1d2226", border: "1px solid #313740" }} className="max-w-lg">
            <CardContent className="py-8 px-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "#0a66c2" }} />
                <span className="text-sm font-medium text-white">
                  Processing
                </span>
              </div>
              <div className="space-y-3">
                {progress.map((msg, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className="text-xs mt-0.5 font-mono w-5 text-right shrink-0" style={{ color: "#8b8f94" }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span style={{ color: "#b0b4b8" }}>{msg}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── RESULTS DASHBOARD ─── */}
        {state === "done" && result && (
          <div className="space-y-8">
            <ProfileHeader profile={result.profile} analysis={result.analysis} />

            {result.analysis ? (
              <>
                {/* Radar Chart */}
                <Card style={{ backgroundColor: "#1d2226", border: "1px solid #313740" }}>
                  <CardContent className="pt-6">
                    <h2 className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: "#0a66c2" }}>
                      Personality Map
                    </h2>
                    <OceanRadarChart analysis={result.analysis} />
                  </CardContent>
                </Card>

                <Separator style={{ backgroundColor: "#313740" }} />

                {/* Trait Cards */}
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider mb-5" style={{ color: "#0a66c2" }}>
                    Trait Breakdown
                  </h2>
                  <div className="space-y-3">
                    <TraitCard name="Openness" trait={result.analysis.openness} icon={TRAIT_ICONS.Openness} />
                    <TraitCard name="Conscientiousness" trait={result.analysis.conscientiousness} icon={TRAIT_ICONS.Conscientiousness} />
                    <TraitCard name="Extraversion" trait={result.analysis.extraversion} icon={TRAIT_ICONS.Extraversion} />
                    <TraitCard name="Agreeableness" trait={result.analysis.agreeableness} icon={TRAIT_ICONS.Agreeableness} />
                    <TraitCard name="Neuroticism" trait={result.analysis.neuroticism} icon={TRAIT_ICONS.Neuroticism} />
                  </div>
                </div>

                <Separator style={{ backgroundColor: "#313740" }} />

                {/* Summary */}
                <Card style={{ backgroundColor: "#1d2226", border: "1px solid #313740" }}>
                  <CardContent className="pt-6 pb-6">
                    <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "#0a66c2" }}>
                      Persona Summary
                    </h2>
                    <p className="leading-relaxed text-[15px]" style={{ color: "#b0b4b8" }}>
                      {result.analysis.overallPersonaSummary}
                    </p>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <Card style={{ backgroundColor: "rgba(204, 51, 51, 0.05)", border: "1px solid rgba(204, 51, 51, 0.2)" }}>
                  <CardContent className="py-5 px-5">
                    <p className="text-sm" style={{ color: "#cc6666" }}>
                      ⚠ (Quota Limit)AI personality analysis could not be generated. Showing scraped profile data below.
                    </p>
                  </CardContent>
                </Card>

                {Array.isArray(result.posts) && result.posts.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wider mb-5" style={{ color: "#0a66c2" }}>
                      Scraped Posts ({result.posts.length})
                    </h2>
                    <div className="space-y-3">
                      {result.posts.map((post: any, i: number) => (
                        <Card key={i} style={{ backgroundColor: "#1d2226", border: "1px solid #313740" }}>
                          <CardContent className="py-4 px-5">
                            <div className="flex justify-between items-start gap-4 mb-2">
                              <span className="text-xs font-mono" style={{ color: "#8b8f94" }}>
                                {String(i + 1).padStart(2, "0")}
                              </span>
                              {post.postedDaysAgo !== undefined && (
                                <span className="text-xs shrink-0" style={{ color: "#8b8f94" }}>
                                  {post.postedDaysAgo}d ago
                                </span>
                              )}
                            </div>
                            <p className="text-sm leading-relaxed" style={{ color: "#b0b4b8" }}>
                              {post.content
                                ? post.content.length > 300
                                  ? post.content.slice(0, 300) + "..."
                                  : post.content
                                : "No content"}
                            </p>
                            {(post.likes || post.comments) && (
                              <div className="flex gap-4 mt-3 text-xs" style={{ color: "#8b8f94" }}>
                                {post.likes !== undefined && <span>♥ {post.likes}</span>}
                                {post.comments !== undefined && <span>💬 {post.comments}</span>}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-24 relative z-10" style={{ backgroundColor: "#1d2226", borderTop: "1px solid #313740" }}>
        <div className="max-w-4xl mx-auto px-6 py-5 flex justify-between items-center text-xs" style={{ color: "#8b8f94" }}>
          <span>
            Built by{" "}
            <a 
              href="https://shaileshyadav.in/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-[#0a66c2] transition-colors"
              style={{ textDecoration: "none", color: "inherit" }}
              onMouseOver={(e) => (e.currentTarget.style.color = "#0a66c2")}
              onMouseOut={(e) => (e.currentTarget.style.color = "inherit")}
            >
              Shailesh Yadav
            </a>
          </span>
          <span>Gemini AI · OCEAN Model</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
