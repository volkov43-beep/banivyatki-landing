"""Run the PHP adapter against an ephemeral TLS-only loopback CRM. Uses synthetic data."""
import hashlib
import json
import os
from pathlib import Path
import re
import ssl
import subprocess
import sys
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


class CRM(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def reply(self, status, data, key, replayed=False):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Content-Type", "application/json")
        if key:
            self.send_header("Idempotency-Key", key)
        if replayed:
            self.send_header("Idempotent-Replayed", "true")
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        root = self.server.root
        key = self.headers.get("Idempotency-Key", "")
        if (self.path != "/rest/api/17/fixture-token/crm.lead.add"
                or not re.fullmatch("[a-f0-9]{32}", key)
                or self.headers.get("Content-Type") != "application/json"
                or self.headers.get("Accept") != "application/json"):
            self.send_error(400)
            return
        body = self.rfile.read(int(self.headers["Content-Length"]))
        mode = (root / "mode").read_text()
        digest = hashlib.sha256(body).hexdigest()
        with self.server.lock:
            cached = self.server.results.get(key)
            with (root / "calls").open("a") as out:
                # Test inspector for synthetic traffic, separate from the adapter log.
                print(json.dumps([key, digest, json.loads(body)]), file=out)
            # Simulate a gateway refusal before a prior cached result could be read.
            if mode == "replay_rate":
                self.reply(429, {"error": {"code": "QUERY_LIMIT_EXCEEDED"}}, key)
                return
            if cached and cached[0] == digest:
                self.reply(200, {"result": {"id": cached[1]}}, key, True)
                return
            errors = {"auth": (401, "INVALID_CREDENTIALS"),
                      "scope": (403, "BITRIX_REST_V3_EXCEPTION_INSUFFICIENTSCOPEEXCEPTION"),
                      "rights": (403, "BITRIX_REST_V3_EXCEPTION_ACCESSDENIEDEXCEPTION"),
                      "validation": (400, "BITRIX_REST_V3_EXCEPTION_VALIDATION_DTOVALIDATIONEXCEPTION"),
                      "rate": (429, "QUERY_LIMIT_EXCEEDED"),
                      "unknown_rate": (429, "UNKNOWN"),
                      "server": (503, "INTERNAL_ERROR")}
            if cached:
                status, code = 422, "BITRIX_REST_V3_EXCEPTION_IDEMPOTENCYKEYREUSEDEXCEPTION"
            elif mode in errors:
                status, code = errors[mode]
            else:
                status, code = 200, ""
            if code:
                error = {"code": code, "message": "fixture-token PRIVATE-SENTINEL",
                         "validation": [{"field": "phone", "message": "+79000000001"}]}
                self.reply(status, {"error": error}, key)
                return
            lead_id = len(self.server.results) + 1
            self.server.results[key] = (digest, lead_id)
        if mode == "lost":
            return  # The committed response is lost.
        if mode == "timeout":
            time.sleep(12)
            (root / f"finished-{key}").touch()
            return
        if mode == "overlap":
            entered = time.monotonic_ns()
            try:
                self.server.overlap.wait(timeout=5)
            except threading.BrokenBarrierError:
                self.reply(503, {"error": {"code": "NO_OVERLAP"}}, key)
                return
            (root / f"interval-{key}").write_text(json.dumps([entered, time.monotonic_ns()]))
        if mode == "hold":
            for _ in range(200):
                if (root / f"release-{key}").exists():
                    break
                time.sleep(0.025)
            (root / f"finished-{key}").touch()
            return
        if mode == "bad_response":
            self.reply(200, {"result": {"id": "bad"}}, key)
            return
        self.reply(200, {"result": {"id": lead_id}}, "" if mode == "no_echo" else key)


def main():
    with tempfile.TemporaryDirectory(prefix="bv-lead-v3-") as directory:
        root = Path(directory)
        cert, key = root / "cert.pem", root / "key.pem"
        subprocess.run(["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
                        "-keyout", str(key), "-out", str(cert), "-subj", "/CN=127.0.0.1",
                        "-addext", "subjectAltName=IP:127.0.0.1"], check=True, capture_output=True)
        server = ThreadingHTTPServer(("127.0.0.1", 0), CRM)
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(cert, key)
        server.socket = context.wrap_socket(server.socket, server_side=True)
        server.results, server.lock, server.root = {}, threading.Lock(), root
        server.overlap = threading.Barrier(2)
        (root / "mode").write_text("ok")
        (root / "calls").touch()
        (root / "queue").mkdir(mode=0o700)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            cmd = [sys.argv[1], "-d", f"curl.cainfo={cert}", "-d", f"error_log={root}/diagnostics",
                   str(Path(__file__).with_name("lead-v3.test.php")), directory, str(server.server_port)]
            return subprocess.run(cmd, env={**os.environ, "no_proxy": "127.0.0.1", "NO_PROXY": "127.0.0.1"}).returncode
        finally:
            server.shutdown()
            server.server_close()
            thread.join()


if __name__ == "__main__":
    sys.exit(main())
