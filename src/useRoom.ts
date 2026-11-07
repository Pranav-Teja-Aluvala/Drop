import {useEffect,useRef,useState} from 'react';
import {Transfer,type Item} from './transfer';
export type Status='idle'|'creating'|'waiting'|'approval'|'connecting'|'connected'|'recovering'|'closed';
type Member={id:string;label:string;online:boolean;awayUntil:number};
type Request={id:string;label:string;requestId:string};
type Link={id:string;peerId:string;label:string;pc:RTCPeerConnection;transfer?:Transfer;channel?:RTCDataChannel;timer?:ReturnType<typeof setTimeout>;candidates:RTCIceCandidateInit[];chain:Promise<void>};
type Session={id:string;memberId:string;token:string;expires:number;role:string};
const GRACE=600000;
const SESSION_KEY='drop.room.v2';
function clearReturn(){try{sessionStorage.removeItem(SESSION_KEY);}catch{/* Storage may be disabled. */}}
function saveReturn(session:Session,invite:string,deadline:number){
  try{sessionStorage.setItem(SESSION_KEY,JSON.stringify({session,invite,deadline}));}catch{/* In-memory recovery remains available. */}
}
function readReturn():{session:Session;invite:string;deadline:number}|null{
  try{
    const saved=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');
    const s=saved?.session;
    if(s && ['id','memberId','token'].every(k=>typeof s[k]==='string' && /^[A-Za-z0-9_-]{43}$/.test(s[k])) &&
      s.expires>Date.now() && (!saved.deadline || saved.deadline>Date.now()))return saved;
  }catch{/* Ignore malformed or inaccessible state. */}
  clearReturn();return null;
}
export function useRoom(){
  const [status,setStatus]=useState<Status>('idle'),[joining,setJoining]=useState(()=>!!location.hash),[invite,setInvite]=useState(''),[nickname,setNickname]=useState(''),[expires,setExpires]=useState(0),[error,setError]=useState('');
  const [members,setMembers]=useState<Member[]>([]),[requests,setRequests]=useState<Request[]>([]),[role,setRole]=useState(''),[selfId,setSelfId]=useState(''),[target,setTarget]=useState(''),[readyIds,setReadyIds]=useState<string[]>([]),[awayUntil,setAwayUntil]=useState(0);
  const [items,setItems]=useState<Item[]>([]),[offers,setOffers]=useState<Record<string,{name:string;size:number}>>({}),[fileCounts,setFileCounts]=useState({sent:0,received:0});
  const inviteRef=useRef('');
  const retryAttempt=useRef(0);
  const socket=useRef<WebSocket|null>(null),session=useRef<Session|null>(null),links=useRef(new Map<string,Link>()),retired=useRef<Transfer[]>([]),gen=useRef(0),approved=useRef(false),retry=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),background=useRef(0),backgroundTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),disconnectedAt=useRef(0),busy=useRef(false),ended=useRef(false),memberRef=useRef<Member[]>([]);
  function signal(data:object){if(socket.current?.readyState===WebSocket.OPEN)socket.current.send(JSON.stringify(data));}
  function refresh(){const ids=[...links.current.values()].filter(l=>l.channel?.readyState==='open'&&l.transfer&&l.pc.connectionState==='connected').map(l=>l.peerId);setReadyIds(ids);setTarget(prev=>ids.includes(prev)?prev:ids[0]||'');if(approved.current)setStatus(ids.length?'connected':'waiting');}
  function dropLink(id:string){const l=links.current.get(id);if(!l)return;links.current.delete(id);clearTimeout(l.timer);if(l.transfer){l.transfer.dispose();retired.current.push(l.transfer);}l.pc.onconnectionstatechange=null;l.pc.onicecandidate=null;l.pc.ondatachannel=null;l.pc.close();setOffers(prev=>{const next={...prev};delete next[id];return next;});refresh();}
  function cleanup(release=false){clearTimeout(retry.current);clearTimeout(backgroundTimer.current);for(const id of [...links.current.keys()])dropLink(id);if(socket.current){socket.current.onclose=null;socket.current.onmessage=null;socket.current.close();socket.current=null;}if(release){for(const t of retired.current)t.releaseDownloads();retired.current=[];}setReadyIds([]);setOffers({});busy.current=false;}
  function end(message=''){clearReturn();ended.current=true;++gen.current;approved.current=false;cleanup();session.current=null;background.current=0;setAwayUntil(0);setInvite('');setRequests([]);setMembers([]);setStatus('closed');setError(message);}
  function updateItem(peerId:string,label:string,item:Item){
    const value={...item,id:peerId+':'+item.id,peerId,peerLabel:label,createdAt:Date.now()};
    setItems(prev=>{const old=prev.find(i=>i.id===value.id);value.createdAt=old?.createdAt||value.createdAt;const all=[value,...prev.filter(i=>i.id!==value.id)];return [...all.filter(i=>i.text===undefined).slice(0,40),...all.filter(i=>i.text!==undefined).slice(0,200)].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));});
    if(item.text===undefined&&['Delivered','Received'].includes(item.status)){const key=item.direction==='out'?'sent':'received';setFileCounts(p=>({...p,[key]:p[key]+1}));}
  }
  function attach(l:Link,channel:RTCDataChannel){
    if(l.channel){channel.close();return;}l.channel=channel;
    channel.onopen=()=>{
      if(links.current.get(l.peerId)!==l||!approved.current){channel.close();return;}
      clearTimeout(l.timer);
      l.transfer=new Transfer(channel,{item:item=>updateItem(l.peerId,l.label,item),offer:value=>setOffers(prev=>{const next={...prev};if(value)next[l.peerId]=value;else delete next[l.peerId];return next;}),error:setError});refresh();setError('');
    };
    channel.onclose=()=>{if(links.current.get(l.peerId)===l){dropLink(l.peerId);if(!ended.current)setError('A device paused its connection. Return to Drop there, or choose Reconnect devices.');}};
  }
  async function setup(msg:any){
    dropLink(msg.peerId);const pc=new RTCPeerConnection({iceServers:msg.iceServers});
    const l:Link={id:msg.linkId,peerId:msg.peerId,label:msg.label,pc,candidates:[],chain:Promise.resolve()};links.current.set(l.peerId,l);
    const current=()=>links.current.get(l.peerId)===l;
    pc.onicecandidate=e=>{if(current()&&e.candidate)signal({type:'signal',to:l.peerId,linkId:l.id,signal:{candidate:e.candidate.toJSON()}});};
    pc.ondatachannel=e=>{if(current())attach(l,e.channel);};
    pc.onconnectionstatechange=()=>{if(!current())return;if(pc.connectionState==='failed'){dropLink(l.peerId);setError('No network route to that device. Try the same Wi-Fi. A relay is not enabled.');}else if(pc.connectionState==='connected'||pc.connectionState==='disconnected')refresh();};
    l.timer=setTimeout(()=>{if(current()&&!l.transfer){dropLink(l.peerId);setError('That device could not connect. Try the same Wi-Fi, then Reconnect devices.');}},45000);
    if(msg.initiator){attach(l,pc.createDataChannel('drop-v2',{ordered:true}));await pc.setLocalDescription(await pc.createOffer());if(current())signal({type:'signal',to:l.peerId,linkId:l.id,signal:{description:pc.localDescription}});}
  }
  function visibility(){
    if(!session.current)return;
    if(background.current&&Date.now()>=background.current){signal({type:'leave'});end('You were away for 10 minutes. Open a new room to continue.');return;}
    const hidden=document.visibilityState==='hidden';
    if(hidden&&!background.current){background.current=Date.now()+GRACE;setAwayUntil(background.current);clearTimeout(backgroundTimer.current);backgroundTimer.current=setTimeout(()=>{signal({type:'leave'});end('You were away for 10 minutes. Open a new room to continue.');},GRACE);}
    else if(!hidden){background.current=0;setAwayUntil(0);clearTimeout(backgroundTimer.current);if(!socket.current||socket.current.readyState>1)resume();else if(memberRef.current.some(m=>m.id!==session.current?.memberId&&m.online&&(!links.current.get(m.id)?.transfer||links.current.get(m.id)?.pc.connectionState!=='connected')))signal({type:'retry'});}
    if(approved.current)saveReturn(session.current,inviteRef.current,background.current);
    signal({type:'visibility',hidden});
  }
  function connect(credentials:{id:string;token:string;memberId?:string},generation:number){
    const endpoint=new URL(import.meta.env.VITE_SIGNAL_ORIGIN||location.origin);const ws=new WebSocket(`${endpoint.protocol==='https:'?'wss:':'ws:'}//${endpoint.host}/signal-v2`);socket.current=ws;
    const authTimer=setTimeout(()=>{if(socket.current===ws&&ws.readyState!==WebSocket.OPEN)ws.close();},25000);
    ws.onopen=()=>{clearTimeout(authTimer);if(gen.current!==generation){ws.close();return;}ws.send(JSON.stringify({type:'join',...credentials}));};
    let chain=Promise.resolve();
    ws.onmessage=event=>{chain=chain.then(async()=>{
      if(gen.current!==generation||socket.current!==ws)return;const msg=JSON.parse(event.data);
      if(msg.type==='joined'){
        session.current={id:credentials.id,memberId:msg.memberId,token:msg.credential,expires:msg.expires,role:msg.role};disconnectedAt.current=0;retryAttempt.current=0;approved.current=msg.approved;if(msg.approved)saveReturn(session.current,inviteRef.current,background.current);setRole(msg.role);setSelfId(msg.memberId);setNickname(msg.nickname);setExpires(msg.expires);setMembers(msg.members);memberRef.current=msg.members;setStatus(msg.approved?'waiting':'approval');busy.current=false;setError('');signal({type:'visibility',hidden:document.visibilityState==='hidden'});if(document.visibilityState==='hidden')visibility();
      }else if(msg.type==='members'){setMembers(msg.members);memberRef.current=msg.members;}
      else if(msg.type==='requests')setRequests(msg.requests);
      else if(msg.type==='approved'){approved.current=true;if(session.current)saveReturn(session.current,inviteRef.current,background.current);setStatus('connecting');}
      else if(msg.type==='link'){if(!approved.current)throw Error('Unapproved connection');await setup(msg);}
      else if(msg.type==='signal'){
        const l=links.current.get(msg.from);if(!l||l.id!==msg.linkId)return;
        const s=msg.signal;if(s.description){if(l.pc.remoteDescription)return;await l.pc.setRemoteDescription(s.description);for(const c of l.candidates)await l.pc.addIceCandidate(c);l.candidates=[];if(s.description.type==='offer'){await l.pc.setLocalDescription(await l.pc.createAnswer());signal({type:'signal',to:l.peerId,linkId:l.id,signal:{description:l.pc.localDescription}});}}
        else if(s.candidate){if(l.pc.remoteDescription)await l.pc.addIceCandidate(s.candidate);else if(l.candidates.length<256)l.candidates.push(s.candidate);}
      }else if(msg.type==='peer-away'||msg.type==='peer-left')dropLink(msg.peerId);
      else if(msg.type==='closed')end(msg.reason);
      else if(msg.type==='notice')setError(msg.message);
    }).catch(()=>{if(gen.current===generation)setError('A connection could not be prepared. Choose Reconnect devices.');});};
    ws.onerror=()=>{};
    ws.onclose=()=>{
      clearTimeout(authTimer);if(gen.current!==generation||ended.current||socket.current!==ws)return;socket.current=null;busy.current=false;
      if(!session.current||!approved.current){end('The connection paused before approval. Scan a fresh invitation.');return;}
      for(const id of [...links.current.keys()])dropLink(id);setStatus('recovering');
      if(!disconnectedAt.current)disconnectedAt.current=Date.now();
      clearTimeout(retry.current);retry.current=setTimeout(resume,Math.min(30000,2000*2**Math.min(4,retryAttempt.current++)));
    };
  }
  function resume(){
    if(ended.current||!session.current)return;
    if(Date.now()>=session.current.expires||(background.current&&Date.now()>=background.current)||(disconnectedAt.current&&Date.now()-disconnectedAt.current>=GRACE)){end('Your return window expired. Create a new room.');return;}
    if(document.visibilityState==='hidden'){retry.current=setTimeout(resume,5000);return;}
    if(socket.current&&socket.current.readyState<2)return;
    setStatus('recovering');connect({id:session.current.id,token:session.current.token,memberId:session.current.memberId},gen.current);
  }
  function reset(){clearReturn();inviteRef.current='';signal({type:'leave'});++gen.current;approved.current=false;cleanup(true);session.current=null;ended.current=false;background.current=0;disconnectedAt.current=0;setAwayUntil(0);setItems([]);setFileCounts({sent:0,received:0});setError('');setRequests([]);setMembers([]);setTarget('');setRole('');setNickname('');setInvite('');setExpires(0);}
  async function create(){if(busy.current)return;reset();setJoining(false);setStatus('creating');busy.current=true;const generation=gen.current;
    try{const response=await fetch(`${import.meta.env.VITE_SIGNAL_ORIGIN||''}/api/v2/rooms`,{method:'POST',credentials:'omit',signal:AbortSignal.timeout(75000)});let data;try{data=await response.json();}catch{throw Error('The pairing service is waking up. Try again shortly.');}if(!response.ok)throw Error(data.error||'Could not open a room.');if(gen.current!==generation)return;inviteRef.current=`${location.origin}/app#${data.id}.${data.invite}`;setInvite(inviteRef.current);connect({id:data.id,memberId:data.memberId,token:data.owner},generation);}catch(e){if(gen.current===generation)end(e instanceof Error?e.message:'Could not open the room.');}}
  function join(value:string){let url;try{url=new URL(value);}catch{setError('Paste the complete invitation link.');return;}if(url.origin!==location.origin||!/^#[\w-]{43}\.[\w-]{43}$/.test(url.hash)){setError('Use an invitation from this Drop website.');return;}reset();setJoining(true);setStatus('creating');busy.current=true;const [id,token]=url.hash.slice(1).split('.');history.replaceState(null,'',location.pathname);connect({id,token},gen.current);}
  useEffect(()=>{const hash=()=>{if(/^#[\w-]{43}\.[\w-]{43}$/.test(location.hash))join(location.href);};
    if(/^#[\w-]{43}\.[\w-]{43}$/.test(location.hash))hash();
    else {
      const saved=readReturn();
      if(saved){session.current=saved.session;approved.current=true;inviteRef.current=saved.invite;setInvite(saved.invite);setJoining(saved.session.role!=='host');resume();}
    }
    const pageHide=()=>{if(session.current && approved.current)saveReturn(session.current,inviteRef.current,background.current||Date.now()+GRACE);};
    window.addEventListener('pagehide',pageHide);window.addEventListener('pageshow',visibility);window.addEventListener('hashchange',hash);document.addEventListener('visibilitychange',visibility);window.addEventListener('online',resume);
    // Do not send leave on pagehide: mobile browsers emit it during suspension.
    return()=>{window.removeEventListener('pagehide',pageHide);window.removeEventListener('pageshow',visibility);window.removeEventListener('hashchange',hash);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('online',resume);ended.current=true;++gen.current;cleanup(true);};},[]);
  const firstOffer=Object.entries(offers)[0];const offer=firstOffer?{...firstOffer[1],peerId:firstOffer[0],label:members.find(m=>m.id===firstOffer[0])?.label||'Other device'}:null;
  return {status,joining,invite,nickname,expires,error,setError,members,requests,role,selfId,target,setTarget,readyIds,awayUntil,items,fileCounts,offer,create,join,
    approve:(r:Request)=>signal({type:'approve',memberId:r.id,requestId:r.requestId}),reject:(r:Request)=>signal({type:'reject',memberId:r.id,requestId:r.requestId}),
    leave:()=>{signal({type:'leave'});end();},reconnect:()=>{if(socket.current?.readyState===WebSocket.OPEN){signal({type:'retry'});setError('');}else resume();},
    sendFile:async(file:File)=>{try{const t=links.current.get(target)?.transfer;if(!t)throw Error('Choose a connected recipient.');await t.offer(file);}catch(e){setError(e instanceof Error?e.message:'Could not send file.');}},
    sendText:(text:string)=>{try{const t=links.current.get(target)?.transfer;if(!t)return false;t.text(text);return true;}catch(e){setError(e instanceof Error?e.message:'Could not send message.');return false;}},
    accept:()=>{if(offer)links.current.get(offer.peerId)?.transfer?.accept();},decline:()=>{if(offer)links.current.get(offer.peerId)?.transfer?.decline();},
    cancel:(id:string)=>{const item=items.find(i=>i.id===id);if(item?.peerId)links.current.get(item.peerId)?.transfer?.cancel(id.slice(item.peerId.length+1));}
  };
}
