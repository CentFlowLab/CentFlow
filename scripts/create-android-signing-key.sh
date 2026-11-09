#!/usr/bin/env bash
# Cria a chave de assinatura do APK Android (uma única vez) e guarda-a como segredos do GitHub.
# Corre-o tu, no Git Bash, na pasta do repositório: bash scripts/create-android-signing-key.sh
#
# - A chave e a palavra-passe ficam numa pasta local FORA do git (por omissão
#   ~/Documents/Miven-backups/android-signing). Guarda a palavra-passe num gestor de palavras-passe.
# - Sem esta chave não é possível publicar atualizações do APK: o Android recusa um APK assinado
#   com outra chave por cima da app instalada.
# - Nada é escrito no repositório nem mostrado no ecrã.
set -euo pipefail

DEST="${1:-$HOME/Documents/Miven-backups/android-signing}"
REPO="CentFlowLab/Miven"

if [ -f "$DEST/miven-release.p12" ]; then
  echo "Já existe uma chave em $DEST. Não crio outra (perderias as atualizações)."
  exit 1
fi
command -v openssl >/dev/null || { echo "Falta o openssl (vem com o Git para Windows)."; exit 1; }
command -v gh >/dev/null || { echo "Falta o GitHub CLI (gh)."; exit 1; }

mkdir -p "$DEST"
umask 077
PASS="$(openssl rand -hex 24)"
openssl req -x509 -newkey rsa:4096 -keyout "$DEST/key.pem" -out "$DEST/cert.pem" \
  -days 10950 -nodes -subj "/CN=Miven/O=Miven/C=PT" 2>/dev/null
openssl pkcs12 -export -inkey "$DEST/key.pem" -in "$DEST/cert.pem" -name miven \
  -out "$DEST/miven-release.p12" -passout "pass:$PASS" \
  -keypbe AES-256-CBC -certpbe AES-256-CBC -macalg sha256
rm -f "$DEST/key.pem"
printf '%s\n' "$PASS" > "$DEST/keystore-password.txt"
printf 'Alias: miven\nTipo: PKCS12\nCriada: %s\n' "$(date '+%Y-%m-%d')" > "$DEST/LEIA-ME.txt"

base64 -w0 "$DEST/miven-release.p12" | gh secret set ANDROID_KEYSTORE_BASE64 --repo "$REPO"
printf '%s' "$PASS" | gh secret set ANDROID_KEYSTORE_PASSWORD --repo "$REPO"
printf 'miven' | gh secret set ANDROID_KEY_ALIAS --repo "$REPO"

echo "Chave criada em $DEST e segredos ANDROID_* gravados em $REPO."
openssl x509 -in "$DEST/cert.pem" -noout -fingerprint -sha256
