import {useLayoutEffect,useRef} from 'react';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);
import {Brand} from './Brand';
import markup from './landing.html?raw';
import {deviceArtwork} from './deviceArtwork';
import {appendCursorAction, appendPhoneTap} from './walkthroughCursor';
const page=markup.replace(/<canvas id="journey-canvas"[^>]*><\/canvas>/,deviceArtwork('journey')).replace(/<img class="stage__fallback"[^>]*>/g,'');
export function Story(){const root=useRef<HTMLDivElement>(null);useLayoutEffect(()=>{const el=root.current!;const abort=new AbortController();const ctx=gsap.context(()=>{const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;const travel={p:0};const path=el.querySelector<SVGPathElement>('.motion-curve')!;const length=path.getTotalLength();const steps=[[0,0,'Create a temporary room.'],[1,0,'Open Camera on your phone.'],[1,1,'Scan the QR. Open Drop in your browser.'],[2,2,'Join the room. Check the name: WAVE.'],[2,3,'Compare the full security code on both devices.'],[3,4,'Choose a file on your laptop.'],[4,4,'Pick coastline.jpg in the file chooser.'],[5,5,'Send it. The recipient can accept or decline.'],[5,5,'Accept the file on your phone.'],[6,6,'Received. Save the file to Downloads.']] as const;
const flight=gsap.timeline({paused:true,repeat:reduced?0:-1,repeatDelay:5.5,repeatRefresh:true}).set('.moving-phone',{x:0,y:0,rotation:0,scale:1}).set('.film-cursor',{x:350,y:560,scale:.85,autoAlpha:reduced?0:1,svgOrigin:'0 0'}).set('.cursor-click,.phone-tap',{autoAlpha:0}).set('.film-stage',{autoAlpha:0}).set('.flying-card',{autoAlpha:0});
steps.forEach(([laptop,phone,caption],index)=>{
  flight.set('.film-stage',{autoAlpha:0})
    .set([`.laptop-${laptop}`,`.phone-${phone}`],{autoAlpha:1})
    .call(()=>{const label=el.querySelector('.film-caption');if(label)label.textContent=caption;});
  const actions: Partial<Record<number,string[]>> = {
    0:['.laptop-0 .film-button'],
    4:['.laptop-2 .film-button'],
    5:['.laptop-3 .film-button'],
    6:['.laptop-4 .film-file.selected','.laptop-4 .film-button'],
    7:['.laptop-5 .film-button'],
  };
  const controls=actions[index];
  if(controls){
    controls.forEach(selector=>appendCursorAction(flight,el,selector,reduced));
  }else{
    flight.to('.film-cursor',{autoAlpha:0,duration:reduced?0:.25});
  }
  const phoneTargets: Partial<Record<number,string>>={1:'.phone-0 .camera-app',3:'.phone-2 .film-button',4:'.phone-3 .film-button',8:'.phone-5 .film-button',9:'.phone-6 .film-button'};
  if(phoneTargets[index]) appendPhoneTap(flight,el,phoneTargets[index]!,reduced);
  if(index===1){flight.to('.moving-phone',{x:-310,y:-120,rotation:-12,scale:1.12,svgOrigin:'1312 560',duration:reduced?0:1.1,ease:'power3.inOut'});}
  if(index===3){flight.to('.moving-phone',{x:0,y:0,rotation:0,scale:1,duration:reduced?0:1.1,ease:'power3.inOut'});}
  if(index===2){flight.fromTo('.camera-view',{scale:.8},{scale:1,duration:reduced?0:.7,ease:'power2.out'}).fromTo('.scan-line',{y:-40},{y:40,duration:reduced?0:.8});}
  if(index===8){flight.set(travel,{p:0}).set('.flying-card',{autoAlpha:1}).to(travel,{p:1,duration:reduced?0:2,ease:'power2.inOut',onUpdate:()=>{const point=path.getPointAtLength(travel.p*length);gsap.set(el.querySelector('.flying-card'),{x:point.x-45,y:point.y-56,scale:.65,opacity:travel.p>.95?0:1});}});}
  flight.to({},{duration:reduced?0:index===4?2.5:1.5});
});
if(reduced){flight.progress(1).pause();const caption=el.querySelector('.film-caption');if(caption)caption.textContent='Received. Save the file to Downloads.';}else{
const trigger=ScrollTrigger.create({trigger:el.querySelector('#watch'),start:'top 65%',onEnter:()=>flight.play(),onLeave:()=>flight.pause(),onEnterBack:()=>flight.play(),onLeaveBack:()=>flight.pause()});abort.signal.addEventListener('abort',()=>trigger.kill());const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){flight.play();observer.disconnect();}},{threshold:.35});observer.observe(el.querySelector('#watch')!);abort.signal.addEventListener('abort',()=>observer.disconnect());}
const toggle=el.querySelector('.nav__toggle')!,menu=el.querySelector('.nav__menu')!;toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close menu':'Open menu');menu.classList.toggle('is-open',open);},{signal:abort.signal});menu.addEventListener('click',()=>{menu.classList.remove('is-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open menu');},{signal:abort.signal});el.addEventListener('keydown',event=>{if(event.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){menu.classList.remove('is-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open menu');(toggle as HTMLButtonElement).focus();}},{signal:abort.signal});if(!reduced)gsap.from('.line__in',{y:40,opacity:0,stagger:.1,duration:.8});},el);return()=>{abort.abort();gsap.killTweensOf(el.querySelector('.device-art'));ctx.revert();};},[]);return <div className="landing" ref={root} dangerouslySetInnerHTML={{__html:page}}/>;}
export function Closing(){return <div className="landing"><section id="privacy" className="section container privacy-band"><h2>Your space.<br/>Your say.</h2><div><h3>You approve the recipient</h3><p>Pair only the device you intended. You choose whether to accept each incoming file.</p><a href="/privacy.html">Read the privacy policy <span aria-hidden="true">↗</span></a></div><div><h3>Temporary by design</h3><p>Rooms last up to two hours. Keep both screens open; end your room when you’re finished.</p></div></section><section id="devices" className="container compatibility"><h2>Made for your next screen.</h2><p>Open Drop in a browser with WebRTC support. Pair two devices and keep both pages open while you send.</p></section><section className="container closing-cta"><h2>Send it to my other device.</h2><a href="/app" className="btn btn--primary">Start Dropping <span aria-hidden="true">↗</span></a></section><footer className="container closing-footer"><span>© 2026 Drop</span><nav aria-label="Footer"><a href="#how">How it works</a><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a><a href="/cookies.html">Cookies</a><a href="/privacy.html#choices">Contact</a></nav></footer></div>;}
export function NotFound(){return <main className="lost-page"><a href="/" aria-label="Drop home"><Brand/></a><div className="lost-file" aria-hidden="true">↗</div><p>404 / DESTINATION NOT FOUND</p><h1>This file took<br/>a wrong turn.</h1><p>Let’s get you back to your other device.</p><a className="button primary" href="/">Return home</a></main>}
