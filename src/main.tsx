import {NotFound, Story, Closing} from './Story';
import ReactDOM from 'react-dom/client';
import {lazy, Suspense} from 'react';
import './style.css';
import './premium.css';
const App=lazy(()=>import('./App').then(module=>({default:module.App})));
if(location.pathname==='/' && /^#[\w-]{43}\.[\w-]{43}$/.test(location.hash)) location.replace('/app'+location.hash);
const inApp=location.pathname==='/app';
if(inApp){document.title='Your transfer room — shareEm';document.querySelector('meta[name="description"]')?.setAttribute('content','Open a room for up to three devices, approve each newcomer once and choose a recipient for files or notes. Return within ten minutes.');}
if(location.pathname!=='/' && !inApp){const robots=document.createElement('meta');robots.name='robots';robots.content='noindex, nofollow';document.head.append(robots);if(!inApp)document.title='Page not found — shareEm';}
ReactDOM.createRoot(document.getElementById('root')!).render(inApp?<Suspense fallback={<main className="route-loading" role="status">Opening your room…</main>}><App/></Suspense>:location.pathname==='/'?<><Story/><Closing/></>:<NotFound/>);

import './v2.css';
import './dispatch.css';
