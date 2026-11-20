"""Destination, drift, partial failure and read-only invariants. No external I/O."""
import ftplib
from pathlib import Path, PurePosixPath
import tempfile
import unittest
from unittest.mock import patch

import reg_ru as deploy


class PrivateFTP:
    def __init__(self, data):
        self.data = dict(data)
        self.writes = []

    def voidcmd(self, cmd):
        assert cmd == "TYPE I"

    def size(self, name):
        assert name == "config.php"
        return 256

    def cwd(self, value):
        self.directory = value

    def pwd(self):
        return self.directory

    def retrbinary(self, cmd, receive):
        receive(self.data[cmd.removeprefix("RETR ")])

    def storbinary(self, cmd, stream):
        name = cmd.removeprefix("STOR ")
        self.writes.append(name)
        self.data[name] = stream.read()

    def rename(self, old, new):
        self.writes.append(new)
        self.data[new] = self.data.pop(old)

    def delete(self, name):
        self.writes.append(name)
        del self.data[name]


class DeployTest(unittest.TestCase):
    root = PurePosixPath("/www/bani-vyatki.ru")

    def setUp(self):
        self.current = {name: Path("server", name).read_bytes() for name in deploy.PHP_FILES}

    def test_root_and_account(self):
        for domain, host in [(deploy.PRIMARY, "configured-primary"), (deploy.MIRROR, "server38.hosting.reg.ru")]:
            deploy.check_directory(domain, host, "./www/" + domain + "/")
        for alias in ("./bani-vyatki.ru/", "/bani-vyatki.ru/", "bani-vyatki.ru/"):
            deploy.check_directory(deploy.MIRROR, "server38.hosting.reg.ru", alias)
        for host, path in [("wrong-host", "./www/bani-vyatki.ru/"),
                           ("server38.hosting.reg.ru", "./www/banivyatki.ru/"),
                           ("server38.hosting.reg.ru", "./www/../www/bani-vyatki.ru/"),
                           ("server38.hosting.reg.ru", "/var/www/u3717330/data/www/bani-vyatki.ru/")]:
            with self.assertRaises(ValueError):
                deploy.check_directory(deploy.MIRROR, host, path)

    def test_marker_must_match_https_and_ftp(self):
        ftp = PrivateFTP({deploy.MARKER: b"a" * 32})
        with patch.object(deploy, "public_get", return_value=(200, {}, b"b" * 32)):
            with self.assertRaisesRegex(ValueError, "marker differ"):
                deploy.open_root(ftp, deploy.MIRROR, str(self.root))
        with patch.object(deploy, "public_get", return_value=(200, {}, b"a" * 32)):
            self.assertEqual(deploy.open_root(ftp, deploy.MIRROR, str(self.root)), self.root)
            jailed_root = PurePosixPath("/", deploy.MIRROR)
            self.assertEqual(deploy.open_root(ftp, deploy.MIRROR, str(jailed_root)), jailed_root)
        self.assertEqual(ftp.writes, [])

    def test_preview_then_partial_failure_then_retry(self):
        old = b"previous reviewed source"
        ftp = PrivateFTP(dict.fromkeys(deploy.PHP_FILES, old))
        real_rename = ftp.rename

        def fail_second(tmp, name):
            if name == "retry.php":
                raise ftplib.error_temp("unavailable")
            real_rename(tmp, name)

        with patch.object(deploy, "known_hashes", return_value={deploy.digest(old)}):
            deploy.private_php(ftp, self.root, False)
            self.assertEqual(ftp.writes, [])
            with patch.object(ftp, "rename", side_effect=fail_second), self.assertRaises(ftplib.error_temp):
                deploy.private_php(ftp, self.root, True)
            self.assertEqual(ftp.data, {"lib.php": self.current["lib.php"], "retry.php": old})
            deploy.private_php(ftp, self.root, True)
        self.assertEqual(ftp.data, self.current)
        self.assertTrue(all(name in deploy.PHP_FILES or name.startswith(".bv-") for name in ftp.writes))

    def test_unknown_file_blocks_all_writes(self):
        ftp = PrivateFTP(dict.fromkeys(deploy.PHP_FILES, b"unreviewed"))
        with patch.object(deploy, "known_hashes", return_value=set()), self.assertRaises(ValueError):
            deploy.private_php(ftp, self.root, True)
        self.assertEqual(ftp.writes, [])

    def test_primary_success_does_not_swallow_secondary_error(self):
        primary = PrivateFTP(self.current)
        secondary = PrivateFTP(self.current)
        deploy.private_php(primary, self.root, True)
        with patch.object(secondary, "cwd", side_effect=ConnectionError), self.assertRaises(ConnectionError):
            deploy.private_php(secondary, self.root, True)
        self.assertEqual(primary.writes + secondary.writes, [])

    def test_public_preview_only_reads_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            dist = Path(tmp)
            (dist / "index.html").write_bytes(b"new")
            ftp = PrivateFTP({"index.html": b"previous"})
            with patch.object(deploy, "DIST", dist):
                deploy.preview(ftp)
            self.assertEqual(ftp.writes, [])

    def test_https_verification_detects_stale_release(self):
        with tempfile.TemporaryDirectory() as tmp:
            dist = Path(tmp)
            (dist / "api").mkdir()
            (dist / "syktyvkar").mkdir()
            (dist / "syktyvkar/index.html").write_bytes(b"region")
            ftp = PrivateFTP({".htaccess": b"rules", "api/lead.php": b"handler"})
            for name, content in ftp.data.items():
                (dist / name).write_bytes(content)

            def response(domain, path, limit):
                if domain.startswith("www."):
                    return 301, {"Location": "https://" + deploy.MIRROR + path}, b""
                if path.startswith("/syktyvkar/?"):
                    return 200, {}, b"region"
                self.assertEqual(path, "/api/lead.php")
                return 405, {}, b'{"ok":false,"error":"method_not_allowed"}'

            with patch.object(deploy, "DIST", dist), patch.object(deploy, "public_get", side_effect=response):
                deploy.verify(ftp, deploy.MIRROR)
                (dist / "syktyvkar/index.html").write_bytes(b"next release")
                with self.assertRaisesRegex(ValueError, "Public release mismatch"):
                    deploy.verify(ftp, deploy.MIRROR)
            self.assertEqual(ftp.writes, [])
