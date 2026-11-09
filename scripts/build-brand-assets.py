"""Gera todos os ícones da marca Miven a partir do logótipo oficial (ADR-036).

Fonte: assets/brand/miven-logo.webp (1254 x 1254, mosaico com brilho sobre fundo escuro).
Uso (precisa de Pillow e numpy, só para quem mexe na marca):
    python -m venv .venv-brand && .venv-brand/Scripts/pip install pillow numpy
    .venv-brand/Scripts/python scripts/build-brand-assets.py
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'assets' / 'brand' / 'miven-logo.webp'

# Mosaico arredondado dentro da imagem (medido: borda luminosa de 118 a 1135 px).
TILE_BOX = (118, 110, 1136, 1128)
# Símbolo (M com barras e seta) sem a borda do mosaico.
SYMBOL_BOX = (230, 170, 1090, 1030)
# Raio dos cantos do mosaico, em fração do lado.
CORNER = 0.215


def rounded_mask(size: int, radius_fraction: float) -> Image.Image:
    scale = 4
    big = Image.new('L', (size * scale, size * scale), 0)
    ImageDraw.Draw(big).rounded_rectangle(
        (0, 0, size * scale - 1, size * scale - 1), radius=int(size * scale * radius_fraction), fill=255
    )
    return big.resize((size, size), Image.LANCZOS)


def background_color(image: Image.Image) -> tuple[int, int, int]:
    """Fundo do ícone adaptativo do Android e do ícone "maskable" da PWA."""
    # O preto à volta do mosaico na imagem original.
    a = np.asarray(image).astype(float)
    corners = np.concatenate([a[:40, :40].reshape(-1, 3), a[:40, -40:].reshape(-1, 3)])
    return tuple(int(v) for v in np.median(corners, axis=0))


def save(image: Image.Image, relative: str, size: int) -> None:
    path = ROOT / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    image.resize((size, size), Image.LANCZOS).save(path, optimize=True)
    print(f'ok {relative} ({size}x{size})')


def main() -> None:
    source = Image.open(SOURCE).convert('RGB')
    tile = source.crop(TILE_BOX).convert('RGBA')
    bg = background_color(source)

    # iOS e ícone geral: mosaico a toda a largura; o sistema aplica a máscara dos cantos.
    full = tile.resize((1024, 1024), Image.LANCZOS)

    # Versão com cantos transparentes: arranque, PWA, site e emails.
    rounded = full.copy()
    rounded.putalpha(rounded_mask(1024, CORNER))

    # Android adaptativo: o mosaico completo (com o brilho) dentro da zona segura, sobre o preto
    # da imagem original, para não haver costuras quando o sistema recorta em círculo.
    side = 700
    offset = (1024 - side) // 2
    foreground = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    tile_small = rounded.resize((side, side), Image.LANCZOS)
    foreground.paste(tile_small, (offset, offset), tile_small)
    android_bg = Image.new('RGBA', (1024, 1024), (*bg, 255))

    # Monocromático: brilho do símbolo como opacidade, em branco.
    luminance = np.asarray(source.crop(SYMBOL_BOX).convert('L').resize((side, side), Image.LANCZOS))
    alpha = np.clip((luminance.astype(float) - 70) * 2.2, 0, 255).astype(np.uint8)
    mono_symbol = Image.new('RGBA', (side, side), (255, 255, 255, 0))
    mono_symbol.putalpha(Image.fromarray(alpha))
    monochrome = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    monochrome.paste(mono_symbol, (offset, offset), mono_symbol)

    # PWA "maskable": mosaico a 80 % sobre o fundo escuro.
    maskable = Image.new('RGBA', (1024, 1024), (*bg, 255))
    small = rounded.resize((820, 820), Image.LANCZOS)
    maskable.paste(small, (102, 102), small)

    save(full.convert('RGB'), 'assets/icon.png', 1024)
    save(foreground, 'assets/android-icon-foreground.png', 1024)
    save(android_bg, 'assets/android-icon-background.png', 1024)
    save(monochrome, 'assets/android-icon-monochrome.png', 1024)
    save(rounded, 'assets/splash-icon.png', 1024)
    save(rounded, 'assets/favicon.png', 64)
    save(rounded, 'public/icons/icon-192.png', 192)
    save(rounded, 'public/icons/icon-512.png', 512)
    save(maskable, 'public/icons/icon-maskable-512.png', 512)
    save(full.convert('RGB'), 'public/icons/apple-touch-icon.png', 180)
    save(rounded, 'site/assets/logo.png', 256)
    save(rounded, 'site/favicon.png', 64)
    save(rounded, 'site/assets/email-logo.png', 120)
    print(f'fundo do ícone adaptativo: #{bg[0]:02X}{bg[1]:02X}{bg[2]:02X}')


if __name__ == '__main__':
    main()
