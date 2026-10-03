# Verifying a Dangle download

Every release since 0.1.8 comes with three ways to check that the file you downloaded
is the one GitHub built from this repository. You don't need any of them to use Dangle.
They're here if you'd like to be sure.

## 1. GitHub build attestation (strongest)

GitHub records which workflow and which commit produced each file. With the
[GitHub CLI](https://cli.github.com):

```sh
gh attestation verify Dangle_0.1.8_universal.dmg -R G-Deepak-05/Dangle
```

A pass means the file was built by this repository's release workflow and hasn't
changed since.

## 2. Checksum

Download `SHA256SUMS` from the same release, put it next to your file, and run:

```sh
# macOS / Linux
shasum -a 256 --ignore-missing -c SHA256SUMS
```

```powershell
# Windows (PowerShell): compare with the matching line in SHA256SUMS
Get-FileHash .\Dangle_0.1.8_x64-setup.exe -Algorithm SHA256
```

## 3. GPG signature on the checksums

`SHA256SUMS.asc` is a signature over `SHA256SUMS` made with the Dangle release key:

```sh
curl -sL https://raw.githubusercontent.com/G-Deepak-05/Dangle/main/docs/dangle-release-key.asc | gpg --import
gpg --verify SHA256SUMS.asc SHA256SUMS
```

Look for `Good signature from "Dangle Release Signing"`. Key fingerprint:

```
(added when the release key is created)
```

## What this doesn't change

macOS and Windows still show a one-time "unverified developer" prompt, because Dangle
isn't signed with a paid Apple or Microsoft certificate. These checks prove where the
file came from. They don't replace that prompt. In-app updates are separately verified
against the update key built into Dangle before they install.
