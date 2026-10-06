import http from 'node:http';
import {readFile} from 'node:fs/promises';
const server=http.createServer(async(req,res)=>{if(!['/','/map-parcel.html'].includes(new URL(req.url,'http://127.0.0.1').pathname)){res.writeHead(404);res.end('Not found');return;}try{const html=await readFile(new URL('../dist/map-parcel.html',import.meta.url));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(html);}catch{res.writeHead(500);res.end('Build the offline HTML first');}});
server.listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log('MapParcel on http://127.0.0.1:'+(process.env.PORT||4173)));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>process.exit(0)));
