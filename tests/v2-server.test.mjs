import {test} from 'node:test';import assert from 'node:assert/strict';import {WebSocket} from 'ws';import {createDropServer} from '../server/app.mjs';
async function fixture(t,options={}){const d=createDropServer(options);await new Promise(r=>d.server.listen(0,'127.0.0.1',r));t.after(()=>d.close());const origin=`http://127.0.0.1:${d.server.address().port}`;const create=async()=>{const r=await fetch(origin+'/api/v2/rooms',{method:'POST',headers:{Origin:origin}});assert.equal(r.status,201);return r.json();};
const connect=async(room,credential,memberId)=>{const ws=new WebSocket(origin.replace('http','ws')+'/signal-v2',{origin});const q=[],waiters=[];ws.on('message',raw=>{const data=JSON.parse(raw);const index=waiters.findIndex(w=>w.type===data.type);if(index>=0){const [w]=waiters.splice(index,1);clearTimeout(w.timer);w.resolve(data);}else q.push(data);});await new Promise(r=>ws.once('open',r));ws.send(JSON.stringify({type:'join',id:room.id,token:credential,memberId}));return {ws,send:data=>ws.send(JSON.stringify(data)),next(type){const i=q.findIndex(d=>d.type===type);if(i>=0)return Promise.resolve(q.splice(i,1)[0]);return new Promise((resolve,reject)=>{const w={type,resolve,timer:setTimeout(()=>reject(Error('No '+type)),2500)};waiters.push(w);});}};};return {...d,origin,create,connect};}

test('v2: six letter rooms, three devices, one approval, no admission by nickname',async t=>{
 const {create,connect,v2}=await fixture(t);const r=await create();assert.match(r.nickname,/^[A-Z]{6}$/);const host=await connect(r,r.owner,r.memberId);const h=await host.next('joined');assert.equal(h.resumeTTL,600000);
 const a=await connect(r,r.invite);const aj=await a.next('joined');assert.equal(aj.approved,false);const req=(await host.next('requests')).requests; // initial request may be empty
 let requests=req;if(!requests.length)requests=(await host.next('requests')).requests;
 host.send({type:'approve',memberId:aj.memberId,requestId:requests.find(q=>q.id===aj.memberId).requestId});await a.next('approved');const linkA=await a.next('link');await host.next('link');
 const b=await connect(r,r.invite);const bj=await b.next('joined');let pending;do{pending=(await host.next('requests')).requests;}while(!pending.some(p=>p.id===bj.memberId));host.send({type:'approve',memberId:bj.memberId,requestId:pending.find(p=>p.id===bj.memberId).requestId});await b.next('approved');await b.next('link');await a.next('link');
 assert.equal(v2.rooms.get(r.id).members.size,3);const fourth=await connect(r,r.invite);assert.equal((await fourth.next('closed')).code,'invite');
 const wrong=await connect(r,r.nickname);assert.equal((await wrong.next('closed')).code,'invite');
 assert.equal(linkA.peerId,r.memberId);
});

test('v2: disconnect retains approved credential; resume does not request another approval',async t=>{
 const {create,connect,v2}=await fixture(t);const r=await create();const host=await connect(r,r.owner,r.memberId);await host.next('joined');const a=await connect(r,r.invite);const j=await a.next('joined');let req;do{req=(await host.next('requests')).requests;}while(!req.length);host.send({type:'approve',memberId:j.memberId,requestId:req[0].requestId});await a.next('approved');await a.next('link');await host.next('link');
 a.ws.close();await host.next('peer-away');assert.equal(v2.rooms.get(r.id).members.get(j.memberId).approved,true);
 const resumed=await connect(r,j.credential,j.memberId);const back=await resumed.next('joined');assert.equal(back.approved,true);await resumed.next('link');const newLink=await host.next('link');assert.ok(newLink.linkId);assert.equal(v2.rooms.get(r.id).members.size,2);
 const stolen=await connect(r,r.owner,j.memberId);assert.equal((await stolen.next('closed')).code,'invite');
});

test('v2: guest cannot approve, fake/stale target signaling is rejected and rooms remain isolated',async t=>{
 const {create,connect,v2}=await fixture(t);const r=await create(),other=await create();const host=await connect(r,r.owner,r.memberId);await host.next('joined');const a=await connect(r,r.invite);await a.next('joined');a.send({type:'approve',memberId:r.memberId,requestId:'fake'});await new Promise(resolve=>a.ws.once('close',resolve));
 // The client close can arrive before the server processes its own close event.
 await host.next('peer-left');
 assert.equal(v2.rooms.get(r.id).members.size,1);assert.equal(v2.rooms.has(other.id),true);
 const b=await connect(r,r.invite);const j=await b.next('joined');let req;do{req=(await host.next('requests')).requests;}while(!req.some(q=>q.id===j.memberId));host.send({type:'approve',memberId:j.memberId,requestId:req.find(q=>q.id===j.memberId).requestId});await b.next('approved');await b.next('link');
 b.send({type:'signal',to:other.memberId,linkId:'fake',signal:{candidate:{candidate:'x'}}});await new Promise(resolve=>b.ws.once('close',resolve));assert.equal(v2.rooms.has(other.id),true);
});


test('v2: server removes an expired background guest but preserves the owner and remaining device',async t=>{
 const {create,connect,v2}=await fixture(t,{v2ResumeTTL:140});const r=await create();const host=await connect(r,r.owner,r.memberId);await host.next('joined');const guest=await connect(r,r.invite);const j=await guest.next('joined');let req;do{req=(await host.next('requests')).requests;}while(!req.length);host.send({type:'approve',memberId:j.memberId,requestId:req[0].requestId});await guest.next('approved');await guest.next('link');
 guest.send({type:'visibility',hidden:true});const deadline=Date.now()+140;guest.send({type:'visibility',hidden:true});await host.next('peer-left');assert.equal(v2.rooms.get(r.id).members.size,1);assert.ok(Date.now()>=deadline-20);
 const expired=await connect(r,j.credential,j.memberId);assert.equal((await expired.next('closed')).code,'invite');
});

test('v2: owner returning before timeout cancels its deadline; an expired owner ends the room',async t=>{
 const {create,connect,v2}=await fixture(t,{v2ResumeTTL:180});const r=await create();const host=await connect(r,r.owner,r.memberId);await host.next('joined');host.send({type:'visibility',hidden:true});await host.next('members');host.send({type:'visibility',hidden:false});await new Promise(r=>setTimeout(r,210));assert.equal(v2.rooms.has(r.id),true);host.send({type:'visibility',hidden:true});await host.next('closed');assert.equal(v2.rooms.has(r.id),false);
});

test('a hidden approved device can replace a lingering socket with its own return credential',async t=>{
 const {create,connect,v2}=await fixture(t);
 const room=await create();
 const old=await connect(room,room.owner,room.memberId);
 await old.next('joined');
 old.send({type:'visibility',hidden:true});
 let members;
 do {members=(await old.next('members')).members;} while(!members[0].awayUntil);
 const wrong=await connect(room,room.invite,room.memberId);
 assert.equal((await wrong.next('closed')).code,'invite');
 const resumed=await connect(room,room.owner,room.memberId);
 assert.equal((await resumed.next('joined')).approved,true);
 assert.equal(v2.rooms.get(room.id).members.size,1);
 resumed.send({type:'visibility',hidden:false});
 const foreground=await connect(room,room.owner,room.memberId);
 assert.equal((await foreground.next('joined')).approved,true);
 assert.equal(v2.rooms.get(room.id).members.size,1);
});
