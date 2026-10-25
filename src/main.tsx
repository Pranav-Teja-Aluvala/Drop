import {NotFound, Story, Closing} from './Story';
import ReactDOM from 'react-dom/client';
import {lazy, Suspense} from 'react';
import './style.css';
import './premium.css';
const App=lazy(()=>import('./App').then(module=>({default:module.App})));
if(location.pathname==='/' && /^#[\w-]{43}\.[\w-]{43}$/.test(location.hash)) location.replace('/app'+location.hash);
const inApp=location.pathname==='/app';
if(inApp){document.title='Your transfer room — Drop';document.querySelector('meta[name="description"]')?.setAttribute('content','Create a temporary room, pair your other device and send files or notes. Compare security codes and accept files before saving them.');}
if(location.pathname!=='/'){const robots=document.createElement('meta');robots.name='robots';robots.content='noindex, nofollow';document.head.append(robots);if(!inApp)document.title='Page not found — Drop';}
ReactDOM.createRoot(document.getElementById('root')!).render(inApp?<Suspense fallback={<main className="route-loading" role="status">Opening your room…</main>}><App/></Suspense>:location.pathname==='/'?<><Story/><Closing/></>:<NotFound/>);
