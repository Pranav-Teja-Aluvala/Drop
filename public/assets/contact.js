const button=document.getElementById('copy-contact');
const status=document.getElementById('contact-status');
let timer;
button?.addEventListener('click',async()=>{
  button.disabled=true;status.textContent='Copying…';
  try{
    await navigator.clipboard.writeText(document.getElementById('support-address').textContent.trim());
    status.textContent='Email address copied.';button.textContent='Copied';
    clearTimeout(timer);timer=setTimeout(()=>{button.textContent='Copy email address';},2200);
  }catch{status.textContent='Copy was unavailable. Select the address to copy it, or open it in your email app.';}
  finally{button.disabled=false;}
});
window.addEventListener('pagehide',()=>clearTimeout(timer));
