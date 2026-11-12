// Validate the files that will actually be archived, without printing their contents.
import assert from 'node:assert/strict'
import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve('dist')
const required = ['index.html', 'syktyvkar/index.html', 'privacy/index.html', 'api/lead.php',
  '.htaccess', 'robots.txt', 'favicon-32.png', 'apple-touch-icon.png', 'og-banivyatki.jpg']
for (const name of required) assert.ok((await stat(path.join(root, name))).isFile(), name)
const publicFiles = new Set([...required, 'photos/.gitkeep', 'sitemap.xml'])
const privateName = /(?:^|\/)(?:private|queue|log|logs|server|\.git|\.env[^/]*)(?:\/|$)|\.(?:bak|sql|log|old|zip|tar|gz|map)$|~$/i
const credential = /https?:\/\/[^\s/"']+\/rest\/\d+\/[A-Za-z0-9_-]{10,}\/|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/
let files = 0
async function checkDirectory(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    const name = path.relative(root, file).split(path.sep).join('/')
    assert.ok(!privateName.test(name) && !entry.isSymbolicLink(), 'Unexpected build entry: ' + name)
    if (entry.isDirectory()) await checkDirectory(file)
    else {
      assert.ok(publicFiles.has(name) || /^assets\/[\w.-]+\.(?:js|css)$/.test(name) || /^photos\/[\w.-]+\.webp$/.test(name), 'Unreviewed public file: ' + name)
      if (!/\.(webp|png|jpg)$/.test(name)) assert.ok(!credential.test(await readFile(file, 'utf8')), 'Private credential in ' + name)
      files++
    }
  }
}
await checkDirectory(root)
assert.deepEqual(await readFile(path.join(root, 'api/lead.php')), await readFile('public/api/lead.php'))
console.log(files + ' reviewed public build files; physical entries for both landings and privacy.')
