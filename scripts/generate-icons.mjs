import {readFileSync,writeFileSync} from 'node:fs';
import {chromium} from '@playwright/test';
const mark=readFileSync(new URL('../public/drop-mark.svg',import.meta.url),'utf8');
const browser=await chromium.launch();
const pngs=[];
try {
  for(const [size,name] of [[16,'favicon-16.png'],[32,'favicon-32.png'],[180,'apple-touch-icon.png'],[192,'icon-192.png'],[512,'icon-512.png']]){
    const page=await browser.newPage({viewport:{width:size,height:size},deviceScaleFactor:1});
    await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;overflow:hidden}body{display:grid;place-items:center;${size>=180?'background:#fafaf8':''}}svg{width:76%;height:90%}</style>${mark}`);
    const bytes=await page.screenshot({omitBackground:size<180});writeFileSync(new URL('../public/'+name,import.meta.url),bytes);
    if(size<180)pngs.push({size,bytes});await page.close();
  }
}finally{await browser.close();}
const header=Buffer.alloc(6+16*pngs.length);header.writeUInt16LE(1,2);header.writeUInt16LE(pngs.length,4);let offset=header.length;
pngs.forEach(({size,bytes},i)=>{const p=6+i*16;header[p]=size;header[p+1]=size;header.writeUInt16LE(1,p+4);header.writeUInt16LE(32,p+6);header.writeUInt32LE(bytes.length,p+8);header.writeUInt32LE(offset,p+12);offset+=bytes.length;});
writeFileSync(new URL('../public/favicon.ico',import.meta.url),Buffer.concat([header,...pngs.map(p=>p.bytes)]));
console.log('Generated PNG, Apple touch and ICO icons from the existing Drop vector mark.');
