#!/usr/bin/env bash
# Serves the site at http://localhost:8752 from the project root.
#
# Links and assets use relative paths, so you can also just open index.html from
# Explorer. Serving it is closer to how it will behave in production.
#
# Usage:  bash serve.sh [port]      then open http://localhost:8752
set -euo pipefail
cd "$(dirname "$0")"

PORT="${1:-8752}"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File serve.ps1 -Port "$PORT"
