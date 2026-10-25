const stages=(side:string,items:string[])=>items.map((content,i)=>`<div class="film-stage ${side}-${i}">${content}</div>`).join('');
export function deviceArtwork(id:string){
const button=(s:string)=>`<b class="film-button">${s}</b>`;
const room='<p>Room <strong>WAVE</strong></p>';
const code='<code>8A2F 4B19 6D30 91EC<br/>7C42 0A65 EF12 39B8</code>';
const laptop=stages('laptop',[
'<h3>Connect your other device</h3><p>A temporary room for your two screens.</p>'+button('Create a room'),
'<h3>Scan with your phone camera</h3><img class="film-qr" src="/assets/walkthrough-qr.svg" alt=""/>'+room,
'<h3>Same code. Right device.</h3>'+room+code+button('Codes match'),
'<h3>You’re connected.</h3><p>Choose something to send.</p>'+button('Choose files'),
'<h3>Choose a file</h3><div class="film-file selected">▧ coastline.jpg <small>2.4 MB</small></div><div class="film-file">▤ notes.pdf <small>480 KB</small></div>'+button('Open'),
'<h3>Ready to send</h3><div class="film-file selected">▧ coastline.jpg <small>2.4 MB</small></div>'+button('Send file')+'<p>Waiting for the receiving device.</p>',
'<h3>Delivered.</h3><p>coastline.jpg · File integrity checked</p><span class="arrival-check">✓</span>'
]);
const phone=stages('phone',[
'<div class="film-clock">09:41</div><p>Your other device.</p><div class="camera-app">◉</div><b>Camera</b>',
'<div class="camera-view"><img src="/assets/walkthrough-qr.svg" alt=""/><div class="scan-line"></div></div><h3>QR detected</h3><p>Open Drop ↗</p><span class="camera-shutter"></span>',
'<h3>Join this room?</h3>'+room+button('Join'),
'<h3>Same room.<br/>Right device.</h3>'+room+code+button('Codes match'),
'<h3>Connected.</h3><p>Ready when you are.</p><small>● Device connected</small>',
'<h3>Incoming file</h3><p>coastline.jpg<br/>2.4 MB</p>'+button('Accept file')+'<p>Decline file</p>',
'<span class="arrival-check">✓</span><h3>File received.</h3><p>coastline.jpg</p>'+button('Save file ↓')+'<p>Saved to Downloads</p>'
]);
return `<div class="device-art photographic-art" aria-hidden="true"><svg viewBox="0 0 1536 1024" fill="none"><defs><clipPath id="${id}-phone-crop"><rect x="1200" y="325" width="224" height="469" rx="35"/></clipPath><filter id="${id}-feather"><feGaussianBlur stdDeviation="15"/></filter><mask id="${id}-base"><rect width="1536" height="1024" fill="white"/><rect x="1180" y="300" width="275" height="515" rx="40" fill="black" filter="url(#${id}-feather)"/></mask></defs><image href="/assets/device-studio.webp" width="1536" height="1024" mask="url(#${id}-base)"/><foreignObject x="194" y="202" width="774" height="430"><div xmlns="http://www.w3.org/1999/xhtml" class="film-ui film-laptop"><div class="film-bar"><span>Demo</span></div>${laptop}</div></foreignObject><g class="moving-phone"><image href="/assets/device-studio.webp" width="1536" height="1024" clip-path="url(#${id}-phone-crop)"/><foreignObject x="1215" y="365" width="194" height="405"><div xmlns="http://www.w3.org/1999/xhtml" class="film-ui film-phone">${phone}</div></foreignObject><circle class="phone-tap" cx="0" cy="0" r="16" fill="#e9ebff80" stroke="#6067da" stroke-width="2" opacity="0"/></g><path class="motion-curve" d="M580 420C750 180 1120 180 1312 540"/><circle class="cursor-click" cx="0" cy="0" r="16" fill="#e9ebff80" stroke="#6067da" stroke-width="2" opacity="0"/><path class="film-cursor" d="m0 0 4 26 7-8 8 11 5-3-8-11 10-2Z" fill="white" stroke="#14203b" stroke-width="1.5"/><g class="flying-card"><rect width="90" height="112" rx="10" fill="white" stroke="#6067da"/><path d="M22 20h30l16 16v43H22Z" stroke="#6067da" stroke-width="2"/></g></svg><span class="scene-caption">Demo</span></div>`;}
