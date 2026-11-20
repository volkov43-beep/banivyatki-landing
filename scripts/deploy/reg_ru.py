"""Read-only REG.RU preflight, guarded private PHP update, and release verification."""
import argparse
import ftplib
import hashlib
import http.client
import json
import os
from pathlib import Path, PurePosixPath
import re
import ssl
import subprocess
import sys
import uuid
from concurrent.futures import ThreadPoolExecutor

PRIMARY = "banivyatki.ru"
MIRROR = "bani-vyatki.ru"
ACCOUNTS = {PRIMARY: "u3717330", MIRROR: "u3732869"}
MARKER = "bv-host-u3732869.txt"
# Both private files on Host-A were compared over FTPS in Actions run 44695375311.
BASELINE = "1e659fc90264862223e08b9bfaccd90ff3dfe65a"
PHP_FILES = ("lib.php", "retry.php")
DIST = Path("dist")


def digest(data):
    return hashlib.sha256(data).hexdigest()


def remote_hash(ftp, name):
    sha = hashlib.sha256()
    ftp.retrbinary("RETR " + name, sha.update)
    return sha.hexdigest()


def git(*args):
    return subprocess.check_output(["git", *args])


def known_hashes(name):
    git("merge-base", "--is-ancestor", BASELINE, "HEAD")
    path = "server/" + name
    commits = git("log", "--first-parent", "--format=%H", BASELINE + "..HEAD", "--", path).decode().split()
    return {digest(git("show", commit + ":" + path)) for commit in [BASELINE, *commits]}


def public_get(domain, path, limit):
    connection = http.client.HTTPSConnection(domain, timeout=20, context=ssl.create_default_context())
    try:
        connection.request("GET", path, headers={"Cache-Control": "no-cache", "Accept-Encoding": "identity"})
        response = connection.getresponse()
        body = response.read(limit + 1)
        if len(body) > limit:
            raise ValueError("Oversized HTTPS response for " + domain + path.split("?")[0])
        return response.status, response.headers, body
    finally:
        connection.close()


def check_directory(domain, host, path):
    if domain == MIRROR and host != "server38.hosting.reg.ru":
        raise ValueError("Wrong REG.RU server for the secondary account")
    # Only conventional document roots are supported. PWD and the HTTPS proof
    # below independently bind this exact, existing directory to the virtual host.
    valid = ("./www/" + domain + "/", "/www/" + domain + "/",
             "/var/www/" + ACCOUNTS[domain] + "/data/www/" + domain + "/")
    if domain == MIRROR:
        # A user whose FTP home is the account's www directory sees its children directly.
        valid += ("./" + domain + "/", "/" + domain + "/", domain + "/")
    if path not in valid:
        raise ValueError("Expected the verified FTP-visible www directory for " + domain)


def open_root(ftp, domain, path):
    ftp.cwd(path)
    root = PurePosixPath(ftp.pwd())
    valid = (PurePosixPath("/www", domain),
             PurePosixPath("/var/www", ACCOUNTS[domain], "data/www", domain))
    if domain == MIRROR:
        valid += (PurePosixPath("/", domain),)
    if root not in valid:
        raise ValueError("Unexpected server PWD for " + domain)
    if domain == MIRROR:
        status, _, token = public_get(domain, "/" + MARKER, 128)
        if status != 200 or not re.fullmatch(rb"[a-f0-9]{32}\r?\n?", token):
            raise ValueError("The secondary HTTPS ownership marker is missing or invalid")
        if remote_hash(ftp, MARKER) != digest(token):
            raise ValueError("FTPS directory and secondary HTTPS marker differ")
    else:
        status, _, page = public_get(domain, "/", 256 * 1024)
        if status != 200 or remote_hash(ftp, "index.html") != digest(page):
            raise ValueError("FTPS index.html differs from the primary HTTPS homepage")
    return root


def private_php(ftp, root, apply):
    private = root.parent / "private"
    ftp.cwd(str(private))
    if ftp.pwd() != str(private):
        raise ValueError("Private directory resolved outside the expected location")
    # Check the existence of the CRM configuration without transferring its contents.
    ftp.voidcmd("TYPE I")
    try:
        config_size = ftp.size("config.php")
    except ftplib.error_perm:
        raise ValueError("Cannot confirm private/config.php; check bootstrap and FTPS metadata access") from None
    if not config_size:
        raise ValueError("The private CRM configuration is missing or empty")
    changes = {}
    for name in PHP_FILES:
        expected = digest(Path("server", name).read_bytes())
        try:
            actual = remote_hash(ftp, name)
        except ftplib.error_perm:
            raise ValueError("Cannot read private/" + name + "; check bootstrap and FTPS permissions") from None
        if actual != expected:
            if actual not in known_hashes(name):
                raise ValueError(name + " differs from reviewed Git history; inspect the server copy")
            changes[name] = (actual, expected)
    print("Private PHP:", "update " + ", ".join(changes) if changes else "both hashes match")
    if apply and changes:
        staged = {}
        try:
            for name, (_, expected) in changes.items():
                tmp = ".bv-" + uuid.uuid4().hex + ".tmp"
                staged[name] = tmp
                with Path("server", name).open("rb") as stream:
                    ftp.storbinary("STOR " + tmp, stream)
                if remote_hash(ftp, tmp) != expected:
                    raise ValueError("Staged PHP checksum mismatch for " + name)
            for name, (previous, expected) in changes.items():
                if remote_hash(ftp, name) != previous:
                    raise ValueError(name + " changed during preflight")
                ftp.rename(staged[name], name)
                del staged[name]
                if remote_hash(ftp, name) != expected:
                    raise ValueError("Installed PHP checksum mismatch for " + name)
        finally:
            # Only our own newly allocated staging names, never a server-managed file.
            for tmp in staged.values():
                try:
                    ftp.delete(tmp)
                except ftplib.error_perm:
                    pass
    ftp.cwd(str(root))


