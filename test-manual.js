const {spawn}=require('child_process'),assert=require('assert');
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),port=5100+Math.floor(Math.random()*300);
const srv=spawn('node',['server.js'],{env:{...process.env,PORT:port,DATA_DIR:'/tmp/lwm'+port,BOT_MS:'15',REAL_MONEY:'1',ADMIN_TOKEN:'adm-secret-token',PAY_BANK_NAME:'Test Bank',PAY_ACCOUNT_NUMBER:'0011223344',PAY_ACCOUNT_NAME:'LUDOWHOT LTD'},stdio:'inherit'});
const B='http://localhost:'+port,adm={'x-admin-token':'adm-secret-token'};
class C{constructor(){this.ck=''}async f(m,u,b,h={}){const r=await fetch(B+u,{method:m,headers:{'content-type':'application/json',cookie:this.ck,...h},body:b?JSON.stringify(b):undefined});const s=r.headers.get('set-cookie');if(s)this.ck=s.split(';')[0];return{s:r.status,d:await r.json()}}}
(async()=>{await sleep(500);try{
 const a=new C(),cfg=(await a.f('GET','/api/config')).d;assert.ok(cfg.live&&cfg.manual&&cfg.payBank.number==='0011223344'&&!cfg.botStakes);
 assert.equal((await a.f('POST','/api/signup',{name:'Ada',email:'a@x.com',password:'password1',age18:true})).d.bal,0);
 assert.equal((await a.f('POST','/api/fund')).s,400);
 const dr=await a.f('POST','/api/deposit/request',{amount:5000});assert.equal(dr.s,200);assert.match(dr.d.ref,/^LW-[A-Z0-9]{6}$/);
 assert.equal((await a.f('POST','/api/deposit/request',{amount:5000})).s,400,'one open request');
 assert.equal((await a.f('POST','/api/deposit/paid',{id:dr.d.id})).s,200);
 // admin access
 assert.equal((await a.f('GET','/api/admin/overview')).s,403);assert.equal((await a.f('GET','/api/admin/overview',null,{'x-admin-token':'nope'})).s,403);
 const ov=(await a.f('GET','/api/admin/overview',null,adm)).d;assert.equal(ov.deposits.length,1);assert.equal(ov.deposits[0].status,'submitted');assert.equal(ov.deposits[0].ref,dr.d.ref);
 assert.equal((await a.f('POST','/api/admin/deposits/'+dr.d.id,{action:'approve',amount:-5},adm)).s,400);
 assert.equal((await a.f('POST','/api/admin/deposits/'+dr.d.id,{action:'approve'},adm)).s,200);
 assert.equal((await a.f('POST','/api/admin/deposits/'+dr.d.id,{action:'approve'},adm)).s,400,'no double credit');
 assert.equal((await a.f('GET','/api/me')).d.bal,5000);
 const d2=await a.f('POST','/api/deposit/request',{amount:3000});await a.f('POST','/api/admin/deposits/'+d2.d.id,{action:'approve',amount:2500},adm);assert.equal((await a.f('GET','/api/me')).d.bal,7500,'adjusted amount credited');
 const d3=await a.f('POST','/api/deposit/request',{amount:1000});await a.f('POST','/api/admin/deposits/'+d3.d.id,{action:'reject'},adm);assert.equal((await a.f('GET','/api/me')).d.bal,7500);
 const d4=await a.f('POST','/api/deposit/request',{amount:1000});assert.equal((await a.f('POST','/api/deposit/cancel',{id:d4.d.id})).s,200);
 // withdrawals
 assert.equal((await a.f('POST','/api/withdraw',{amount:1000})).s,400,'kyc first');
 await a.f('POST','/api/admin/kyc',{email:'a@x.com',status:'approved'},adm);
 assert.equal((await a.f('POST','/api/withdraw',{amount:1000})).s,400,'bank first');
 assert.equal((await a.f('POST','/api/bank',{bankName:'GTBank',name:'Ada Obi',account:'12'})).s,400);
 assert.equal((await a.f('POST','/api/bank',{bankName:'GTBank',name:'Ada Obi',account:'0123456789'})).d.bank.last4,'6789');
 assert.equal((await a.f('POST','/api/withdraw',{amount:1000})).d.bal,6500);
 await a.f('POST','/api/withdraw',{amount:500});
 const w=(await a.f('GET','/api/admin/overview',null,adm)).d.withdrawals;assert.equal(w.length,2);assert.equal(w[0].bank.number,'0123456789');
 const w1=w.find(x=>x.amt===1000),w2=w.find(x=>x.amt===500);
 assert.equal((await a.f('POST','/api/admin/withdrawals/'+w1.id,{action:'paid',note:'GTB ref 99'},adm)).d.status,'paid');
 assert.equal((await a.f('POST','/api/admin/withdrawals/'+w1.id,{action:'reject'},adm)).s,400,'paid cannot be rejected');
 await a.f('POST','/api/admin/withdrawals/'+w2.id,{action:'reject'},adm);assert.equal((await a.f('GET','/api/me')).d.bal,6500,'rejected refunded, paid stays debited');
 const st=(await a.f('GET','/api/admin/overview',null,adm)).d;assert.equal(st.stats.balances,6500);assert.ok(st.recent.length>=4);
 assert.equal((await a.f('POST','/api/bot',{game:'Whot',stake:500})).s,400,'no staked bot');
 console.log('MANUAL TESTS PASSED')}catch(e){console.error('FAIL',e);process.exitCode=1}finally{srv.kill()}})();
