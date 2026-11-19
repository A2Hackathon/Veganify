"""Run the real Swift API client in Simulator against a controlled HTTP peer.

The peer implements only the generation wire contract; it is not the backend or
an inference test. Both peer and client processes restart after response loss.
"""
import argparse
import http.server
import json
from pathlib import Path
import platform
import socket
import subprocess
import sys
import tempfile
import time


def serve(directory, port, drop):
    state = directory / 'receipts.json'

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_POST(self):
            assert self.path == '/recipes/generate'
            assert self.headers['Authorization'] == 'Bearer transport-test-token-0123456789abcdef'
            body = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            assert body == {'userId': 'transport-user'}
            key = self.headers.get('Idempotency-Key')
            assert key and len(key) == 36, 'Actual client must send its persisted UUID'
            records = json.loads(state.read_text()) if state.exists() else {}
            if key not in records:
                records[key] = 'recipe-' + str(len(records) + 1)
                state.write_text(json.dumps(records))
            if drop:
                self.connection.shutdown(socket.SHUT_RDWR)
                self.connection.close()
                return
            data = json.dumps([dict(id=records[key], userId=body['userId'], title='Rice',
                                    tags=[], duration='10 min', ingredients=[], steps=['Cook'],
                                    previewImageUrl='', type='simplified')]).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)

    http.server.HTTPServer.allow_reuse_address = True
    with http.server.HTTPServer(('127.0.0.1', port), Handler) as server:
        (directory / 'ready').write_text(str(server.server_port))
        server.serve_forever()


def run():
    root = Path(__file__).resolve().parents[1]
    devices = json.loads(subprocess.check_output(['xcrun', 'simctl', 'list', 'devices', 'available', '--json']))
    candidates = [d for runtime, entries in devices['devices'].items() if 'iOS' in runtime
                  for d in entries if d['name'].startswith('iPhone')]
    assert candidates, 'An available iPhone Simulator is required'
    device = candidates[0]
    booted_here = device['state'] != 'Booted'
    did_boot = False
    try:
        with tempfile.TemporaryDirectory(prefix='veganify-transport-') as temp:
            directory = Path(temp)
            executable = directory / 'transport-checks'
            sdk = subprocess.check_output(['xcrun', '--sdk', 'iphonesimulator', '--show-sdk-path'], text=True).strip()
            arch = 'arm64' if platform.machine() == 'arm64' else 'x86_64'
            subprocess.run(['xcrun', 'swiftc', '-D', 'DEBUG', '-sdk', sdk,
                            '-target', f'{arch}-apple-ios16.0-simulator',
                            'ios/Models.swift', 'ios/APIConfiguration.swift', 'ios/GenerationRetryStore.swift',
                            'ios/APIClient.swift', 'tests/APIClientTransportTests.swift', '-o', str(executable)],
                           cwd=root, check=True, timeout=300)
            # Compile before booting so first-boot migration does not compete with Swift.
            if booted_here:
                did_boot = True
                subprocess.run(['xcrun', 'simctl', 'boot', device['udid']], check=True, timeout=180)
            subprocess.run(['xcrun', 'simctl', 'bootstatus', device['udid'], '-b'], check=True, timeout=180)
            port = 0
            for phase in ['lost', 'recover']:
                ready = directory / 'ready'
                ready.unlink(missing_ok=True)
                peer = subprocess.Popen([sys.executable, __file__, '--serve', str(directory),
                                         '--port', str(port)] + (['--drop'] if phase == 'lost' else []))
                try:
                    deadline = time.monotonic() + 10
                    while not ready.exists():
                        assert peer.poll() is None and time.monotonic() < deadline, 'HTTP peer failed to start'
                        time.sleep(0.05)
                    port = int(ready.read_text())
                    subprocess.run(['xcrun', 'simctl', 'spawn', device['udid'], str(executable),
                                    f'http://127.0.0.1:{port}', str(directory / 'client'), phase],
                                   check=True, timeout=90)
                finally:
                    peer.terminate()
                    peer.wait(timeout=10)
            records = json.loads((directory / 'receipts.json').read_text())
            assert sorted(records.values()) == ['recipe-1', 'recipe-2'], records
            print('Actual iOS client HTTP response-loss, process restart, replay and new-attempt checks passed')
    finally:
        if did_boot:
            subprocess.run(['xcrun', 'simctl', 'shutdown', device['udid']], check=True, timeout=60)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--serve', type=Path)
    parser.add_argument('--port', type=int, default=0)
    parser.add_argument('--drop', action='store_true')
    args = parser.parse_args()
    if args.serve:
        serve(args.serve, args.port, args.drop)
    else:
        run()
