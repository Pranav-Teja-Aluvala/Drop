import {createDropServer} from '../server/app.mjs';
import {mountProductionFiles} from '../server/static.mjs';

// Review the actual built frontend and real pairing service on loopback only.
// This is not a public HTTPS deployment or a substitute for phone testing.
const drop=createDropServer();
mountProductionFiles(drop.app);
const port=Number(process.env.PORT)||5174;
drop.server.listen(port,'127.0.0.1',()=>console.log(`sharEEm v2 review: http://localhost:${port}/`));
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await drop.close();process.exit(0);});
