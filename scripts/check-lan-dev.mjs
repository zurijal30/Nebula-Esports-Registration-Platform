// Read-only requests to the local development server; no authentication or data writes.
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {WebSocket}=require('next/dist/compiled/ws');
const base=process.env.TEST_ORIGIN ?? 'http://192.168.1.9:3000';
const origin=new URL(base).origin;
const page=await fetch(origin,{signal:AbortSignal.timeout(15000)});
const html=await page.text();
const paths=[...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m=>m[1]);
if(page.status!==200||!paths.length)throw new Error('Development page or scripts unavailable');
console.log(JSON.stringify({check:'LAN-page',status:page.status,scriptCount:paths.length}));
for(const value of [origin,'https://untrusted.example']){
  const result=await fetch(new URL(paths[0],origin),{headers:{Origin:value},signal:AbortSignal.timeout(15000)});
  console.log(JSON.stringify({check:'dev-script-origin',origin:value,status:result.status}));
  if(result.status!==(value===origin?200:403))process.exitCode=1;
}
let failures=0;
for(const path of paths){
  const result=await fetch(new URL(path,origin),{headers:{Origin:origin},signal:AbortSignal.timeout(15000)});
  if(!result.ok){failures++;console.log(JSON.stringify({check:'script-failure',path,status:result.status}));}
}
console.log(JSON.stringify({check:'LAN-script-inventory',checked:paths.length,failures}));
if(failures)process.exitCode=1;
await new Promise(resolve=>{
  let settled=false;
  const socket=new WebSocket(origin.replace(/^http/,'ws')+'/_next/hmr',{origin});
  const timeout=setTimeout(()=>{done({check:'LAN-HMR',connected:false,timeout:true});socket.terminate();},5000);
  function done(message){if(settled)return;settled=true;clearTimeout(timeout);if(!message.connected)process.exitCode=1;console.log(JSON.stringify(message));resolve();}
  socket.once('open',()=>{done({check:'LAN-HMR',connected:true});socket.close();});
  socket.once('unexpected-response',(_request,response)=>{done({check:'LAN-HMR',connected:false,status:response.statusCode});socket.terminate();});
  socket.once('error',()=>done({check:'LAN-HMR-error',connected:false}));
});
