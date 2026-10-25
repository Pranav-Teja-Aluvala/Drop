import {readFileSync,writeFileSync} from 'node:fs';
const reference=readFileSync(new URL('../design/user-404.html',import.meta.url),'utf8');
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
html=html.replace('</head>',`<meta name="robots" content="noindex"><meta name="description" content="This Drop page could not be found. Return to the homepage to learn about the app, or open a temporary room to connect your other device."><link rel="icon" href="/favicon.svg"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'self'"></head>`);
writeFileSync(new URL('../public/404.html',import.meta.url),html);
writeFileSync(new URL('../public/offline.html',import.meta.url),html.replace('<body>','<body class="offline" data-offline-fallback="true">').replace(/<title>.*?<\/title>/,'<title>No connection — Drop</title>').replace('404 / Destination not found','No signal / You are offline').replace("Oops, that page isn't<br>in our plan.",'Bestie, the wifi<br>left you on read.').replace('Return home</a>','Try again, no cap</a>').replace('Sorry, the AI that built this site really sucks.',"No internet, no drop. It's giving 2009 dial-up.").replace('psst… poke the card','connect to the internet, then we vibe'));
console.log('Prepared the supplied 404 with the Drop mark and CSP-compatible script.');
