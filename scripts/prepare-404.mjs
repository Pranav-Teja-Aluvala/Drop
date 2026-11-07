import {readFileSync,writeFileSync} from 'node:fs';
const reference=readFileSync(new URL('./templates/error-page.html',import.meta.url),'utf8');
const logo=readFileSync(new URL('../public/drop-mark.svg',import.meta.url),'utf8').replace('<svg ','<svg aria-hidden="true" ');
let html=reference.replace(/(<a class="logo"[\s\S]*?)<svg[\s\S]*?<\/svg>/,(_,prefix)=>prefix+logo);
const script=html.match(/<script>([\s\S]*?)<\/script>/);
if(!script)throw new Error('User 404 interaction script is missing.');
// Keep the supplied artwork; use production-only connectivity behavior without
// preview controls. External code works with the existing script-src policy.
writeFileSync(new URL('../public/assets/not-found.js',import.meta.url),readFileSync(new URL('./error-page.js',import.meta.url),'utf8'));
html=html.replace(/  <!-- Preview switch:[\s\S]*?<\/div>/,'');
html=html.replace(/  \/\* ---------- preview switch ---------- \*\/[\s\S]*?(?=  \/\* ---------- keyframes)/,'');
html=html.replace(script[0],'<script src="/assets/not-found.js"></script>');
html=html.replace('</head>',`<meta name="robots" content="noindex"><meta name="description" content="This sharEEm page could not be found. Return to the homepage to learn about the app, or open a temporary room to connect your other device."><link rel="icon" href="/favicon.svg"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'self'"></head>`);
writeFileSync(new URL('../public/404.html',import.meta.url),html);
for(const kind of ['room-expired','connection-help']){
  const expired=kind==='room-expired';
  let page=html.replace('<body>',`<body data-error-kind="${kind}">`).replace(/<title>.*?<\/title>/,`<title>${expired?'Room ended':'Connection help'} — sharEEm</title>`).replace("Oops, that page isn't<br>in our plan.",expired?'This room has<br>said goodbye.':'Your next screen<br>is a little out of reach.').replace('404 / Destination not found',expired?'Room closed / Time for a new one':'Connection paused / Let’s find a route').replace('<a class="btn" id="btn" href="/">Return home</a>','<a class="btn" id="btn" href="/app">'+(expired?'Create a fresh room':'Try connecting again')+'</a>');
  page=page.replace('Sorry, the AI that built this site really sucks.',expired?'The invitation expired or the room ended. Start a fresh connection.':'A direct connection could not be established. Try both devices on the same Wi-Fi.').replace('psst… poke the card',expired?'Your saved files are still yours.':'Return to both pages, then try again.');
  writeFileSync(new URL(`../public/${kind}.html`,import.meta.url),page);
}
writeFileSync(new URL('../public/offline.html',import.meta.url),html.replace('<body>','<body class="offline" data-offline-fallback="true">').replace(/<title>.*?<\/title>/,'<title>No connection — sharEEm</title>').replace('404 / Destination not found','No signal / You are offline').replace("Oops, that page isn't<br>in our plan.",'Bestie, the wifi<br>left you on read.').replace('<a class="btn" id="btn" href="/">Return home</a>','<a class="btn" id="btn" href="">Try again, no cap</a>').replace('Sorry, the AI that built this site really sucks.',"No internet, no drop. It's giving 2009 dial-up.").replace('psst… poke the card','connect to the internet, then we vibe'));
console.log('Prepared the supplied 404 with the sharEEm mark and CSP-compatible script.');
