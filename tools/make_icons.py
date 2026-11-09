"""Genera los iconos PWA de Asistencia CNH a partir del escudo del colegio."""
from PIL import Image
from collections import Counter
import os, json

SRC = "/mnt/user-data/uploads/645026bc-image.jpg"
OUT = "/home/claude/asistencia-cnh/public"
os.makedirs(OUT, exist_ok=True)

img = Image.open(SRC).convert("RGB")

# --- recortar el marco blanco -----------------------------------------
gray = img.convert("L")
bw = gray.point(lambda p: 255 if p < 245 else 0)
bbox = bw.getbbox()
logo = img.crop(bbox)
print("original:", img.size, "-> recortado:", logo.size)

# --- paleta dominante (ignorando blancos y negros) --------------------
small = logo.resize((160, 160))
counts = Counter()
for px in small.getdata():
    r, g, b = px
    if max(px) > 245 and min(px) > 230:   # blanco
        continue
    if max(px) < 60:                      # negro
        continue
    counts[(r // 24 * 24, g // 24 * 24, b // 24 * 24)] += 1
print("paleta:", [("#%02X%02X%02X" % c, n) for c, n in counts.most_common(6)])

# --- lienzo cuadrado con margen ---------------------------------------
def cuadrado(src, size, pad_ratio, bg=(255, 255, 255)):
    canvas = Image.new("RGB", (size, size), bg)
    inner = int(size * (1 - 2 * pad_ratio))
    w, h = src.size
    scale = inner / max(w, h)
    resized = src.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
    canvas.paste(resized, ((size - resized.width) // 2, (size - resized.height) // 2))
    return canvas

# Icono normal: margen chico, el escudo se ve grande
for size in (192, 512, 1024):
    cuadrado(logo, size, 0.05).save(f"{OUT}/icon-{size}.png")

# Maskable (Android recorta las esquinas): margen grande, zona segura
for size in (192, 512):
    cuadrado(logo, size, 0.18).save(f"{OUT}/icon-maskable-{size}.png")

# Apple touch icon — iOS no respeta transparencia, fondo blanco explícito
cuadrado(logo, 180, 0.06).save(f"{OUT}/apple-touch-icon.png")

# Favicon multi-resolución
ico = cuadrado(logo, 256, 0.02)
ico.save(f"{OUT}/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
cuadrado(logo, 32, 0.02).save(f"{OUT}/favicon-32.png")

# Escudo limpio para encabezados de la app y del correo
alto = 512
escudo = logo.resize((int(logo.width * alto / logo.height), alto), Image.LANCZOS)
escudo.save(f"{OUT}/escudo-cnh.png")

print("listo:", sorted(os.listdir(OUT)))
