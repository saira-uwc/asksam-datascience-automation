#!/usr/bin/env bash
# Alias — use the unified DS API pipeline (RAG + Clinical Notes).
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/run-rag-api-machine.sh" "$@"
