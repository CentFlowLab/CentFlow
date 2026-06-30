#!/usr/bin/env bash
# Valida package-lock.json (npm 10 / lockfileVersion 3) — usado no CI CentFlow Release.
set -euo pipefail

node --version
npm --version

test -f package.json
test -f package-lock.json

node -e "JSON.parse(require('fs').readFileSync('package-lock.json','utf8'))"

LOCKFILE_VERSION="$(node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync('package-lock.json','utf8')).lockfileVersion))")"
if [ "${LOCKFILE_VERSION}" != "3" ]; then
  echo "::error::package-lock.json lockfileVersion=${LOCKFILE_VERSION} (esperado: 3 com npm 10)"
  exit 1
fi

npm ci --dry-run --no-audit --fund=false

# Falha se package.json e package-lock.json estiverem dessincronizados.
npm install --package-lock-only --no-audit --fund=false
if ! git diff --exit-code -- package-lock.json; then
  echo "::error::package-lock.json fora de sync com package.json — corre npm install e commita o lockfile."
  exit 1
fi

echo "package-lock.json OK"
