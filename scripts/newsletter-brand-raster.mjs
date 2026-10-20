// Offline build of the fixed newsletter wordmark; no runtime font/WASM required.
import { Font, Layout } from '../supabase/functions/_shared/cover-renderer/vendor/font.js';
import { interFontBase64 } from '../supabase/functions/_shared/cover-renderer/assets.ts';
import { writeFileSync } from 'node:fs';
const font = new Font(26, Buffer.from(interFontBase64, 'base64'));
const layout = new Layout();
layout.reset({ wrap_style: 'word', vertical_align: 'top', horizontal_align: 'left' });
layout.append(font, 'Vitale Mobilidade', { scale: 26 });
const text = layout.rasterize(255,255,255);
writeFileSync(new URL('../src/lib/newsletter-brand.json', import.meta.url), JSON.stringify({ width: text.width, height: text.height, pixels: Buffer.from(text.buffer).toString('base64') })+'\n');
layout.free(); font.free();
