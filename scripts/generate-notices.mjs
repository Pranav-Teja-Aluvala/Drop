import {readFileSync,writeFileSync,existsSync,mkdirSync,copyFileSync} from 'node:fs';
import {join} from 'node:path';
const lock=JSON.parse(readFileSync('package-lock.json','utf8'));
const sections=[];
for(const [location,entry] of Object.entries(lock.packages||{})){
  if(!location.startsWith('node_modules/')||entry.dev)continue;
  const pkgPath=join(location,'package.json');if(!existsSync(pkgPath))continue;
  const pkg=JSON.parse(readFileSync(pkgPath,'utf8'));
  const license=['LICENSE','LICENSE.md','LICENSE.txt','license','license.md','COPYING'].map(name=>join(location,name)).find(existsSync);
  sections.push(`${pkg.name} ${pkg.version}\nLicense: ${typeof pkg.license==='string'?pkg.license:entry.license||'See package distribution'}\n${license?readFileSync(license,'utf8'):'See the license included in the upstream package distribution.'}`);
}
sections.sort();
const introduction = 'Copyright and license notices for software used by shareEm.';
const escapeHtml = value => value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const notices = sections.map(section => {
  const [name, license, ...body] = section.split('\n');
  return `<details><summary>${escapeHtml(name)} <small>${escapeHtml(license)}</small></summary><pre>${escapeHtml(body.join('\n'))}</pre></details>`;
});
writeFileSync('public/licenses.txt', `shareEm — Third-party notices\n\n${introduction}\n\n${sections.join('\n\n'+'='.repeat(72)+'\n\n')}\n`);
writeFileSync('public/third-party-notices.html', `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Third-party notices — shareEm</title><meta name="description" content="${introduction}"><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/assets/legal.css"></head>
<body class="notices-page"><header><a href="/"><img src="/assets/logo-full.svg" alt="shareEm"></a><a href="/app">Open shareEm ↗</a></header>
<main class="legal-v2"><div class="breadcrumbs"><a href="/">Home</a> / Notices</div><h1>Third-party notices</h1>
<p>${introduction} Select a package to read its terms.</p><p><a href="/licenses.txt" download>Download all notices as text</a></p>
${notices.join('\n')}</main><footer>© 2026 shareEm · <a href="/terms.html">Terms</a> · <a href="/contact.html">Contact</a></footer></body></html>`);
console.log(`Collected ${sections.length} installed runtime dependency notices.`);
// Keep bookmarks to the original notice address usable on static hosts.
mkdirSync('public/third-party-notices.txt',{recursive:true});
copyFileSync('public/third-party-notices.html','public/third-party-notices.txt/index.html');
