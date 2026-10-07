const express = require('express');
const net = require('net');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const CASPAR_HOST = process.env.CASPAR_HOST || '127.0.0.1';
const CASPAR_PORT = Number(process.env.CASPAR_PORT || 5250);
const MEDIA_DIR = process.env.CASPAR_MEDIA || 'C:\\CasparCG\\media';
const SCHEDULE_FILE = path.join(__dirname, 'schedule.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function sendAmcp(command) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket(); let response=''; let settled=false; let timer;
    const finish=(err)=>{ if(settled)return; settled=true; clearTimeout(timer); socket.destroy(); err?reject(err):resolve(response.trim()); };
    socket.setTimeout(2500);
    socket.connect(CASPAR_PORT,CASPAR_HOST,()=>{ socket.write(`${command}\r\n`); timer=setTimeout(()=>finish(),500); });
    socket.on('data',d=>{ response+=d.toString('utf8'); if(/^(200|201|202|400|401|402|403|404|500|501|502|503)\b/m.test(response)) finish(); });
    socket.on('timeout',()=>finish(new Error('CasparCG ne répond pas')));
    socket.on('error',finish); socket.on('close',()=>{if(!settled)finish();});
  });
}
function checkCasparPort(){ return new Promise(resolve=>{ const s=new net.Socket(); let done=false; const f=(ok,error=null)=>{if(done)return;done=true;s.destroy();resolve({ok,error});}; s.setTimeout(1000);s.once('connect',()=>f(true));s.once('timeout',()=>f(false,'Timeout'));s.once('error',e=>f(false,e.message));s.connect(CASPAR_PORT,CASPAR_HOST);});}
function loadSchedule(){ try{return JSON.parse(fs.readFileSync(SCHEDULE_FILE,'utf8'));}catch{return [];} }
function saveSchedule(rows){ fs.writeFileSync(SCHEDULE_FILE,JSON.stringify(rows,null,2)); }
function mediaList(){
  if(!fs.existsSync(MEDIA_DIR)) return [];
  const exts=new Set(['.mp4','.mkv','.mov','.mxf','.avi','.webm']);
  return fs.readdirSync(MEDIA_DIR,{withFileTypes:true}).filter(x=>x.isFile()&&exts.has(path.extname(x.name).toLowerCase())).map(x=>({file:x.name,name:path.parse(x.name).name}));
}

app.get('/api/status',async(_q,res)=>{const x=await checkCasparPort();x.ok?res.json({ok:true}):res.status(503).json(x);});
app.get('/api/media',(_q,res)=>res.json({ok:true,media:mediaList(),mediaDir:MEDIA_DIR}));
app.get('/api/schedule',(_q,res)=>res.json({ok:true,schedule:loadSchedule()}));
app.post('/api/schedule',(req,res)=>{const rows=Array.isArray(req.body?.schedule)?req.body.schedule:null;if(!rows)return res.status(400).json({ok:false,error:'Grille invalide'});saveSchedule(rows);res.json({ok:true});});
app.post('/api/command',async(req,res)=>{
 const command=String(req.body?.command||'').trim(); if(!command)return res.status(400).json({ok:false,error:'Commande manquante'});
 if(!/^(PLAY|LOADBG|STOP|CLEAR|PAUSE|RESUME|CG|MIXER|INFO)\b/i.test(command))return res.status(400).json({ok:false,error:'Commande non autorisée'});
 try{const response=await sendAmcp(command);res.json({ok:true,response:response||'Commande envoyée'});}catch(e){res.status(503).json({ok:false,error:e.message});}
});

let lastKey='';
setInterval(async()=>{
 const now=new Date(); const hh=String(now.getHours()).padStart(2,'0'); const mm=String(now.getMinutes()).padStart(2,'0'); const key=`${now.toDateString()}-${hh}:${mm}`;
 if(key===lastKey)return;
 const row=loadSchedule().find(x=>x.time===`${hh}:${mm}`);
 if(row?.media){ lastKey=key; try{await sendAmcp(`PLAY 1-1 "${row.media.replace(/"/g,'')}"`); console.log('[AUTO]',hh+':'+mm,row.media);}catch(e){console.error('[AUTO]',e.message);} }
},1000);

app.listen(PORT,()=>{console.log(`JD TV Playout: http://localhost:${PORT}`);console.log(`CasparCG: ${CASPAR_HOST}:${CASPAR_PORT}`);console.log(`Media: ${MEDIA_DIR}`);});
