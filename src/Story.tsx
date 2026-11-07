import {useEffect,useRef,useState} from 'react';
import {DispatchArt} from './DispatchArt';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);
import {Brand} from './Brand';
import {ArrowUpRight,ArrowDown,Plus,ShieldCheck,Files} from 'lucide-react';

function RibbonField(){
  const canvas=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const el=canvas.current!,context=el.getContext('2d');if(!context)return;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse=matchMedia('(pointer: coarse)').matches;
    let width=0,height=0,frame=0,x=.7,y=.5,tx=.7,ty=.5,visible=true;
    const paint=()=>{context.clearRect(0,0,width,height);for(let i=0;i<8;i++){
      const offset=i*24;context.beginPath();context.moveTo(width*.43+offset,-40);
      context.bezierCurveTo(width*(.76+x*.13)+offset,height*.17,width*(.3+x*.12)+offset,height*(.61+y*.15),width*.9+offset,height+40);
      context.strokeStyle=i===3?'#b5a8cb':i===4?'#c3a16b':'#dce0e3';context.lineWidth=i===3||i===4?1.4:.8;context.stroke();
    }};
    const size=()=>{const r=el.getBoundingClientRect();width=r.width;height=r.height;el.width=width*Math.min(devicePixelRatio,2);el.height=height*Math.min(devicePixelRatio,2);context.setTransform(Math.min(devicePixelRatio,2),0,0,Math.min(devicePixelRatio,2),0,0);paint();};
    const move=(event:PointerEvent)=>{if(reduced||coarse)return;const r=el.getBoundingClientRect();tx=Math.min(1,Math.max(0,(event.clientX-r.left)/r.width));ty=Math.min(1,Math.max(0,(event.clientY-r.top)/r.height));if(!frame&&visible)frame=requestAnimationFrame(tick);};
    const tick=()=>{x+=(tx-x)*.07;y+=(ty-y)*.07;paint();frame=0;if(visible&&(Math.abs(tx-x)>.001||Math.abs(ty-y)>.001))frame=requestAnimationFrame(tick);};
    const observer=new ResizeObserver(size);observer.observe(el);const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible){cancelAnimationFrame(frame);frame=0;}});intersection.observe(el);
    window.addEventListener('pointermove',move,{passive:true});size();return()=>{observer.disconnect();intersection.disconnect();cancelAnimationFrame(frame);window.removeEventListener('pointermove',move);};
  },[]);
  return <canvas className="ribbon-field" ref={canvas} aria-hidden="true"/>;
}
export function Story(){
  const [menu,setMenu]=useState(false);
  const root=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const media=gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)',()=>{
      gsap.from('.headline-line > span',{yPercent:106,stagger:.09,duration:.78,ease:'power4.out'});
      const rows=root.current?.querySelectorAll('.v2-steps article') ?? [];
      for(const row of rows){
        gsap.from(row.querySelector('span'),{x:-12,duration:.55,scrollTrigger:{trigger:row,start:'top 92%',once:true}});
        gsap.from(row,{borderTopColor:'transparent',duration:.8,scrollTrigger:{trigger:row,start:'top 92%',once:true}});
      }
    },root);
    return ()=>media.revert();
  },[]);
  useEffect(()=>{if(!menu)return;const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setMenu(false);};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[menu]);
  return <div ref={root} className="landing v2-landing dispatch"><a className="skip" href="#main">Skip to content</a>
    <header className="nav"><div className="nav__in"><a href="/" aria-label="sharEEm home"><Brand/></a><nav id="v2-primary-navigation" className={menu?'v2-nav open':'v2-nav'} aria-label="Primary"><a href="#how" onClick={()=>setMenu(false)}>How it works</a><a href="#field-guide" onClick={()=>setMenu(false)}>Transfer guide</a><a href="/app" className="button primary">Open sharEEm <ArrowUpRight size={16}/></a></nav><button className="nav__toggle" aria-label={menu?'Close menu':'Open menu'} aria-expanded={menu} aria-controls="v2-primary-navigation" onClick={()=>setMenu(!menu)}>☰</button></div></header>
    <main id="main"><section className="v2-hero" id="meet"><RibbonField/><div className="container v2-hero-grid"><div className="v2-hero-copy"><h1 id="hero-title"><span className="headline-line"><span>Send it to</span></span> <span className="headline-line"><span>my <em>other</em></span></span> <span className="headline-line"><span>device.</span></span></h1><p className="v2-description">Move a photo to your laptop, a PDF to your phone, or a link to the screen where you need it. No account required.</p><div className="v2-hero-actions"><a className="button primary" href="/app">Start Dropping <ArrowUpRight size={18}/></a><a className="v2-how-link" href="#how">See how it works <ArrowDown size={16}/></a></div></div>
      <DispatchArt/></div></section>
    <section id="how" className="container v2-how"><div className="v2-section-heading"><h2>Pair your devices.</h2><p>Start on whichever device is already in your hand.</p></div><div className="v2-steps"><article><span>01 <Plus size={18}/></span><h3>Create a room</h3><p>Create a temporary room. Its private QR connects your next screen.</p></article><article><span>02 <ShieldCheck size={18}/></span><h3>Approve the device</h3><p>Match the six-letter name on both screens. Allow each new device once.</p></article><article><span>03 <Files size={18}/></span><h3>Choose a recipient</h3><p>Choose a connected device. Send any file type, or pick up a link or note.</p></article></div></section>
    <section id="field-guide" className="transfer-guide"><div className="container guide-layout">
      <div><h2>What are you sending?</h2><p>Pick an item for instructions.</p></div>
      <div className="guide-entries">
        <details open><summary>A file <span>Photos, PDFs, archives</span></summary><p>To take a boarding pass with you, select your phone in the room and browse for the PDF on your laptop. On your phone, accept the file and tap Save file. sharEEm takes any extension, one file at a time, up to 50 MB.</p></details>
        <details><summary>A link <span>Articles, maps, playlists</span></summary><p>Found a place on your laptop? Choose your phone as the recipient, paste the map link into Chat and send it. Copy the address on your phone and open it in your maps app.</p></details>
        <details><summary>A note <span>Addresses, lists, snippets</span></summary><p>Send a shopping list from your keyboard to your phone in Chat. Copy it into your notes before leaving the room. Each message can hold up to 50,000 characters.</p></details>
      </div></div></section>
    <section className="container v2-trust" id="privacy"><h2>Before you send</h2><div><h3>Keep both screens awake</h3><p>If you switch apps, return within ten minutes to reconnect while the page is still open. Send any interrupted file again. If your networks block the direct connection, try the same Wi-Fi.</p><a href="/connection-help.html">Connection help <ArrowUpRight size={16}/></a></div><div><h3>Save what you need</h3><p>Files travel over an encrypted connection between the devices. Rooms last up to two hours. Save downloads and copy important messages before you close the page.</p><a href="/privacy.html">How sharEEm handles your data <ArrowUpRight size={16}/></a></div></section>
    </main></div>;
}
export function Closing(){return <div className="landing v2-landing dispatch"><section className="container closing-cta"><h2>Have both devices handy?</h2><a href="/app" className="button primary">Start Dropping <ArrowUpRight size={18}/></a></section><footer className="container closing-footer"><span>© 2026 sharEEm</span><nav aria-label="Footer"><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a><a href="/cookies.html">Cookies & data</a><a href="/contact.html">Contact us</a></nav></footer></div>;}
export function NotFound(){return <main className="lost-page"><a href="/"><Brand/></a><h1>That page has moved away.</h1><a className="button primary" href="/">Return home</a></main>;}
