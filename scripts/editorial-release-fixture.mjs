import { readFileSync } from "node:fs";
const patch = JSON.parse(readFileSync(process.env.VITALE_PATCH_FILE, "utf8"));
const inventory = JSON.parse(
  readFileSync(process.env.VITALE_INVENTORY_FILE, "utf8"),
);
const originalFetch = globalThis.fetch;
globalThis.fetch = async function (input, init) {
  const response = await originalFetch(input, init);
  const url = typeof input === "string" ? input : input.url;
  if (
    !response.ok ||
    !/\/rest\/v1\/rpc\/get_published_editorial_(?:index|article)$/.test(url)
  )
    return response;
  const data = await response.json();
  for (const row of Array.isArray(data) ? data : [data]) {
    if (!row) continue;
    const existing = inventory.find((x) => x.slug === row.slug);
    if (existing) row.contentType = existing.content_type;
    const change = patch.find((x) => x.slug === row.slug);
    if (!change) continue;
    row.contentType = change.new_type;
    if (row.title === change.old_title) row.title = change.new_title;
    for (const [key, edit] of Object.entries(change.blocks || {}))
      if (row.blocks?.[Number(key)]?.text === edit.before)
        row.blocks[Number(key)].text = edit.after;
    for (const [key, edit] of Object.entries(change.faq || {}))
      if (row.faq?.[Number(key)]?.answer === edit.before)
        row.faq[Number(key)].answer = edit.after;
  }
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");
  return new Response(JSON.stringify(data), {
    status: response.status,
    headers,
  });
};
