#!/bin/sh
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js fehlt. https://nodejs.org"
  exit 1
fi
echo "Ember auf Port ${EMBER_PORT:-3478}"
echo "Spielleiter  http://127.0.0.1:${EMBER_PORT:-3478}/ember"
exec node server.js
