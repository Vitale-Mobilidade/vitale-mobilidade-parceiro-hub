"""Generate static, legible 1200x630 social cards from existing Vitale photography.

Requires Pillow. The generated JPGs are committed; production needs no image service.
"""
from pathlib import Path
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/og"
FONT_DIR = Path("/System/Library/Fonts/Supplemental")
BOLD = FONT_DIR / "Arial Bold.ttf"
REGULAR = FONT_DIR / "Arial.ttf"
W, H = 1200, 630
SOURCES = {name: Image.open(ROOT / "scripts/og-backgrounds" / f"{name}-1200x630.jpg").convert("RGB") for name in
           ("vitale-home", "vitale-radar", "vitale-quiz", "vitale-conteudos", "vitale-ferramentas")}

CARDS = {
    "vitale-home": ("Encontre a bike elétrica certa", "Quiz, Radar de preços e conteúdo para decidir melhor", "vitale-home"),
    "vitale-radar": ("Radar de preços", "Acompanhe o histórico real antes de comprar", "vitale-radar"),
    "vitale-quiz": ("Qual bike combina com você?", "Responda o Quiz e encontre modelos para sua rotina", "vitale-quiz"),
    "vitale-conteudos": ("Conteúdos e testes de bikes", "Guias, comparativos e análises para escolher melhor", "vitale-conteudos"),
    "vitale-ferramentas": ("Calcule sua mobilidade", "Compare custo, tempo e renda com uma bike elétrica", "vitale-ferramentas"),
    "grupo-de-ofertas": ("Ofertas de bikes elétricas", "Entre no grupo da Vitale e acompanhe oportunidades", "vitale-home"),
    "newsletter": ("Newsletter Vitale", "Bikes elétricas, vídeos e Radar no seu e-mail. Inscreva-se!", "vitale-home"),
    "privacidade": ("Privacidade na Vitale", "Saiba como tratamos seus dados e preferências", "vitale-home"),
    "carro-vs-bike": ("Carro ou bike elétrica?", "Compare gastos e descubra o impacto na sua rotina", "vitale-ferramentas"),
    "moto-vs-bike": ("Moto ou bike elétrica?", "Veja o custo de cada opção no seu trajeto", "vitale-ferramentas"),
    "transporte-publico-vs-bike": ("Ônibus ou bike elétrica?", "Compare tarifa, tempo e custo de deslocamento", "vitale-ferramentas"),
    "uber-vs-bike": ("Uber ou bike elétrica?", "Calcule quando a bike pode compensar", "vitale-ferramentas"),
    "economia": ("Quanto você pode economizar?", "Simule seus gastos com uma bike elétrica", "vitale-ferramentas"),
    "payback": ("Quando a bike se paga?", "Calcule o tempo para recuperar o investimento", "vitale-ferramentas"),
    "custo-anual-mobilidade": ("Seu custo anual de mobilidade", "Veja quanto você gasta para se deslocar", "vitale-ferramentas"),
    "tempo-no-transito": ("Quanto tempo você perde?", "Calcule as horas gastas no trânsito", "vitale-ferramentas"),
    "tempo-recuperado": ("Recupere tempo no trajeto", "Compare horas ao longo de um, três e cinco anos", "vitale-ferramentas"),
    "aplicativos-vs-bike": ("Aplicativos ou bike própria?", "Compare o custo de entregas com sua bike", "vitale-ferramentas"),
    "economia-de-tempo": ("Economize tempo com a bike", "Veja a diferença no seu deslocamento diário", "vitale-ferramentas"),
    "meta-entregas": ("Sua meta de entregas", "Calcule quantas corridas cobrem seus custos", "vitale-ferramentas"),
    "veiculo-alugado-vs-bike-propria": ("Alugar ou ter sua bike?", "Compare custos para trabalhar com entregas", "vitale-ferramentas"),
}

