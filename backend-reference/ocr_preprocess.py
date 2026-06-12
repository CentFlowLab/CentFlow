#!/usr/bin/env python3
"""
Referência de pré-processamento OCR para o backend CentFlow.

Não está ligado à API — copiar/adaptar para o serviço que processa POST /receipts/:id/ocr.

Dependências:
  pip install opencv-python-headless pytesseract pillow numpy

Tesseract (servidor):
  apt install tesseract-ocr tesseract-ocr-por tesseract-ocr-eng
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

import cv2
import numpy as np

try:
    import pytesseract
except ImportError as exc:  # pragma: no cover
    raise SystemExit("Instala pytesseract: pip install pytesseract") from exc


def deskew(gray: np.ndarray) -> np.ndarray:
    """Corrige inclinação do talão via minAreaRect."""
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)
    coords = np.column_stack(np.where(edges > 0))
    if len(coords) < 100:
        return gray

    angle = cv2.minAreaRect(coords.astype(np.float32))[-1]
    if angle < -45:
        angle = 90 + angle
    if abs(angle) < 0.4 or abs(angle) > 12:
        return gray

    h, w = gray.shape[:2]
    matrix = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1.0)
    return cv2.warpAffine(
        gray,
        matrix,
        (w, h),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )


def enhance_contrast(gray: np.ndarray) -> np.ndarray:
    """CLAHE — melhora texto em talões térmicos e sombras."""
    clahe = cv2.createCLAHE(clipLimit=2.2, tileGridSize=(8, 8))
    return clahe.apply(gray)


def binarize(gray: np.ndarray) -> np.ndarray:
    """Binarização adaptativa para OCR Tesseract."""
    return cv2.adaptiveThreshold(
        gray,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        11,
    )


def preprocess_for_ocr(image_path: Path, client_version: str = "3") -> np.ndarray:
    image = cv2.imread(str(image_path))
    if image is None:
        raise ValueError(f"Imagem inválida: {image_path}")

    # Normalizar largura (~1200px, alinhado com mobile v3)
    h, w = image.shape[:2]
    target_w = 1200
    if w > target_w:
        scale = target_w / w
        image = cv2.resize(image, (target_w, int(h * scale)), interpolation=cv2.INTER_AREA)
    elif w < 900:
        scale = target_w / w
        image = cv2.resize(image, (target_w, int(h * scale)), interpolation=cv2.INTER_CUBIC)

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Mobile v3 já aplica contraste — servidor foca deskew + binarização
    if client_version and client_version >= "3":
        gray = deskew(gray)
        return binarize(gray)

    gray = deskew(gray)
    gray = enhance_contrast(gray)
    return binarize(gray)


def run_tesseract(image: np.ndarray, psm: int = 6) -> str:
    config = f"--oem 3 --psm {psm} -l por+eng"
    return pytesseract.image_to_string(image, config=config)


def parse_total_pt(text: str) -> float | None:
    patterns = [
        r"(?:TOTAL\s*(?:EUR|€)?)\s*[:\s]*€?\s*(\d{1,6}[.,]\d{2})",
        r"TOTAL\s*[:\s]*(\d{1,6}[.,]\d{2})",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if match:
            return float(match.group(1).replace(",", "."))
    return None


def main() -> None:
    parser = argparse.ArgumentParser(description="OCR talão CentFlow (referência)")
    parser.add_argument("image", type=Path)
    parser.add_argument("--psm", type=int, default=6)
    parser.add_argument("--client-version", default="3")
    args = parser.parse_args()

    processed = preprocess_for_ocr(args.image, args.client_version)
    text = run_tesseract(processed, psm=args.psm)
    total = parse_total_pt(text)

    print("=== RAW TEXT ===")
    print(text.strip())
    print("\n=== PARSED ===")
    print({"total_amount": total, "psm": args.psm})


if __name__ == "__main__":
    main()
