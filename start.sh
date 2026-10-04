#!/usr/bin/env sh
# Run BuildAI-60 on macOS / Linux:  sh start.sh
cd "$(dirname "$0")" || exit 1
if command -v node >/dev/null 2>&1; then
  (sleep 1; (open http://localhost:3000 || xdg-open http://localhost:3000) >/dev/null 2>&1) &
  node server.js
else
  echo "Node.js not found - opening index.html directly."
  open index.html 2>/dev/null || xdg-open index.html
fi
