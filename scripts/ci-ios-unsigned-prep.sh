#!/usr/bin/env bash
# Prepara o projecto iOS gerado pelo prebuild para build unsigned em CI.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT_DIR}"

if [[ ! -d ios ]]; then
  echo "::error::Pasta ios/ não existe. Corre expo prebuild primeiro."
  exit 1
fi

NODE_PATH="$(command -v node)"
echo "export NODE_BINARY=${NODE_PATH}" > ios/.xcode.env
echo "export NODE_BINARY=${NODE_PATH}" > ios/.xcode.env.local
if [[ -n "${GITHUB_ENV:-}" ]]; then
  echo "NODE_BINARY=${NODE_PATH}" >> "${GITHUB_ENV}"
fi
echo "✓ NODE_BINARY=${NODE_PATH}"

cat > ios/CIUnsigned.xcconfig <<'EOF'
CODE_SIGNING_ALLOWED = NO
CODE_SIGNING_REQUIRED = NO
CODE_SIGN_IDENTITY =
DEVELOPMENT_TEAM =
AD_HOC_CODE_SIGNING_ALLOWED = NO
GCC_TREAT_WARNINGS_AS_ERRORS = NO
SWIFT_TREAT_WARNINGS_AS_ERRORS = NO
ONLY_ACTIVE_ARCH = NO
EOF
echo "✓ Created ios/CIUnsigned.xcconfig"

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
        config.build_settings['DEVELOPMENT_TEAM'] = ''
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

python3 <<'PY'
import re
from pathlib import Path

pbx_files = list(Path("ios").glob("*.xcodeproj/project.pbxproj"))
if not pbx_files:
    raise SystemExit("project.pbxproj not found")

for pbx in pbx_files:
    text = pbx.read_text()
    signing_keys = {
        "CODE_SIGN_STYLE": "Manual",
        "CODE_SIGNING_ALLOWED": "NO",
        "CODE_SIGNING_REQUIRED": "NO",
        'CODE_SIGN_IDENTITY': '""',
        "DEVELOPMENT_TEAM": '""',
        "PROVISIONING_PROFILE_SPECIFIER": '""',
    }

    def patch_block(match: re.Match[str]) -> str:
        block = match.group(0)
        for key, value in signing_keys.items():
            pattern = rf"{re.escape(key)} = [^;]*;"
            replacement = f"{key} = {value};"
            if re.search(pattern, block):
                block = re.sub(pattern, replacement, block)
            else:
                block = block.replace(
                    "buildSettings = {",
                    f"buildSettings = {{\n\t\t\t\t{key} = {value};",
                    1,
                )
        return block

    updated = re.sub(
        r"buildSettings = \{.*?\};",
        patch_block,
        text,
        flags=re.DOTALL,
    )
    pbx.write_text(updated)
    print(f"✓ Patched signing in {pbx}")
PY
