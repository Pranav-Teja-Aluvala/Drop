import { useEffect, useRef } from 'react';

const reedWidth = 18;
const reeds = Array.from({ length: 86 }, (_, i) => {
  const x = i * reedWidth;
  // Each rib refracts a different slice of the same curved light source.
  const crest = 565 - 98 * Math.sin(x / 170) + 67 * Math.cos(x / 96) - x * .14;
  const depth = 125 + 68 * Math.sin(x / 185 + 1);
  return { x, crest, depth, id: 'glass-rib-' + i };
});

export function ReededGlass() {
  const light = useRef<SVGGElement>(null);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: no-preference) and (hover:hover) and (pointer:fine)');
    let frame = 0, x = 0, y = 0, toX = 0, toY = 0;
    function paint() {
      x += (toX-x)*.14; y += (toY-y)*.14;
      light.current?.setAttribute('transform', `translate(${x} ${y})`);
      frame = Math.abs(toX-x)+Math.abs(toY-y)>.1 ? requestAnimationFrame(paint) : 0;
    }
    function aim(a:number,b:number) {
      toX=a; toY=b;
      if (!frame) frame=requestAnimationFrame(paint);
    }
    function move(e:PointerEvent) {
      if(media.matches && e.pointerType==='mouse') aim((e.clientX/innerWidth-.5)*42,(e.clientY/innerHeight-.5)*58);
    }
    function leave(){if(media.matches)aim(0,0);}
    function reset(){cancelAnimationFrame(frame);frame=x=y=toX=toY=0;light.current?.removeAttribute('transform');}
    window.addEventListener('pointermove',move,{passive:true});
    document.documentElement.addEventListener('pointerleave',leave);
    media.addEventListener('change',reset);
    return ()=>{reset();window.removeEventListener('pointermove',move);document.documentElement.removeEventListener('pointerleave',leave);media.removeEventListener('change',reset);};
  },[]);
  return <svg className="reeded-glass" viewBox="0 0 1440 800" preserveAspectRatio="xMinYMid slice" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="glass-spectrum" x1="0" y1="0" x2=".32" y2="1">
        <stop stopColor="#101526"/><stop offset=".15" stopColor="#192648"/>
        <stop offset=".31" stopColor="#1243ff"/><stop offset=".40" stopColor="#25d6ed"/>
        <stop offset=".455" stopColor="#eeeaff"/><stop offset=".48" stopColor="#bc9bff"/>
        <stop offset=".51" stopColor="#ad87ff"/><stop offset=".57" stopColor="#503cd6"/>
        <stop offset=".70" stopColor="#25264d"/><stop offset="1" stopColor="#101526"/>
      </linearGradient>
      <linearGradient id="glass-edge"><stop stopColor="#fff" stopOpacity=".12"/><stop offset=".13" stopColor="#fff" stopOpacity="0"/><stop offset=".8" stopOpacity="0"/><stop offset="1" stopOpacity=".28"/></linearGradient>
      <pattern id="glass-reeds" width={reedWidth} height="20" patternUnits="userSpaceOnUse"><rect width={reedWidth} height="20" fill="url(#glass-edge)"/></pattern>
    </defs>
    <g ref={light}><g className="glass-light">
      {reeds.map(({x,crest,depth,id}, index)=><rect key={id} className="glass-reflection" style={{animationDelay: `-${index * .064}s`}} x={x-48} y={crest-depth} width={reedWidth+.15} height={depth*2} fill="url(#glass-spectrum)"/>)}
      <rect x="-48" width="1548" height="900" fill="url(#glass-reeds)"/>
    </g></g>
  </svg>;
}
