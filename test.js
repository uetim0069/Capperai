const {spawn}=require('child_process'),assert=require('assert');
const port=4100+Math.floor(Math.random()*500);
const srv=spawn('node',['server.js'],{env:{...process.env,PORT:port,DATA_DIR:'/tmp/lw'+port,BOT_MS:'15'},stdio:'inherit'});
const B='http://localhost:'+port;
class C{constructor(){this.ck=''}async f(m,u,b){const r=await fetch(B+u,{method:m,headers:{'content-type':'application/json',cookie:this.ck},body:b?JSON.stringify(b):undefined});
 const s=r.headers.get('set-cookie');if(s)this.ck=s.split(';')[0];const d=await r.json();return{s:r.status,d}}}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function playOut(c,id){for(let n=0;n<4000;n++){const{d:v}=await c.f('GET','/api/matches/'+id);if(v.over)return v;
 if(v.turn!=='me'){await sleep(30);continue}
 if(v.game==='Ludo')await c.f('POST','/api/matches/'+id+'/move',{type:'roll'});
 else{const i=v.hand.findIndex(x=>x.ok);const sh='●';await c.f('POST','/api/matches/'+id+'/move',i<0?{type:'draw'}:{type:'play',i,shape:sh})}}
 throw Error('match did not finish')}
(async()=>{await sleep(500);try{
 const a=new C(),b=new C();
 assert.equal((await a.f('POST','/api/signup',{name:'<b>x',email:'a@x.com',password:'password1',age18:true})).s,400);
 assert.equal((await a.f('POST','/api/signup',{name:'Ada',email:'a@x.com',password:'password1',age18:true})).d.bal,5000);
 assert.equal((await a.f('POST','/api/signup',{name:'Ada',email:'a@x.com',password:'password1',age18:true})).s,400);
 assert.equal((await b.f('POST','/api/signup',{name:'Bola',email:'b@x.com',password:'password2',age18:true})).s,200);
 assert.equal((await new C().f('GET','/api/me')).s,401);
 assert.equal((await new C().f('POST','/api/login',{email:'a@x.com',password:'nope'})).s,400);
 for(const g of['Whot','Ludo']){const b0=(await a.f('GET','/api/me')).d.bal;const r=await a.f('POST','/api/bot',{game:g,stake:500});assert.equal(r.s,200,JSON.stringify(r));
  assert.equal((await a.f('GET','/api/me')).d.bal,b0-500);
  assert.equal((await a.f('POST','/api/bot',{game:g,stake:500})).s,400);
  const v=await playOut(a,r.d.id);const me=(await a.f('GET','/api/me')).d;
  console.log(g,'bot match:',v.win?'won':'lost','balance',me.bal);assert.equal(me.bal,v.win?b0+400:b0-500);assert.equal(me.active,null);
  await a.f('POST','/api/fund');await a.f('POST','/api/fund');await a.f('GET','/api/me');
  const bal=(await a.f('GET','/api/me')).d.bal;assert.ok(bal>=b0);}
 const bal0=(await a.f('GET','/api/me')).d.bal,bb0=(await b.f('GET','/api/me')).d.bal;
 const ch=await a.f('POST','/api/challenges',{game:'Whot',stake:1000});assert.equal(ch.d.bal,bal0-1000);
 const L=(await b.f('GET','/api/lobby')).d;assert.equal(L.challenges.length,1);assert.equal(L.challenges[0].mine,false);
 assert.equal((await a.f('POST','/api/challenges/'+L.challenges[0].id+'/accept')).s,400);
 const acc=await b.f('POST','/api/challenges/'+L.challenges[0].id+'/accept');assert.equal(acc.s,200);
 assert.equal((await a.f('GET','/api/me')).d.active,acc.d.id);
 const va=(await a.f('GET','/api/matches/'+acc.d.id)).d,vb=(await b.f('GET','/api/matches/'+acc.d.id)).d;
 assert.ok(va.hand&&vb.hand&&va.oppN===6&&!JSON.stringify(va).includes('deck'));
 const bad=await (va.turn==='me'?b:a).f('POST','/api/matches/'+acc.d.id+'/move',{type:'draw'});assert.equal(bad.s,400);
 assert.equal((await new C().f('GET','/api/matches/'+acc.d.id)).s,401);
 const ff=await (va.turn==='me'?a:b).f('POST','/api/matches/'+acc.d.id+'/move',{type:'forfeit'});
 const ma=(await a.f('GET','/api/me')).d,mb=(await b.f('GET','/api/me')).d;
 console.log('pvp forfeit: a',bal0,'->',ma.bal,' b',bb0,'->',mb.bal);
 assert.equal(ma.bal+mb.bal,bal0+bb0-200);
 console.log('ALL TESTS PASSED')}catch(e){console.error('FAIL',e);process.exitCode=1}finally{srv.kill()}})();
