import {readFileSync,writeFileSync,existsSync} from 'node:fs';
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
writeFileSync('public/third-party-notices.txt',`DROP — Third-party notices\n\nThese notices apply to third-party runtime dependencies, not a license grant for Drop branding or project code. System fonts are used. The supplied branding and generated/project assets require their own provenance review.\n\n${sections.sort().join('\n\n'+'='.repeat(72)+'\n\n')}\n`);
console.log(`Collected ${sections.length} installed runtime dependency notices.`);
