import {useEffect, useRef, type KeyboardEvent} from 'react';
import {Files, MessageSquare, Send} from 'lucide-react';
import {CopyButton, TransferList, type Room} from './components';
import {MAX_TEXT} from './transfer';

export type ActivityView = 'files' | 'chat';
export function RoomActivity({room,view,setView,text,setText,unread}:{room:Room;view:ActivityView;setView:(view:ActivityView)=>void;text:string;setText:(text:string)=>void;unread:number}) {
  const files = room.items.filter(item => item.text === undefined);
  const messages = room.items.filter(item => item.text !== undefined).sort((a,b)=>(a.createdAt || 0)-(b.createdAt || 0));
  const feed = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const last = messages.at(-1);
  useEffect(() => { if (view === 'chat' && feed.current && atBottom.current) feed.current.scrollTop=feed.current.scrollHeight; },[view,last?.id,last?.status]);
  const connected=room.status==='connected';
  function change(next:ActivityView){atBottom.current=true;setView(next);}
  function navigate(event:KeyboardEvent<HTMLButtonElement>){
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();const next=event.key==='Home'?'files':event.key==='End'?'chat':view==='files'?'chat':'files';change(next);document.getElementById(`activity-${next}-tab`)?.focus();
  }
  function send(){if(room.sendText(text)){setText('');atBottom.current=true;}}
  return <section id="room-activity" className="room-activity" aria-label="Room activity">
    <div className="activity-heading"><div><h2>In this room</h2><p>Files in one place. A conversation in the other.</p></div><span>{connected?'Connected':room.status==='recovering'?'Reconnecting':'Room ended'}</span></div>
    <div className="activity-tabs" role="tablist" aria-label="Files and chat">
      <button id="activity-files-tab" role="tab" aria-controls="activity-files" aria-selected={view==='files'} tabIndex={view==='files'?0:-1} onKeyDown={navigate} onClick={()=>change('files')}><Files size={18}/>Files<span>{files.length}</span></button>
      <button id="activity-chat-tab" role="tab" aria-controls="activity-chat" aria-selected={view==='chat'} tabIndex={view==='chat'?0:-1} onKeyDown={navigate} onClick={()=>change('chat')}><MessageSquare size={18}/>Chat{unread>0?<span className="tab-unread" aria-label={`${unread} unread messages`}>{unread}</span>:<span>{messages.length}</span>}</button>
    </div>
    <div id="activity-files" role="tabpanel" aria-labelledby="activity-files-tab" hidden={view!=='files'} tabIndex={0}>
      {view==='files'&&(files.length?<TransferList items={files} cancel={room.cancel} onError={room.setError}/>:<div className="activity-empty"><Files size={32}/><h3>No files yet.</h3><p>Files you send and receive will appear here, ready to save.</p></div>)}
    </div><div id="activity-chat" className="chat-panel" role="tabpanel" aria-labelledby="activity-chat-tab" hidden={view!=='chat'}>{view==='chat'&&<>
      <div className="chat-heading"><div className="chat-avatar"><MessageSquare size={19}/></div><div><h3>Your other device</h3><p>Just the two of you. Nothing saved to a chat server.</p></div></div>
      <div ref={feed} className="chat-feed" aria-label="Conversation" onScroll={()=>{if(feed.current)atBottom.current=feed.current.scrollHeight-feed.current.scrollTop-feed.current.clientHeight<64;}}>
        {!messages.length?<div className="activity-empty"><MessageSquare size={30}/><h3>Send something small.</h3><p>A link, an address, a note. Pick up the conversation on your other screen.</p></div>:messages.map(item=><article key={item.id} className={`chat-message ${item.direction==='out'?'sent':'received'}`} aria-label={item.direction==='out'?'Sent message':'Received message'}>
          <div className="chat-bubble"><pre className="message-text">{item.text}</pre></div>
          <div className="chat-meta"><span>{item.direction==='out'?'You':'Other device'} · {item.createdAt?new Date(item.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):''} · {item.status}</span><CopyButton value={item.text!} onError={room.setError}/></div>
        </article>)}
      </div>
      <form className="chat-composer" onSubmit={event=>{event.preventDefault();send();}}><label htmlFor="note" className="sr-only">Text & links</label><textarea id="note" rows={2} placeholder={connected?'Message your other device…':'Connect again to send a message'} maxLength={MAX_TEXT} disabled={!connected} value={text} onChange={event=>setText(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();if(text.trim()&&connected)send();}}}/><button className="button primary" aria-label="Send message" disabled={!connected||!text.trim()}><Send size={19}/></button><div className="chat-composer-hint"><span>Enter to send · Shift + Enter for a new line</span><span>{text.length.toLocaleString()} / 50,000</span></div></form>
      <p className="chat-retention">Temporary room · Latest 200 messages · Close the page or start a new room to clear this conversation.</p>
    </>}</div>
  </section>;
}
