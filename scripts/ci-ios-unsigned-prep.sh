#!/usr/bin/env bash
# Prepara o projecto iOS gerado pelo prebuild para build unsigned em CI.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT_DIR}"

if [[ ! -d ios ]]; then
  echo "::error::Pasta ios/ não existe. Corre expo prebuild primeiro."
  exit 1
fi

# Xcode scripts (Bundle React Native code) precisam de Node no PATH
NODE_PATH="$(command -v node)"
echo "export NODE_BINARY=${NODE_PATH}" > ios/.xcode.env.local
echo "NODE_BINARY=${NODE_PATH}" >> "${GITHUB_ENV:-/dev/null}" 2>/dev/null || true
echo "✓ NODE_BINARY=${NODE_PATH}"

PODFILE="ios/Podfile"
if ! grep -q "CI_UNSIGNED_BUILD" "${PODFILE}"; then
  python3 <<'PY'
from pathlib import Path

podfile = Path("ios/Podfile")
text = podfile.read_text()
patch = """
    # CI_UNSIGNED_BUILD: disable code signing on Pod targets (unsigned IPA)
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
        config.build_settings['CODE_SIGNING_REQUIRED'] = 'NO'
        config.build_settings['CODE_SIGNING_IDENTITY'] = '-'
        config.build_settings['EXPANDED_CODE_SIGN_IDENTITY'] = '-'
      end
    end
"""
if "CI_UNSIGNED_BUILD" in text:
    raise SystemExit(0)

start = text.find("post_install do |installer|")
if start == -1:
    raise SystemExit("post_install block not found in Podfile")

needle = "react_native_post_install("
pos = text.find(needle, start)
if pos == -1:
    raise SystemExit("react_native_post_install not found in Podfile")

depth = 0
insert_pos = None
for i in range(pos, len(text)):
    ch = text[i]
    if ch == "(":
        depth += 1
    elif ch == ")":
        depth -= 1
        if depth == 0:
            insert_pos = i + 1
            break

if insert_pos is None:
    raise SystemExit("Could not find end of react_native_post_install")

podfile.write_text(text[:insert_pos] + "\n" + patch + text[insert_pos:])
print("✓ Podfile patched for unsigned CI build")
PY
fi

PBXPROJ="$(find ios -name 'project.pbxproj' -path '*.xcodeproj/*' | head -1)"
if [[ -n "${PBXPROJ}" ]]; then
  sed -i.bak \
    -e 's/CODE_SIGN_STYLE = Automatic;/CODE_SIGN_STYLE = Manual;/g' \
    -e 's/CODE_SIGN_IDENTITY = "Apple Development";/CODE_SIGN_IDENTITY = "";/g' \
    -e 's/CODE_SIGN_IDENTITY = iPhone Developer;/CODE_SIGN_IDENTITY = "";/g' \
    -e 's/DEVELOPMENT_TEAM = [^;]*;/DEVELOPMENT_TEAM = "";/g' \
    "${PBXPROJ}" || true
  rm -f "${PBXPROJ}.bak"
  echo "✓ Patched ${PBXPROJ}"
fi
