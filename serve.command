#!/bin/sh
# Double-click this to serve the activities for a browser.
#
# To stop: close this window, or press Ctrl-C. The server runs in the
# foreground, so it dies with the window and leaves nothing behind — which
# is the whole point of it being this file and not a background daemon.

cd "$(dirname "$0")" || exit 1
PORT=8765
URL="http://localhost:$PORT/"

busy=$(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null)
if [ -n "$busy" ]; then
  echo "Port $PORT is already taken by: $(ps -p "$busy" -o comm= 2>/dev/null) (pid $busy)"
  printf 'Stop it and start fresh? [y/N] '
  read -r answer
  case "$answer" in
    y|Y) kill "$busy" 2>/dev/null; sleep 1 ;;
    *)   echo "Leaving it alone and opening the browser at it instead."
         open "$URL"; exit 0 ;;
  esac
fi

echo "Serving  $(pwd)/src"
echo "At       $URL"
echo "Stop it  by closing this window, or Ctrl-C"
echo

( sleep 1; open "$URL" ) &
python3 tools/serve.py "$PORT"

echo
echo "Server stopped."
