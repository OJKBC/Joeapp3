#!/usr/bin/env python3
# キャッシュ無効で配信する開発用サーバー（iPad等で常に最新が見えるように）
# つかいかた:  python3 serve.py
# ※Joeapp(8000)・Joeapp2(8001)と同時起動できるようポートは8002
# 録音ページ(rec.html)からの保存も受ける: POST /save_voice?name=q2_1 → voice/q2_1.wav
#   保存はこのMac自身(localhost)からだけ受け付ける。iPadなど他の機器からは保存できない。
import http.server, socketserver, json, os, re
from urllib.parse import urlparse, parse_qs

PORT = 8002
VOICE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'voice')
NAME_RE = re.compile(r'^(?:[qf][1-9]_[1-9]|a[1-9][0-9]?)$')   # q2_1 / f5_9 / a10

def write_manifest():
    names = sorted(f[:-4] for f in os.listdir(VOICE_DIR) if f.endswith('.wav'))
    with open(os.path.join(VOICE_DIR, 'manifest.json'), 'w') as fp:
        json.dump(names, fp)

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_POST(self):
        u = urlparse(self.path)
        name = parse_qs(u.query).get('name', [''])[0]
        if u.path != '/save_voice' or not NAME_RE.match(name):
            return self.send_error(400, 'bad name')
        if self.client_address[0] not in ('127.0.0.1', '::1'):
            return self.send_error(403, 'save only from this Mac')
        n = int(self.headers.get('Content-Length', 0))
        if n <= 44 or n > 5_000_000:
            return self.send_error(400, 'bad size')
        data = self.rfile.read(n)
        if data[:4] != b'RIFF':
            return self.send_error(400, 'not wav')
        os.makedirs(VOICE_DIR, exist_ok=True)
        with open(os.path.join(VOICE_DIR, name + '.wav'), 'wb') as fp:
            fp.write(data)
        write_manifest()
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'ok')

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(('0.0.0.0', PORT), NoCacheHandler) as httpd:
    print(f'no-cache server on http://0.0.0.0:{PORT}')
    print(f'録音ページ: http://localhost:{PORT}/rec.html')
    httpd.serve_forever()
