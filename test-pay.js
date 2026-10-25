const http=require('http'),{spawn}=require('child_process'),crypto=require('crypto'),assert=require('assert');
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),KEY='sk_test_abc',port=4700+Math.floor(Math.random()*200),mport=port+300;
const paid={},calls=[];let failTransfer=false;
const mock=http.createServer((q,r)=>{let b='';q.on('data',d=>b+=d);q.on('end',()=>{const j=b?JSON.parse(b):{},o=(c,x)=>{r.writeHead(c,{'content-type':'application/json'});r.end(JSON.stringify(x))};
 if(q.headers.authorization!=='Bearer '+KEY)return o(401,{status:false,message:'bad key'});
 if(q.url==='/transaction/initialize'){paid[j.reference]={amount:j.amount,status:'abandoned'};return o(200,{status:true,data:{authorization_url:'http://pay/'+j.reference,reference:j.reference}})}
 if(q.url.startsWith('/transaction/verify/')){const t=paid[q.url.split('/').pop()];return o(200,{status:true,data:{status:t.status,amount:t.amount,currency:'NGN'}})}
 if(q.url.startsWith('/bank/resolve'))return o(200,{status:true,data:{account_name:'ADA OBI'}});
 if(q.url.startsWith('/bank?'))return o(200,{status:true,data:[{name:'Test Bank',code:'058'}]});
 if(q.url==='/transferrecipient')return o(200,{status:true,data:{recipient_code:'RCP_1'}});
 if(q.url==='/transfer'){calls.push(j);return failTransfer?o(400,{status:false,message:'Insufficient balance'}):o(200,{status:true,data:{status:'pending'}})}
 o(404,{status:false})})}).listen(mport);
const srv=spawn('node',['server.js'],{env:{...process.env,PORT:port,DATA_DIR:'/tmp/lwp'+port,BOT_MS:'15',PAYSTACK_SECRET_KEY:KEY,PAYSTACK_BASE:'http://localhost:'+mport,BASE_URL:'http://localhost:'+port,ADMIN_TOKEN:'adm-secret',WITHDRAW_AUTO_MAX:'5000'},stdio:'inherit'});
const B='http://localhost:'+port;
class C{constructor(){this.ck=''}async f(m,u,b,h={}){const r=await fetch(B+u,{method:m,headers:{'content-type':'application/json',cookie:this.ck,...h},body:b?JSON.stringify(b):undefined});const s=r.headers.get('set-cookie');if(s)this.ck=s.split(';')[0];return{s:r.status,d:await r.json()}}}
const hook=(ev,data,sig)=>{const raw=JSON.stringify({event:ev,data});return fetch(B+'/api/paystack/webhook',{method:'POST',headers:{'content-type':'application/json','x-paystack-signature':sig??crypto.createHmac('sha512',KEY).update(raw).digest('hex')},body:raw}).then(r=>r.status)};
(async()=>{await sleep(500);try{
 const a=new C(),adm={'x-admin-token':'adm-secret'};
 assert.equal((await a.f('GET','/api/config')).d.live,true);
 assert.equal((await a.f('POST','/api/signup',{name:'Ada',email:'a@x.com',password:'password1'})).s,400);
 const su=await a.f('POST','/api/signup',{name:'Ada',email:'a@x.com',password:'password1',age18:true});assert.equal(su.d.bal,0);
 assert.equal((await a.f('POST','/api/fund')).s,400);
 assert.equal((await a.f('POST','/api/deposit/init',{amount:60000})).s,400,'daily limit');
 const di=await a.f('POST','/api/deposit/init',{amount:20000});assert.equal(di.s,200);const ref=di.d.url.split('/').pop();
 assert.equal((await a.f('POST','/api/deposit/verify',{reference:ref})).s,400,'unpaid not credited');
 assert.equal(await hook('charge.success',{reference:ref},'deadbeef'),401);
 paid[ref].status='success';
 assert.equal(await hook('charge.success',{reference:ref}),200);assert.equal(await hook('charge.success',{reference:ref}),200);
 assert.equal((await a.f('POST','/api/deposit/verify',{reference:ref})).d.bal,20000,'credited exactly once');
 const di2=await a.f('POST','/api/deposit/init',{amount:5000}),ref2=di2.d.url.split('/').pop();paid[ref2]={amount:100,status:'success'};
 assert.equal((await a.f('POST','/api/deposit/verify',{reference:ref2})).s,400);assert.equal((await a.f('GET','/api/me')).d.bal,20000,'wrong amount not credited');
 assert.equal((await a.f('POST','/api/bot',{game:'Whot',stake:500})).s,400,'staked bot off');
 assert.equal((await a.f('POST','/api/bot',{game:'Ludo',stake:0})).s,200,'free practice ok');
 assert.equal((await a.f('GET','/api/me')).d.bal,20000);
 // withdrawals
 assert.equal((await a.f('POST','/api/withdraw',{amount:1000})).s,400,'kyc required');
 assert.equal((await a.f('GET','/api/admin/pending')).s,403);assert.equal((await a.f('POST','/api/admin/kyc',{email:'a@x.com',status:'approved'},{'x-admin-token':'wrong'})).s,403);
 assert.equal((await a.f('POST','/api/admin/kyc',{email:'a@x.com',status:'approved'},adm)).s,200);
 assert.equal((await a.f('POST','/api/withdraw',{amount:1000})).s,400,'bank required');
 await a.f('GET','/api/banks');assert.equal((await a.f('POST','/api/bank',{code:'058',account:'0123456789'})).d.bank.name,'ADA OBI');
 const w=await a.f('POST','/api/withdraw',{amount:1000});assert.equal(w.d.bal,19000);assert.equal(calls.length,1);assert.equal(calls[0].amount,100000);
 const wref=calls[0].reference;await hook('transfer.failed',{reference:wref});await hook('transfer.failed',{reference:wref});
 assert.equal((await a.f('GET','/api/me')).d.bal,20000,'refunded exactly once');
 failTransfer=true;assert.equal((await a.f('POST','/api/withdraw',{amount:1000})).s,200);assert.equal((await a.f('GET','/api/me')).d.bal,20000,'definite provider failure refunds');failTransfer=false;
 await a.f('POST','/api/withdraw',{amount:9000});assert.equal(calls.length,2,'large withdrawal held, not sent');assert.equal((await a.f('GET','/api/me')).d.bal,11000);
 const pend=(await a.f('GET','/api/admin/pending',null,adm)).d.withdrawals;assert.equal(pend.length,1);
 await a.f('POST','/api/admin/withdrawals/'+pend[0].id,{action:'reject'},adm);assert.equal((await a.f('GET','/api/me')).d.bal,20000,'rejected refunds');
 // responsible gambling
 const act=(await a.f('GET','/api/me')).d.active;await a.f('POST','/api/matches/'+act+'/move',{type:'forfeit'});
 assert.equal((await a.f('POST','/api/limits',{dlimit:100000})).d.dlimit,50000,'raise is delayed');
 assert.equal((await a.f('POST','/api/limits',{dlimit:10000})).d.dlimit,10000,'lower is immediate');
 assert.equal((await a.f('POST','/api/challenges',{game:'Whot',stake:500})).s,200);
 await a.f('POST','/api/exclude',{days:1});
 assert.equal((await a.f('POST','/api/challenges',{game:'Whot',stake:500})).s,400,'excluded cannot stake');
 assert.equal((await a.f('POST','/api/deposit/init',{amount:500})).s,400,'excluded cannot deposit');
 console.log('PAYMENT TESTS PASSED')}catch(e){console.error('FAIL',e);process.exitCode=1}finally{srv.kill();mock.close()}})();
