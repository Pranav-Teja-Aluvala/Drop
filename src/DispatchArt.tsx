import { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const editions = [
  { label: 'File', caption: 'coastline.jpg', ink: '#284c92', paper: '#e7edff' },
  { label: 'Link', caption: 'A saved address', ink: '#804326', paper: '#ffebd8' },
  { label: 'Note', caption: 'A note to yourself', ink: '#225949', paper: '#dff0de' },
];

function Coast() {
  // Fine parallel cuts form a sea surface like an engraved postage plate.
  return <>
    <circle cx="140" cy="64" r="30" fill="currentColor"/>
    <path d="M0 128 Q40 112 80 121 T154 118 Q184 111 210 119 L210 160 H0Z" fill="currentColor"/>
    {Array.from({ length: 14 }, (_, i) => <path key={i} d={`M-8 ${132+i*2.1} q32 -9 56 -3 t59 -1 t58 -2 t58 -2`} fill="none" stroke="var(--stamp-paper)" strokeWidth=".9"/>)}
    <path d="m0 123 30-10 12-13 23 3 8-10 23 4 23 20 29 5-43 7-61-3-44 8Z" fill="currentColor"/>
    <path d="m63 100 5-44h13l5 44Zm3-48 9-7 9 7Zm-1 3h20v3H65Z" fill="currentColor"/>
    <path d="M71 52v4m7-4v4m-8 13 10-3m-12 14 13-4" stroke="var(--stamp-paper)" strokeWidth="3"/>
    {Array.from({length:9},(_,i)=><path key={i} d={`M4 ${67+i*3.7}h${25+i*2}m70 -2h${17+i*2}`} stroke="currentColor" opacity=".38" strokeWidth=".7"/>)}
  </>;
}

function Stamp({ index }: { index: number }) {
  const { label, ink, paper } = editions[index];
  return <svg className="stamp" viewBox="0 0 250 243" aria-hidden="true" style={{color:ink,'--stamp-paper':paper} as React.CSSProperties}>
    <defs><mask id="perforations"><rect width="250" height="243" fill="white"/>
      {Array.from({length:16},(_,i)=><g key={i}><circle cx={i*16+5} cy="0" r="4"/><circle cx={i*16+5} cy="243" r="4"/><circle cx="0" cy={i*16+5} r="4"/><circle cx="250" cy={i*16+5} r="4"/></g>)}
    </mask><clipPath id="plate"><rect width="210" height="156"/></clipPath></defs>
    <rect width="250" height="243" fill={paper} mask="url(#perforations)"/>
    <rect x="13" y="13" width="224" height="217" stroke="currentColor" fill="none"/>
    <text x="21" y="36" fontFamily="Georgia,serif" fontSize="19" fontStyle="italic">sharEEm Post</text>
    <text x="229" y="34" textAnchor="end" fontFamily="monospace" fontSize="11">P2P</text>
    <g transform="translate(20 44)" clipPath="url(#plate)">
      <rect x=".5" y=".5" width="209" height="155" fill="none" stroke="currentColor" opacity=".6"/>
      {index===0?<Coast/>:index===1?<g fill="none" stroke="currentColor" transform="rotate(-33 105 78)">
        {[0,1,2,3,4].map(i=><g key={i} strokeWidth="1.5"><rect x={27+i*3} y={50+i*3} width={91-i*6} height={55-i*6} rx={27-i*3}/><rect x={92+i*3} y={50+i*3} width={91-i*6} height={55-i*6} rx={27-i*3}/></g>)}
      </g>:<g transform="rotate(-7 105 78)"><path d="M52 15h107v124l-15-6-12 6-11-5-13 5-12-5-13 5-12-5-19 5Z" stroke="currentColor" fill="none" strokeWidth="2"/>
      {[48,67,86,105].map(y=><path key={y} d={`M64 ${y}h81`} stroke="currentColor" opacity=".25"/>)}
      <path d="M68 77q27-54 23-32t-14 34q3-17 12-17t-1 12q5 2 14-13t-1 14q9-1 15-12t-2 12l17-6M68 98q35-8 63-5" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round"/></g>}
    </g>
    <text x="21" y="220" fontSize="11" fontFamily="monospace" letterSpacing="1.4">{label.toUpperCase()} POST</text>
    <text x="228" y="220" textAnchor="end" fontSize="13" fontFamily="monospace">D / 0{index+1}</text>
  </svg>;
}

export function DispatchArt() {
  const [index, setIndex] = useState(0);
  const sheet = useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{
    const media=gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)',()=>{
      const tl=gsap.timeline({defaults:{ease:'power3.out'}});
      tl.fromTo(sheet.current,{y:14,rotation:3},{y:0,rotation:0,duration:.64})
        .fromTo('.stamp',{rotation:-7,y:20},{rotation:0,y:0,duration:.7},0)
        .fromTo('.postmark',{scale:1.15,opacity:0},{scale:1,opacity:1,duration:.22},.34);
    }, sheet);
    return ()=>media.revert();
  },[index]);
  return <figure className="dispatch-art" data-edition={editions[index].label.toLowerCase()}>
    <div className="paper-stack"><div className="dispatch-sheet" ref={sheet}>
      <div className="postal-address"><span>FROM</span>This device<span>TO</span>My other device</div>
      <Stamp index={index}/>
      <svg className="postmark" viewBox="0 0 140 75" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="37" cy="37" r="32"/><circle cx="37" cy="37" r="26"/>{[20,30,40,50].map(y=><path key={y} d={`M62 ${y}c18-13 36 13 69 0`}/>)}</g><text x="37" y="42" textAnchor="middle" fill="currentColor" fontFamily="monospace" fontSize="14">sharEEm</text></svg>
    </div></div>
    <figcaption><div role="group" aria-label="Choose an illustration">{editions.map((edition,i)=><button key={edition.label} type="button" aria-pressed={index===i} onClick={()=>setIndex(i)}>{edition.label}</button>)}</div><span aria-live="polite">{editions[index].caption}</span></figcaption>
  </figure>;
}
