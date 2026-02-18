import axios from "axios";
import type { AnalysisResponse } from "../types";

const API_BASE = ""; // Relative paths for monolith deployment

/**
 * Load existing results from disk (previously scraped data).
 */
export async function loadExistingResults(): Promise<AnalysisResponse> {
  const { data } = await axios.get(`${API_BASE}/api/results`);
  return data;
}

/**
 * Start an analysis job and return the job ID.
 */
export async function startAnalysis(linkedinUrl: string): Promise<string> {
  const { data } = await axios.post(`${API_BASE}/api/analyze`, { linkedinUrl });
  return data.jobId;
}

/**
 * Execute the analysis job (scrape + LLM).
 */
export async function executeAnalysis(
  jobId: string,
  linkedinUrl: string,
): Promise<AnalysisResponse> {
  const { data } = await axios.post(`${API_BASE}/api/analyze/${jobId}`, {
    linkedinUrl,
  });
  return data;
}

/**
 * Subscribe to real-time progress updates via SSE.
 */
export function subscribeToProgress(
  jobId: string,
  onMessage: (msg: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
): EventSource {
  const eventSource = new EventSource(`${API_BASE}/api/progress/${jobId}`);

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.done) {
      eventSource.close();
      onDone();
      return;
    }

    if (data.error) {
      eventSource.close();
      onError(data.error);
      return;
    }

    if (data.message) {
      onMessage(data.message);
    }
  };

  eventSource.onerror = () => {
    eventSource.close();
  };

  return eventSource;
}