def preview(ftp):
    same = changed = missing = 0
    for file in sorted(DIST.rglob("*")):
        if not file.is_file():
            continue
        name = file.relative_to(DIST).as_posix()
        # The pinned FTP action excludes Git placeholders from public transfers.
        if name == "photos/.gitkeep":
            continue
        try:
            actual = remote_hash(ftp, name)
        except ftplib.error_perm as error:
            if not str(error).startswith("550"):
                raise
            print("Absent or unreadable:", name)
            missing += 1  # Servers can also use 550 for an unreadable file.
            continue
        if actual == digest(file.read_bytes()):
            same += 1
        else:
            print("Different:", name)
            changed += 1
    print(f"Public dry-run: {same} identical, {changed} different, {missing} absent or unreadable; no writes")


def verify(ftp, domain):
    for name in (".htaccess", "api/lead.php"):
        if remote_hash(ftp, name) != digest((DIST / name).read_bytes()):
            raise ValueError("Deployed checksum mismatch for " + name)
    query = "?bv_release=" + os.environ.get("GITHUB_SHA", "check")

    def verify_file(file):
        name = file.relative_to(DIST).as_posix()
        route = "/" + name.removesuffix("index.html") if file.name == "index.html" else "/" + name
        local = file.read_bytes()
        status, _, remote = public_get(domain, route + query, len(local))
        if status != 200 or digest(remote) != digest(local):
            raise ValueError("Public release mismatch for " + route)

    files = [f for f in DIST.rglob("*") if f.is_file() and not f.name.startswith(".") and f.suffix != ".php"]
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(verify_file, files))
    status, _, body = public_get(domain, "/api/lead.php", 512)
    if status != 405 or json.loads(body) != {"ok": False, "error": "method_not_allowed"}:
        raise ValueError("The PHP endpoint did not return its expected GET response")
    path = "/syktyvkar/?utm_source=bv-check"
    status, headers, _ = public_get("www." + domain, path, 8192)
    if status not in (301, 308) or headers.get("Location") != "https://" + domain + path:
        raise ValueError("Unexpected www redirect for " + domain)
    print(f"Verified {len(files)} HTTPS files, PHP handler, Apache configuration and www redirect")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["preview", "prepare", "verify"])
    parser.add_argument("domain", choices=ACCOUNTS)
    args = parser.parse_args()
    if args.action == "prepare" and (os.environ.get("GITHUB_REF") != "refs/heads/main"
                                      or os.environ.get("DEPLOY_MODE") != "live"
                                      or os.environ.get("GITHUB_EVENT_NAME") not in ("push", "workflow_dispatch")):
        raise ValueError("Private writes require an approved live main deployment")
    host, path = os.environ["FTP_HOST"], os.environ["SITE_DIR"]
    check_directory(args.domain, host, path)
    if not all(os.environ.get(key) for key in ("FTP_HOST", "FTP_USER", "FTP_PASS")):
        raise ValueError("Incomplete FTPS credentials for " + args.domain)
    with ftplib.FTP_TLS(context=ssl.create_default_context(), timeout=30) as ftp:
        print("Opening verified FTPS connection for", args.domain, flush=True)
        ftp.connect(host, 21)
        ftp.login(os.environ["FTP_USER"], os.environ["FTP_PASS"])
        ftp.prot_p()
        print("Checking configured FTP root against the HTTPS site", flush=True)
        root = open_root(ftp, args.domain, path)
        if args.action == "verify":
            verify(ftp, args.domain)
        else:
            print("Checking adjacent private directory and PHP versions", flush=True)
            private_php(ftp, root, args.action == "prepare")
            if args.action == "preview":
                preview(ftp)


if __name__ == "__main__":
    try:
        main()
    except ftplib.all_errors + (ValueError, subprocess.CalledProcessError) as exc:
        # FTP replies can contain paths/usernames. Keep them out of Actions logs.
        if isinstance(exc, ValueError):
            sys.exit(str(exc))
        sys.exit(f"REG.RU check failed ({type(exc).__name__}). Check the selected host, access and paths.")
