import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../../supabase/functions/editorial-admin/index.ts", import.meta.url), "utf8");
const publication = source.slice(source.indexOf("async function finishQueuedPublication("), source.indexOf("async function coverPreview("));

describe("new video automatic publication policy", () => {
  it("keeps narrative overlap out of the review input and cache dependencies", () => {
    const payload = publication.slice(publication.indexOf("const reviewPayload ="), publication.indexOf("const previousQa ="));
    expect(payload).not.toContain("peerArticles");
    expect(payload).not.toContain("diversity");
    expect(payload).toContain("corpus: []");
    expect(publication).toContain("automatic-publication-v8-temporal-intent");
    expect(publication).toContain("não é motivo de reprovação nem de reescrita");
  });
  it("retains factual QA, source integrity, saved cover and revision lease", () => {
    for (const guard of ["original_source_invalid", "capture.transcript !== video.transcript", "ensureLiteralPublicationEvidence", "automatic_publication_validation_failed", "coverPreview(req, db, article)", "assessment.pass === true && issues.length === 0", '.eq("revision", article.revision).eq("status", "draft")']) {
      expect(publication).toContain(guard);
    }
  });
});