BIKES = {
    "bw02": "BW02", "bw1": "BW1", "coswheel_gt20": "Coswheel GT20", "d50_cross": "D50 Cross",
    "f6_pro_s": "F6 Pro S", "ft03": "FT03", "gt2000": "Ouxi GT2000", "l10": "L10",
    "l20_cross": "L20 Cross", "ouxi_gt20": "Ouxi GT20", "ouxi_gt20_pro": "Ouxi GT20 Pro",
    "s12": "S12", "s14": "S14", "s8": "S8", "v10_max": "V10 Max", "v20_mini": "V20 Mini",
    "v20_pro": "V20 Pro", "v29_pro": "V29 Pro", "v35": "V35", "v40_pro": "V40 Pro",
    "v8_pro": "Ouxi V8 Pro", "v8_pro_s": "Ouxi V8 Pro S", "v8_ultra": "V8 Ultra",
    "v9_max": "V9 Max", "v9_max_20ah": "V9 Max 20ah", "v9_max_s": "V9 Max S",
    "v9_max_ufofast": "V9 Max Ufofast", "v9_pro": "V9 Pro", "vl20": "VL20",
    "x50_action_pro": "X50 Action Pro",
}


def font(size, bold=False):
    return ImageFont.truetype(str(BOLD if bold else REGULAR), size)


def wrap(draw, text, face, max_width):
    lines, current = [], ""
    for word in text.split():
        candidate = f"{current} {word}".strip()
        if current and draw.textbbox((0, 0), candidate, font=face)[2] > max_width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def card(path, title, subtitle, source, radar=False):
    background = SOURCES[source].copy()
    background = background.resize((W, H), Image.Resampling.LANCZOS)
    overlay = Image.new("RGBA", (W, H))
    pixels = overlay.load()
    for x in range(W):
        opacity = int(224 - 110 * min(x / 950, 1))
        for y in range(H):
            pixels[x, y] = (3, 35, 30, opacity)
    canvas = Image.alpha_composite(background.convert("RGBA"), overlay)
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((66, 62, 288, 105), radius=20, fill="#007d59")
    draw.text((84, 72), "VITALE MOBILIDADE", font=font(20, True), fill="white")
    draw.text((68, 166), "RADAR VITALE" if radar else "ESCOLHA COM CONFIANÇA", font=font(23, True), fill="#36e5ad")
    size = 61 if len(title) < 32 else 55
    face = font(size, True)
    lines = wrap(draw, title, face, 830 if not radar else 750)
    if len(lines) > 3:
        size = 49
        face = font(size, True)
        lines = wrap(draw, title, face, 880)
    y = 222
    for line in lines:
        draw.text((66, y), line, font=face, fill="white", stroke_width=1, stroke_fill="#0b2f29")
        y += size + 7
    subface = font(28)
    for line in wrap(draw, subtitle, subface, 880)[:2]:
        draw.text((68, max(y + 17, 454)), line, font=subface, fill="#e5fff3")
        y += 34
    draw.rectangle((66, 585, 1134, 588), fill="#34dba3")
    draw.text((68, 598), "vitalemobilidade.com", font=font(17, True), fill="#d4fff0")
    if radar:
        # Miniature price history makes the Radar's purpose visible in the share image.
        box = (825, 183, 1135, 389)
        draw.rounded_rectangle(box, radius=18, fill=(247, 255, 250, 235))
        draw.text((848, 204), "HISTÓRICO DE PREÇOS", font=font(17, True), fill="#0b4637")
        points = [(850, 329), (897, 303), (941, 318), (989, 278), (1039, 288), (1090, 249), (1110, 253)]
        draw.line(points, fill="#00835d", width=7, joint="curve")
        for x, yy in points:
            draw.ellipse((x-5, yy-5, x+5, yy+5), fill="#00835d")
        draw.text((849, 349), "Veja a evolução de cada bike", font=font(16), fill="#0b4637")
    canvas.convert("RGB").save(path, "JPEG", quality=88, optimize=True, progressive=True, subsampling=0)


def main():
    for name, (title, subtitle, source) in CARDS.items():
        version = "-20260930" if name.startswith("vitale-") else ""
        card(OUT / f"{name}{version}-1200x630.jpg", title, subtitle, source, name == "vitale-radar")
    for bike_id, name in BIKES.items():
        card(OUT / f"radar-{bike_id}-1200x630.jpg", f"Radar: {name}", "Preço atual e histórico registrado da bike", "vitale-radar", True)
    print(f"Generated {len(CARDS) + len(BIKES)} OG cards")


if __name__ == "__main__":
    sys.exit(main())
