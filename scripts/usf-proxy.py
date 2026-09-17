#!/usr/bin/env python3
"""
USF rippled proxy
Run on ripple.cs.usfca.edu: python3 usf-proxy.py
Forwards HTTP POST requests to the local rippled node at 127.0.0.1:5005
"""

import json
import urllib.request
from http.server import HTTPServer, BaseHTTPRequestHandler

RIPPLED_URL = 'http://127.0.0.1:5005'
PORT = 3001

class ProxyHandler(BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        print(f"{self.address_string()} - {format % args}")

    def do_OPTIONS(self):
        self.send_response(200)
        self._set_cors()
        self.end_headers()

    def do_POST(self):
        length  = int(self.headers.get('Content-Length', 0))
        body    = self.rfile.read(length)

        try:
            req = urllib.request.Request(
                RIPPLED_URL,
                data=body,
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = resp.read()
            self.send_response(200)
            self._set_cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(data)

        except Exception as e:
            print(f"Error: {e}")
            self.send_response(502)
            self._set_cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())

    def _set_cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', PORT), ProxyHandler)
    print(f"USF rippled proxy running on port {PORT}")
    print(f"Forwarding to {RIPPLED_URL}")
    server.serve_forever()
