#!/usr/bin/env bash
# One-time setup: creates the Dangle release signing key, stores its passphrase in your
# macOS Keychain, hands the key to GitHub Actions as secrets, and writes the public key
# to docs/dangle-release-key.asc for you to commit. Needs: gpg (brew install gnupg), gh.
set -euo pipefail
cd "$(dirname "$0")/.."

REPO="G-Deepak-05/Dangle"
NAME="Dangle Release Signing (github.com/$REPO)"

if gpg --list-secret-keys "$NAME" >/dev/null 2>&1; then
  echo "A key named \"$NAME\" already exists; reusing it."
  PASS=$(security find-generic-password -a dangle-release -s "Dangle GPG release key" -w)
else
  umask 077
  PASS=$(openssl rand -base64 32)
  security add-generic-password -U -a dangle-release -s "Dangle GPG release key" -w "$PASS"
  gpg --batch --pinentry-mode loopback --passphrase "$PASS" --quick-gen-key "$NAME" ed25519 sign 3y
fi

FPR=$(gpg --list-secret-keys --with-colons "$NAME" | awk -F: '/^fpr/{print $10; exit}')

gpg --batch --pinentry-mode loopback --passphrase "$PASS" --armor --export-secret-keys "$FPR" |
  gh secret set GPG_PRIVATE_KEY -R "$REPO"
printf %s "$PASS" | gh secret set GPG_PASSPHRASE -R "$REPO"
gpg --armor --export "$FPR" > docs/dangle-release-key.asc

echo
echo "Done. Fingerprint: $FPR"
echo "Passphrase: Keychain Access › \"Dangle GPG release key\"."
echo "Next: put the fingerprint in docs/VERIFY.md, then commit docs/dangle-release-key.asc."
