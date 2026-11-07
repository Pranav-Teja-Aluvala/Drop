import {randomBytes,randomInt,timingSafeEqual} from 'node:crypto';
import {WebSocketServer,WebSocket} from 'ws';
import {createIceServers,relayConfiguration,cloudflareConfiguration,createCloudflareIceServers} from './ice.mjs';
const token=()=>randomBytes(32).toString('base64url');
const valid=value=>typeof value==='string'&&/^[\w-]{43}$/.test(value);
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const send=(ws,data)=>{if(ws?.readyState===WebSocket.OPEN){if(ws.bufferedAmount>262144)return ws.terminate();ws.send(JSON.stringify(data));}};

// V2 is versioned so already-open V1 rooms can finish without a protocol mismatch.
export function mountV2(app,server,{allowed,quota,clientIP,maxRooms=1000,roomTTL=7200000,inviteTTL=600000,resumeTTL=600000}={}){
  const rooms=new Map(),names=new Set();
  const relay=relayConfiguration(process.env.TURN_SECRET,process.env.TURN_URLS);
  const cf=cloudflareConfiguration(process.env.CF_TURN_KEY_ID,process.env.CF_TURN_API_TOKEN);
  const ice=end=>cf?createCloudflareIceServers(cf,end):Promise.resolve(createIceServers(relay,end));
  const roster=room=>[...room.members.values()].filter(m=>m.approved).map(m=>({id:m.id,label:m.label,online:!!m.ws,awayUntil:m.hiddenUntil||m.resumeUntil||0}));
  const broadcast=(room,data)=>{for(const m of room.members.values())send(m.ws,data);};
  const state=room=>broadcast(room,{type:'members',members:roster(room)});
  function closeRoom(room,reason,code='expired'){
    if(!rooms.delete(room.id))return;names.delete(room.nickname);
    for(const m of room.members.values()){clearTimeout(m.timer);send(m.ws,{type:'closed',reason,code});m.ws?.close(1000);m.ws=null;}
  }
  function remove(room,m,reason){
    if(m.host)return closeRoom(room,reason);
    clearTimeout(m.timer);room.members.delete(m.id);
    for(const [id,link] of room.links)if(link.a===m.id||link.b===m.id)room.links.delete(id);
    send(m.ws,{type:'closed',reason,code:'expired'});m.ws?.close(1000);m.ws=null;
    broadcast(room,{type:'peer-left',peerId:m.id,reason});state(room);requests(room);
  }
  function requests(room){send(room.members.get(room.hostId)?.ws,{type:'requests',requests:[...room.members.values()].filter(m=>!m.approved).map(m=>({id:m.id,label:m.label,requestId:m.requestId}))});}
  function deadline(room,m){
    clearTimeout(m.timer);const until=m.hiddenUntil||m.resumeUntil;
    if(until)m.timer=setTimeout(()=>remove(room,m,'This device was away for 10 minutes. Open a new invitation to join again.'),Math.max(0,until-Date.now()));
    m.timer?.unref();
  }
  async function links(room,m){
    for(const other of room.members.values()){
      if(!other.approved||other.id===m.id||!other.ws||!m.ws)continue;
      // One fresh epoch per pair. Old offers/candidates never enter a resumed link.
      for(const [id,l] of room.links)if([l.a,l.b].includes(m.id)&&[l.a,l.b].includes(other.id))room.links.delete(id);
      const link={id:token(),a:other.id,b:m.id,descriptions:new Set(),counts:new Map()};room.links.set(link.id,link);
      try{
        const servers=await ice(room.expires);
        if(rooms.get(room.id)!==room||room.links.get(link.id)!==link||!m.ws||!other.ws)continue;
        send(other.ws,{type:'link',linkId:link.id,peerId:m.id,label:m.label,initiator:true,iceServers:servers});
        send(m.ws,{type:'link',linkId:link.id,peerId:other.id,label:other.label,initiator:false,iceServers:servers});
      }catch{broadcast(room,{type:'notice',message:'Connection setup is unavailable. Try again shortly.'});}
    }
  }
  app.post('/api/v2/rooms',(req,res)=>{
    if(!allowed(req))return res.status(403).json({error:'This origin is not allowed.'});
    res.set('Access-Control-Allow-Origin',req.headers.origin);res.vary('Origin');
    if(!quota(clientIP(req))||rooms.size>=maxRooms)return res.status(429).json({error:'Too many rooms. Try again in a minute.'});
    let nickname;for(let i=0;i<32;i++){const name=Array.from({length:6},()=> 'ABCDEFGHJKLMNPQRSTUVWXYZ'[randomInt(24)]).join('');if(!names.has(name)){nickname=name;break;}}
    if(!nickname)return res.status(503).json({error:'Please try again shortly.'});
    let id=token();while(rooms.has(id))id=token();
    const host={id:token(),credential:token(),host:true,approved:true,label:'Device 1',ws:null,hiddenUntil:0,resumeUntil:Date.now()+resumeTTL,timer:null};
    const room={id,nickname,invite:token(),expires:Date.now()+roomTTL,inviteExpires:Date.now()+inviteTTL,hostId:host.id,members:new Map([[host.id,host]]),links:new Map(),sequence:1};rooms.set(id,room);names.add(nickname);deadline(room,host);
    res.status(201).json({id,nickname,invite:room.invite,owner:host.credential,memberId:host.id,expires:room.expires});
  });
  app.options('/api/v2/rooms',(req,res)=>{
    if(!allowed(req)||req.headers['access-control-request-method']!=='POST')return res.sendStatus(403);
    res.set({'Access-Control-Allow-Origin':req.headers.origin,'Access-Control-Allow-Methods':'POST','Access-Control-Allow-Headers':'Content-Type'});res.vary('Origin');res.sendStatus(204);
  });
  const wss=new WebSocketServer({noServer:true,maxPayload:24576});
  server.on('upgrade',(req,socket,head)=>{
    if(req.url!=='/signal-v2')return;
    if(!allowed(req)||wss.clients.size>=maxRooms*3||!quota(clientIP(req)))return socket.destroy();
    wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws));
  });
  wss.on('connection',ws=>{
    let room,m;let count=0,start=Date.now();ws.alive=true;ws.on('pong',()=>ws.alive=true);
    const auth=setTimeout(()=>ws.close(1008),10000);
    ws.on('message',(raw,binary)=>{
      if(Date.now()-start>10000){count=0;start=Date.now();}
      if(binary||++count>100)return ws.close(1008);
      let d;try{d=JSON.parse(raw.toString());}catch{return ws.close(1008);}
      if(!d||typeof d!=='object'||Array.isArray(d)||typeof d.type!=='string')return ws.close(1008);
      if(!m){
        const r=valid(d.id)?rooms.get(d.id):null;
        const deny=()=>{send(ws,{type:'closed',code:'invite',reason:'This invitation is unavailable, expired or full.'});ws.close(1008);};
        if(d.type!=='join'||!r||r.expires<=Date.now()||!valid(d.token))return deny();
        if(d.memberId){
          const member=r.members.get(d.memberId);
          if(!member||!equal(member.credential,d.token)||member.ws||(member.hiddenUntil||member.resumeUntil||Infinity)<=Date.now())return deny();
          m=member;
        }else{
          if(r.inviteExpires<=Date.now()||!equal(r.invite,d.token)||r.members.size>=3||!r.members.get(r.hostId)?.ws)return deny();
          m={id:token(),credential:token(),host:false,approved:false,label:`Device ${++r.sequence}`,requestId:token(),ws:null,hiddenUntil:0,resumeUntil:0,timer:null};r.members.set(m.id,m);
        }
        room=r;m.ws=ws;clearTimeout(auth);m.resumeUntil=0;deadline(room,m);
        send(ws,{type:'joined',memberId:m.id,credential:m.credential,role:m.host?'host':'guest',approved:m.approved,nickname:room.nickname,expires:room.expires,inviteExpires:room.inviteExpires,resumeTTL,members:roster(room)});
        requests(room);state(room);if(m.approved)void links(room,m);return;
      }
      if(rooms.get(room.id)!==room||room.members.get(m.id)!==m||m.ws!==ws)return ws.close(1008);
      if(room.expires<=Date.now())return closeRoom(room,'This room reached its two-hour limit.','expired');
      if(!m.approved&&room.inviteExpires<=Date.now())return remove(room,m,'The invitation expired. Ask for a new room.');
      if((m.hiddenUntil||m.resumeUntil||Infinity)<=Date.now())return remove(room,m,'This device was away for 10 minutes.');
      if(d.type==='visibility'){
        if(typeof d.hidden!=='boolean')return ws.close(1008);
        if(d.hidden){if(!m.hiddenUntil)m.hiddenUntil=Date.now()+resumeTTL;}else m.hiddenUntil=0;
        deadline(room,m);state(room);
      }else if(d.type==='approve'||d.type==='reject'){
        if(!m.host)return ws.close(1008);
        const guest=room.members.get(d.memberId);
        if(!guest||guest.approved||guest.requestId!==d.requestId)return;
        if(room.inviteExpires<=Date.now())return remove(room,guest,'The invitation expired. Ask for a new room.');
        if(d.type==='reject')return remove(room,guest,'The room owner declined this device.');
        guest.approved=true;send(guest.ws,{type:'approved'});requests(room);state(room);void links(room,guest);
      }else if(d.type==='signal'){
        const link=room.links.get(d.linkId);const target=room.members.get(d.to);
        if(!m.approved||!target?.approved||m.id===target.id)return ws.close(1008);
        // Buffered ICE from a previous epoch can arrive after resume. Ignore it;
        // it must never be forwarded into the fresh connection or evict a peer.
        if(!link||!target.ws)return;
        if(!([link.a,link.b].includes(m.id)&&[link.a,link.b].includes(target.id)))return ws.close(1008);
        const s=d.signal;if(!s||typeof s!=='object'||!!s.description===!!s.candidate)return ws.close(1008);
        if(s.description){const desc=s.description;if(link.descriptions.has(m.id)||desc.type!==(m.id===link.a?'offer':'answer')||typeof desc.sdp!=='string'||desc.sdp.length>20000||!/^a=fingerprint:sha-256 [A-Fa-f0-9:]+\r?$/m.test(desc.sdp))return ws.close(1008);link.descriptions.add(m.id);}
        else{const c=s.candidate;const n=(link.counts.get(m.id)||0)+1;link.counts.set(m.id,n);if(n>256||typeof c.candidate!=='string'||c.candidate.length>2048||(c.sdpMid!=null&&(typeof c.sdpMid!=='string'||c.sdpMid.length>64))||(c.sdpMLineIndex!=null&&(!Number.isInteger(c.sdpMLineIndex)||c.sdpMLineIndex<0||c.sdpMLineIndex>64)))return ws.close(1008);}
        send(target.ws,{type:'signal',from:m.id,linkId:link.id,signal:s});
      }else if(d.type==='retry'&&m.approved){
        if(!m.lastRetry||Date.now()-m.lastRetry>5000){m.lastRetry=Date.now();void links(room,m);}
      }else if(d.type==='leave'){remove(room,m,m.host?'The owner ended this room.':'This device left the room.');}
      else ws.close(1008);
    });
    ws.on('error',()=>{});
    ws.on('close',()=>{
      clearTimeout(auth);if(!room||!m||m.ws!==ws||!rooms.has(room.id)||!room.members.has(m.id))return;
      m.ws=null;
      if(!m.approved)return remove(room,m,'Join request disconnected.');
      m.resumeUntil=m.hiddenUntil||Date.now()+resumeTTL;deadline(room,m);
      for(const [id,l]of room.links)if(l.a===m.id||l.b===m.id)room.links.delete(id);
      broadcast(room,{type:'peer-away',peerId:m.id,until:m.resumeUntil});state(room);
    });
  });
  const sweep=setInterval(()=>{
    for(const room of rooms.values()){
      if(room.expires<=Date.now())closeRoom(room,'This room reached its two-hour limit.');
      else for(const m of [...room.members.values()])if(!m.approved&&room.inviteExpires<=Date.now())remove(room,m,'The invitation expired. Ask for a new room.');
    }
    for(const ws of wss.clients){if(!ws.alive)ws.terminate();else{ws.alive=false;ws.ping();}}
  },15000);sweep.unref();
  return {rooms,close(){clearInterval(sweep);for(const room of [...rooms.values()])closeRoom(room,'Server stopped.');for(const ws of wss.clients)ws.terminate();wss.close();}};
}
