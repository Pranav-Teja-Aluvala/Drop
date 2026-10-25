import {readFileSync,writeFileSync} from 'node:fs';
const reference=readFileSync(new URL('../design/user-404.html',import.meta.url),'utf8');
const logo=readFileSync(new URL('../public/drop-mark.svg',import.meta.url),'utf8').replace('<svg ','<svg aria-hidden="true" ');
let html=reference.replace(/(<a class="logo"[\s\S]*?)<svg[\s\S]*?<\/svg>/,(_,prefix)=>prefix+logo);
const script=html.match(/<script>([\s\S]*?)<\/script>/);
if(!script)throw new Error('User 404 interaction script is missing.');
// Preserve the supplied code and styles. An external script works with the
// existing script-src 'self' policy on both Vercel and the Node preview server.
writeFileSync(new URL('../public/assets/not-found.js',import.meta.url),script[1]);
html=html.replace(script[0],'<script src="/assets/not-found.js"></script>');
html=html.replace('</head>',`<meta name="robots" content="noindex"><meta name="description" content="This Drop page could not be found. Return to the homepage to learn about the app, or open a temporary room to connect your other device."><link rel="icon" href="/favicon.svg"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'self'"></head>`);
writeFileSync(new URL('../public/404.html',import.meta.url),html);
console.log('Prepared the supplied 404 with the Drop mark and CSP-compatible script.');
