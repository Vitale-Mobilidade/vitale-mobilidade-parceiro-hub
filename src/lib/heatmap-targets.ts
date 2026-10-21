import { publicAnalyticsPath } from "../../supabase/functions/_shared/site-analytics";
export const TARGET_SELECTOR = "a[href],button,[data-heatmap-target]";
export const PRIVATE_SELECTOR =
  'form,input,textarea,select,[contenteditable],[role="dialog"],dialog,[data-heatmap-private],iframe';
function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
export function targetBase(element: Element): string | null {
  if (element.closest(PRIVATE_SELECTOR)) return null;
  const explicit = element.getAttribute("data-heatmap-target");
  if (explicit && /^[a-z][a-z0-9_-]{0,63}$/.test(explicit))
    return `e:${explicit}`;
  if (element.tagName.toLowerCase() === "a") {
    try {
      const url = new URL(
        element.getAttribute("href") ?? "",
        element.ownerDocument.baseURI,
      );
      const origin = new URL(element.ownerDocument.baseURI).origin;
      const path = publicAnalyticsPath(url.pathname);
      if (
        url.origin !== origin ||
        !path ||
        url.search ||
        (url.protocol !== "https:" && url.protocol !== "http:")
      )
        return null;
      return `h:${hash(path + (url.hash.match(/^#[a-z][a-z0-9_-]{0,63}$/) ? url.hash : ""))}`;
    } catch {
      return null;
    }
  }
  if (element.tagName.toLowerCase() !== "button") return null;
  const parts: string[] = [];
  let current: Element | null = element;
  for (
    let depth = 0;
    current && depth < 8;
    depth++, current = current.parentElement
  ) {
    const siblings = current.parentElement
      ? Array.from(current.parentElement.children).filter(
          (e) => e.tagName === current!.tagName,
        )
      : [current];
    parts.push(`${current.tagName}:${siblings.indexOf(current)}`);
  }
  return `b:${hash(parts.join("/"))}`;
}
/** Same algorithm on visitor DOM and the script-disabled public preview. */
export function targetIndex(doc: Document) {
  const counts = new Map<string, number>();
  const result = new Map<string, Element>();
  for (const element of Array.from(doc.querySelectorAll(TARGET_SELECTOR))) {
    const base = targetBase(element);
    if (!base) continue;
    const n = counts.get(base) ?? 0;
    counts.set(base, n + 1);
    if (n <= 999) result.set(`${base}:${n}`, element);
  }
  return result;
}
export function clickedTarget(element: Element) {
  const target = element.closest(TARGET_SELECTOR);
  if (!target) return null;
  for (const [key, item] of targetIndex(target.ownerDocument))
    if (item === target) return { key, element: target };
  return null;
}
