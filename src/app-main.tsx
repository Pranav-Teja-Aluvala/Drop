import ReactDOM from 'react-dom/client';
import {App} from './App';
import './style.css';
import './premium.css';

// The transfer route has its own initial entry: no landing animation bundle
// or second lazy-import hop is required to render its controls.
ReactDOM.createRoot(document.getElementById('root')!).render(<App/>);
