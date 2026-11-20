#!/usr/bin/env bash
# Exercise the artifact's real .htaccess on loopback, including query strings.
set -euo pipefail
work=$(mktemp -d)
trap 'if [[ -n ${apache_pid:-} ]]; then kill "$apache_pid" 2>/dev/null || true; fi; rm -rf "$work"' EXIT
chmod 755 "$work"
cp -R dist "$work/site"
cat > "$work/apache.conf" <<EOF
ServerRoot "$work"
ServerName localhost
Listen 127.0.0.1:18380
PidFile "$work/pid"
ErrorLog "$work/error.log"
DefaultRuntimeDir "$work"
LoadModule mpm_event_module /usr/lib/apache2/modules/mod_mpm_event.so
LoadModule authz_core_module /usr/lib/apache2/modules/mod_authz_core.so
LoadModule dir_module /usr/lib/apache2/modules/mod_dir.so
LoadModule rewrite_module /usr/lib/apache2/modules/mod_rewrite.so
LoadModule headers_module /usr/lib/apache2/modules/mod_headers.so
User $(id -un)
Group $(id -gn)
DocumentRoot "$work/site"
DirectoryIndex index.html
<Directory "$work/site">
  Options FollowSymLinks
  AllowOverride All
  Require all granted
</Directory>
EOF
/usr/sbin/apache2 -t -f "$work/apache.conf"
/usr/sbin/apache2 -X -f "$work/apache.conf" &
apache_pid=$!
url=http://127.0.0.1:18380
for host in banivyatki.ru bani-vyatki.ru; do
  for page in / /syktyvkar/ /privacy/; do
    result=$(curl --retry 5 --retry-connrefused --noproxy '*' -fsS -H "Host: $host" -o "$work/response" -w '%{http_code}' "$url$page")
    test "$result" = 200
    cmp "dist${page}index.html" "$work/response"
    result=$(curl --noproxy '*' -sS -H "Host: www.$host" -o /dev/null -w '%{http_code} %{redirect_url}' "$url${page}?utm_source=ci")
    test "$result" = "301 https://$host${page}?utm_source=ci"
  done
done
echo "Apache: 6 page hashes and 6 www redirects passed."
