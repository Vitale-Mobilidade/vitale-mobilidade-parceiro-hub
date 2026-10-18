import { expect, it } from "vitest";
import { newsletterHistory } from "./newsletter-edition-history.server";
import { newsletterTestDb } from "@/test/helpers/newsletter-db";
it("keeps the complete paginated source history for prompts and automatic generation", async () => {
  const rows = Array.from({ length: 510 }, (_, i) => ({
    id: String(i).padStart(4, "0"),
    created_at: new Date(2025, 0, 1 + i).toISOString(),
    edition_day: "2026-10-17",
    status: "sent",
    payload: { content: { editionNumber: i } },
  }));
  const f = newsletterTestDb({
    newsletter_campaigns: [
      ...rows,
      { ...rows[0], id: "future", edition_day: "2026-10-20" },
      { ...rows[0], id: "failed", status: "failed" },
    ],
  });
  const history = await newsletterHistory(f.db, "2026-10-19");
  expect(history).toHaveLength(510);
  expect(history.at(-1)?.payload.content.editionNumber).toBe(0);
});
