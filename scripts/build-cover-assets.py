"""Rebuild the embedded server assets from the pinned, licensed local binaries (no network)."""
from pathlib import Path
import base64
import hashlib
import json

root = Path(__file__).resolve().parents[1] / "supabase/functions/_shared/cover-renderer"
provenance = json.loads((root / "PROVENANCE.json").read_text())
entries = [(f"{name}WasmBase64", root / "vendor" / f"{name}.wasm", f"{name}.wasm") for name in ("jpeg", "png", "font")]
entries.append(("interFontBase64", root / "InterExtraBold.ttf", "InterExtraBold.ttf"))
lines = ["/** Generated from pinned local assets; see PROVENANCE.json and included licenses. */"]
for symbol, path, key in entries:
    data = path.read_bytes()
    if hashlib.sha256(data).hexdigest() != provenance[key]["sha256"]:
        raise ValueError(f"Pinned asset hash mismatch: {key}")
    lines.append(f'export const {symbol} = "{base64.b64encode(data).decode()}";')
(root / "assets.ts").write_text("\n".join(lines) + "\n")
print("Embedded server assets rebuilt and hashes verified.")
