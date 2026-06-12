#!/usr/bin/env bash
# Patch expo-modules-jsi for Xcode 26+ (GitHub Actions macos-latest).
# Fixes: https://github.com/expo/expo/issues/46326
# Upstream PR: https://github.com/expo/expo/pull/46377
set -euo pipefail

SCRIPT="node_modules/expo-modules-jsi/apple/scripts/build-xcframework.sh"

if [[ ! -f "${SCRIPT}" ]]; then
  echo "::error::${SCRIPT} não encontrado. Corre npm ci primeiro."
  exit 1
fi

if grep -q "CI_XCODE26_PATCH" "${SCRIPT}"; then
  echo "✓ Patch Xcode 26 já aplicado"
  exit 0
fi

python3 <<'PY'
from pathlib import Path

path = Path("node_modules/expo-modules-jsi/apple/scripts/build-xcframework.sh")
text = path.read_text()

needle = "    -parallelizeTargets \\\n    BUILD_LIBRARY_FOR_DISTRIBUTION=YES \\"
replacement = """    -parallelizeTargets \\
    # CI_XCODE26_PATCH: Xcode 26 ignora -derivedDataPath em schemes SPM
    SYMROOT="${BUILD_PRODUCTS_PATH}" \\
    OBJROOT="${DERIVED_DATA_PATH}/Build/Intermediates.noindex" \\
    BUILD_LIBRARY_FOR_DISTRIBUTION=YES \\"""

if "CI_XCODE26_PATCH" in text:
    raise SystemExit(0)

if needle not in text:
    raise SystemExit(
        "Não foi possível aplicar patch — build-xcframework.sh mudou de versão. "
        "Atualiza expo-modules-jsi ou reverte o patch."
    )

path.write_text(text.replace(needle, replacement, 1))
print("✓ Patch Xcode 26 aplicado em build-xcframework.sh")
PY
