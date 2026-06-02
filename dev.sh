#!/usr/bin/env bash
# Wrapper so the preview server uses the project-local Node toolchain.
set -e
export PATH="/Users/nihalreddygurrala/Workspace/.tools/node-v22.14.0-darwin-arm64/bin:$PATH"
cd "$(dirname "${BASH_SOURCE[0]}")"
exec npm run dev -- --port 3100
