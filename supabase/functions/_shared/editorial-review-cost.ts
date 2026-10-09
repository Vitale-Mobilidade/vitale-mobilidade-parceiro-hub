import { screenDiversity, type CorpusItem } from "./editorial-foundation.ts";

/** Preserve every formerly reviewed body; add all flagged peers, omit unrelated metadata. */
export function reviewPeers(candidate: CorpusItem, corpus: CorpusItem[]): CorpusItem[] {
  const ranked = corpus.filter(peer => peer.id !== candidate.id).map(peer => ({ peer, result: screenDiversity(candidate, [peer]) }))
    .sort((a, b) => a.result.score - b.result.score);
  const baseline = new Set(ranked.slice(0, 5).map(item => item.peer.id));
  return ranked.filter(({ peer, result }) => baseline.has(peer.id) || result.alerts.length > 0 || result.score < 75)
    .map(item => item.peer).sort((a, b) => a.id.localeCompare(b.id));
}

/** Exact, private cache identity; do not use the short source fingerprint for approvals. */
export async function reviewInputKey(input: unknown): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(input)));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export function approvedAssessment(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const assessment = value as Record<string, unknown>;
  return assessment.pass === true && Array.isArray(assessment.issues) && assessment.issues.length === 0 &&
    Array.isArray(assessment.cautionViolations) && assessment.cautionViolations.length === 0 &&
    Number.isInteger(assessment.qualityScore) && Number(assessment.qualityScore) >= 0 && Number(assessment.qualityScore) <= 100;
}

export function repeatedReviewIssues(previous: unknown, issues: string[]): boolean {
  if (!Array.isArray(previous) || !previous.length || !issues.length || previous.some(value => typeof value !== "string")) return false;
  const normalize = (values: string[]) => [...new Set(values.map(value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim()))].sort();
  return JSON.stringify(normalize(previous)) === JSON.stringify(normalize(issues));
}
