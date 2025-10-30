#!/usr/bin/env bash
set -euo pipefail

if ! command -v grep >/dev/null 2>&1; then
  echo "grep command not found. Install grep to run exit-criteria checks."
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! grep -R "EXIT-CRITERIA:" "$ROOT_DIR" | grep -Eq "[⚠️❌]"; then
  echo "Exit criteria checks passed."
  exit 0
else
  echo "Exit criteria checks failed: entries with ⚠️ or ❌ were detected."
  grep -R "EXIT-CRITERIA:" "$ROOT_DIR" | grep -E "[⚠️❌]"
  exit 1
fi
