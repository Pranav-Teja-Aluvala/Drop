import fs from 'node:fs';
import postcss from 'postcss';
const read=p=>fs.readFileSync(p,'utf8');
const base='C:/Users/prana/.codex/attachments/';
let html=read(base+'44163dc7-f31e-4187-b47c-7e5018c33a6d/Pasted text.txt');
let css=read(base+'7a170f98-311f-4acf-9fe1-9f248158c805/Pasted text.txt');
fs.mkdirSync('design/claude',{recursive:true});
fs.writeFileSync('design/claude/original.html',html);fs.writeFileSync('design/claude/original.css',css);
html=html.split('<body data-page="home">')[1].split('</body>')[0];
html=html.replace(/<footer class="footer">[\s\S]*?<\/footer>/,'');
html=html.replace('<main id="main">','<div id="main">').replace('</main>','</div>');
html=html.replaceAll('assets/','/assets/');
html=html.replaceAll('86 MB','26 MB').replaceAll('3 devices','2 devices');
html=html.replace(/href="#pick"(>Start Dropping|>Start Dropping )/g,'href="#transfer"$1');
html=html.replace('href="#pick">Start Dropping','href="#transfer">Start Dropping');
html=html.replace(/<button class="btn btn--light"[^>]*>([\s\S]*?)<\/button>/,'<a class="btn btn--light" href="#transfer">Start Dropping <span aria-hidden="true">↗</span></a>');
const replacements={
'Select anything on your computer. Drop shows exactly what you’re about to send and where it’s going, with nothing else to configure.':'Pair two devices, compare their security codes, then choose a file. Your other device decides whether to accept it.',
'A live preview before you send':'Approve the device before connecting',
'Pick the device it should land on':'Compare the security code on both screens',
'One click, full quality, no compression':'Original files, up to 50 MB at a time',
'Try it: choose a file, choose a device, press send.':'Interactive illustration · choose a sample file and preview its journey. No files are sent here.',
'>Nearby<':'>Example devices<',
'Send to iPhone':'Preview transfer',
'Drop lifts the file out of your screen and carries it across. No cables, no inbox, no waiting around.':'A little illustration of the journey. In your room, progress follows the actual transfer, from acceptance to delivery.',
'sunrise.jpg is on your phone, ready to open. Full quality, exactly as you sent it.':'Once delivery is confirmed in your room, save the file on your other device. Original bytes, checked on arrival.',
'Received on iPhone':'Illustrated arrival',
'sunrise.jpg · 4.2 MB · 0.8 s':'sunrise.jpg · sample file',
'Laptop, tablet or phone: the interface adapts to the space it has, and your files are waiting wherever you look.':'Laptop, tablet or phone: open Drop in a supported browser. Pair two devices and keep both screens open while you send.',
'Instant by design':'A room, not an account',
'Files start moving the moment you choose them. No accounts to juggle and no cables to find.':'Create a temporary room and scan its QR code on your other device. No recipient signup.',
'Everything fits':'The everyday essentials',
'Photos, decks and 4K clips. Drop handles any file type at the size you actually work with.':'Send photos and documents up to 50 MB each, or notes up to 50,000 characters. Executable files are blocked.',
'Always in reach':'You stay in control',
'Laptop, tablet and phone share one calm place where everything you send simply arrives.':'Approve the device, compare security codes, and accept each file. End the room when you’re finished.',
'Laptop, tablet and phone. One quiet place for everything you send.':'Two devices. No signup. Keep both screens open.'};
for(const [a,b] of Object.entries(replacements))html=html.replaceAll(a,b);
html=html.replace('role="radiogroup"','role="group"').replaceAll('role="radio" aria-checked=','aria-pressed=');
fs.writeFileSync('src/landing.html',html);
const ast=postcss.parse(css);ast.walkRules(rule=>{if(rule.parent.type==='atrule' && /keyframes$/.test(rule.parent.name))return;rule.selectors=rule.selectors.map(s=>s===':root'||s==='body'||s==='html'?'.landing':':where(.landing) '+s);});
fs.writeFileSync('src/landing.css',ast.toString().replaceAll('url(assets/','url(/assets/'));
fs.mkdirSync('public/assets',{recursive:true});
const mark=read('public/drop-mark.svg');fs.writeFileSync('public/assets/logo-symbol.svg',mark);
for(const [name,color] of [['logo-full','#0A1330'],['logo-white','#ffffff']]) fs.writeFileSync(`public/assets/${name}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 310 120">${mark.replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 144">','<svg x="0" y="3" width="86" height="108" viewBox="0 0 120 144">')}<text x="103" y="87" fill="${color}" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="91" letter-spacing="-7">drop</text></svg>`);
const icons={'arrow-right':'M4 12h16m-6-6 6 6-6 6','arrow-down':'M12 4v16m-6-6 6 6 6-6','arrow-up':'M12 20V4m-6 6 6-6 6 6',check:'m5 12 4 4L19 6',menu:'M4 6h16M4 12h16M4 18h16',close:'m6 6 12 12M6 18 18 6',replay:'M4 10a8 8 0 1 1 0 5M4 4v6h6',phone:'M7 2h10v20H7zM10 18h4',tablet:'M4 2h16v20H4zM10 18h4',devices:'M3 3h13v12H3zM1 18h12M17 9h6v13h-6z',image:'M3 3h18v18H3zM3 17l6-6 4 4 3-3 5 5M7 7h1',doc:'M5 2h9l5 5v15H5zM14 2v6h5M8 12h8M8 16h6',video:'M3 5h13v14H3zM16 10l5-3v10l-5-3',zip:'M5 2h14v20H5zM12 2v12m-2 0h4v4h-4z',audio:'M5 9v6M9 5v14M13 2v20M17 6v12M21 10v4',layers:'m12 2 10 5-10 5L2 7zM2 12l10 5 10-5M2 17l10 5 10-5',bolt:'m13 2-9 12h7l-1 8 10-13h-7z',shield:'m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6zM8 11l3 3 5-6'};
fs.writeFileSync('public/assets/icons.svg',`<svg xmlns="http://www.w3.org/2000/svg">${Object.entries(icons).map(([id,d])=>`<symbol id="i-${id}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></symbol>`).join('')}</svg>`);
fs.writeFileSync('public/assets/photo-preview.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400"><defs><linearGradient id="s" x2="0" y2="1"><stop stop-color="#7c89e9"/><stop offset="1" stop-color="#f4b8aa"/></linearGradient></defs><path fill="url(#s)" d="M0 0h600v400H0z"/><circle cx="400" cy="130" r="50" fill="#ffecd6"/><path d="m0 290 140-160 170 160 120-90 170 110v90H0" fill="#7273bb"/><path d="m0 370 220-150 180 160 100-110 100 80v50H0" fill="#323f83"/></svg>');
