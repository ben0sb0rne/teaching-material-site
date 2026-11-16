#!/usr/bin/env python3
"""Serve src/ for development, with the browser cache turned off.

`python3 -m http.server` sends Last-Modified and nothing else. With no
Cache-Control, a browser falls back to heuristic freshness — roughly a tenth
of the file's age — so a placeholder generated yesterday is held as fresh for
hours. Drop a new texture in over it and the browser will not even ask the
server: you reload, and you are still looking at the old picture.

That is not a hypothetical. It has cost this project a confused half hour over
a swapped wall texture, and before that a simulation was very nearly retuned
against numbers measured from a stale .js file.

So: no-store on everything. It costs nothing on localhost and it means a file
on disk is always the file in the browser.
"""

import functools
import http.server
import json
import os
import sys

_BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# src/ in the site repo; the folder itself when this script travels with the
# downloaded reference material instead.
ROOT = os.path.join(_BASE, "src") if os.path.isdir(os.path.join(_BASE, "src")) else _BASE


class NoCache(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        """`?list` on a directory answers with its filenames as JSON.

        The activity needs to know which finished renders exist so it can
        fall back to a placeholder for the ones that do not. Asking for each
        file and counting the misses works, but every miss is a 404 the
        browser logs — 38 red lines on every load while the art is being
        made, which buries the errors that matter.
        """
        path, _, query = self.path.partition("?")
        if query == "list":
            target = self.translate_path(path)
            if os.path.isdir(target):
                names = sorted(
                    f for f in os.listdir(target) if not f.startswith(".")
                )
                body = json.dumps(names).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()

    def log_message(self, fmt, *args):
        # One line per request, without the date stamp the default repeats.
        sys.stderr.write("  %s\n" % (fmt % args))


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    # An optional root, so downloaded reference material can be opened under the
    # same no-store rules rather than reaching for python3 -m http.server.
    root = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 else ROOT
    handler = functools.partial(NoCache, directory=root)
    with http.server.ThreadingHTTPServer(("", port), handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
