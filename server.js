'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {whot,ludo,E,cleanRules}=require('./engine');
const PORT=+process.env.PORT||3000,DATA=process.env.DATA_DIR||path.join(__dirname,'data'),PUB=path.join(__dirname,'public');
const PSK=process.env.PAYSTACK_SECRET_KEY||'',PSB=process.env.PAYSTACK_BASE||'https://api.paystack.co',BASE_URL=(process.env.BASE_URL||'').replace(/\/$/,''),ADMIN=process.env.ADMIN_TOKEN||'';
const LIVE=(!!PSK||process.env.REAL_MONEY==='1')&&process.env.DEMO!=='1',MANUAL=LIVE&&!PSK,KYC_REQ=process.env.REQUIRE_KYC!=='0',BOT_STAKES=process.env.ALLOW_BOT_STAKES==='1',WD_AUTO=+process.env.WITHDRAW_AUTO_MAX||50000,WD_DAY=+process.env.WITHDRAW_DAY_MAX||200000;
const BOT_MS=+process.env.BOT_MS||900,DEMO=!LIVE&&process.env.DEMO!=='0',FEE=0.1,HOUSE='ludowhot-house';
fs.mkdirSync(DATA,{recursive:true});const DBF=path.join(DATA,'db.json');
let db={users:{},sessions:{},challenges:[],matches:{},ledger:[],tx:[]};
try{db={...db,...JSON.parse(fs.readFileSync(DBF,'utf8'))}}catch{}
const persist=()=>{try{fs.writeFileSync(DBF+'.tmp',JSON.stringify(db));fs.renameSync(DBF+'.tmp',DBF)}catch(e){console.error('save failed',e)}};
const uid=()=>crypto.randomBytes(5).toString('hex'),now=()=>Date.now();
const log=(e,amt,why)=>db.ledger.push({t:now(),user:e,amt,why});
// matches in progress when the server stopped are voided and stakes refunded
for(const m of Object.values(db.matches))if(m.status==='active'){m.status='void';for(const e of m.players)if(db.users[e]){db.users[e].bal+=m.stake;log(e,m.stake,'refund '+m.id)}}
persist();
const hashPw=(pw,salt)=>new Promise((ok,no)=>crypto.scrypt(pw,salt,32,(e,k)=>e?no(e):ok(k.toString('hex'))));
const same=(a,b)=>a.length===b.length&&crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));
const activeOf=e=>Object.values(db.matches).find(m=>m.status==='active'&&m.players.includes(e));
const escrowOf=e=>db.challenges.filter(c=>c.by===e).reduce((s,c)=>s+c.stake,0)+(activeOf(e)?.stake||0);
const pub=u=>({name:u.name,email:u.email,bal:u.bal,escrow:escrowOf(u.email),active:activeOf(u.email)?.id||null,kyc:u.kyc||'pending',dlimit:dlimit(u),exUntil:u.exUntil||0,bank:u.bank&&{name:u.bank.acct,bankName:u.bank.bankName,last4:u.bank.last4}});
const sess=req=>{const m=/(?:^|; )lw_s=([a-f0-9]{48})/.exec(req.headers.cookie||'');const e=m&&db.sessions[m[1]];const u=e&&db.users[e];if(u)u.seen=now();return u||null};
const tries=new Map();
const limited=ip=>{const t=tries.get(ip)||[0,now()];if(now()-t[1]>6e4){t[0]=0;t[1]=now()}t[0]++;tries.set(ip,t);return t[0]>10};
// ---- matches
const sse=new Map();
const notify=id=>(sse.get(id)||[]).forEach(r=>r.write('data: u\n\n'));
function newMatch(game,stake,players,rules){const m={id:uid(),game,stake,players,status:'active',created:now(),state:game==='Whot'?whot.create(rules):ludo.create()};db.matches[m.id]=m;after(m);return m}
function settle(m){const g=m.state,w=m.players[g.winner],pot=m.stake*2,fee=pot*FEE;m.status='done';m.payout=null;
 if(!m.stake){}else if(db.users[w]){db.users[w].bal+=pot-fee;m.payout={to:w,amt:pot-fee,fee};log(w,pot-fee,'win '+m.id)}else log(HOUSE,m.stake,'house '+m.id)}
function after(m){const g=m.state;if(g.over)settle(m);else if(m.players[g.turn]==='bot')setTimeout(()=>botTurn(m.id),BOT_MS);persist();notify(m.id)}
function botTurn(id){const m=db.matches[id];if(!m||m.status!=='active')return;const g=m.state;if(g.over||m.players[g.turn]!=='bot')return;try{m.game==='Whot'?whot.bot(g,g.turn):ludo.roll(g,g.turn)}catch(e){console.error(e)}after(m)}
function mview(m,email){const p=m.players.indexOf(email),g=m.state,o=m.players[1-p];
 return{id:m.id,game:m.game,stake:m.stake,pot:m.stake*2,opp:o==='bot'?'Ludowhot Bot':(db.users[o]?.name||'Player'),bot:o==='bot',over:g.over,win:g.over?g.winner===p:null,payout:m.payout&&m.payout.to===email?m.payout.amt:0,...(m.game==='Whot'?whot.view(g,p):ludo.view(g,p))}}
// ---- routes
const routes=[];const R=(m,re,fn,auth=true)=>routes.push({m,re,fn,auth});
const clean=(s,n)=>String(s??'').slice(0,n);
const stakeOk=s=>Number.isInteger(s)&&s>=100&&s<=50000&&s%50===0;
const game=g=>{if(g!=='Whot'&&g!=='Ludo')throw E('Choose Whot or Ludo.');return g};
const setCookie=(res,req,t,age)=>res.setHeader('Set-Cookie',`lw_s=${t}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${age}${req.headers['x-forwarded-proto']==='https'?'; Secure':''}`);
async function start(req,res,u,ip,email){const t=crypto.randomBytes(24).toString('hex');db.sessions[t]=email;persist();setCookie(res,req,t,2592000)}
R('POST',/^\/api\/signup$/,async(req,res,u,P,b,ip)=>{
 if(limited(ip))throw E('Too many attempts. Try again in a minute.');
 const name=clean(b.name,40).trim(),email=clean(b.email,120).trim().toLowerCase(),pw=clean(b.password,200);
 if(!/^[A-Za-z0-9_. -]{2,20}$/.test(name))throw E('Username must be 2 to 20 letters, numbers, spaces or _ . -');
 if(!/^\S+@\S+\.\S+$/.test(email))throw E('Enter a valid email address.');
 if(pw.length<8)throw E('Password must be at least 8 characters.');
 if(b.age18!==true)throw E('You must confirm you are 18 or older.');
 if(db.users[email])throw E('An account with this email already exists. Log in instead.');
 const salt=crypto.randomBytes(16).toString('hex');db.users[email]={name,email,salt,h:await hashPw(pw,salt),bal:DEMO?5000:0,seen:now(),created:now(),age18:true,kyc:'pending',bank:null,dlimit:50000,exUntil:0};
 await start(req,res,null,ip,email);return pub(db.users[email])},false);
R('POST',/^\/api\/login$/,async(req,res,u,P,b,ip)=>{
 if(limited(ip))throw E('Too many attempts. Try again in a minute.');
 const email=clean(b.email,120).trim().toLowerCase(),r=db.users[email];
 if(!r||!same(await hashPw(clean(b.password,200),r.salt),r.h))throw E('Email or password is incorrect.');
 await start(req,res,null,ip,email);return pub(r)},false);
R('POST',/^\/api\/logout$/,(req,res)=>{const m=/(?:^|; )lw_s=([a-f0-9]{48})/.exec(req.headers.cookie||'');if(m){delete db.sessions[m[1]];persist()}setCookie(res,req,'',0);return{ok:true}},false);
R('GET',/^\/api\/me$/,(req,res,u)=>pub(u));
R('POST',/^\/api\/fund$/,(req,res,u)=>{if(!DEMO)throw E('Funding is not available.');if(u.bal>=50000)throw E('Demo balance is already high.');u.bal+=5000;log(u.email,5000,'demo funds');persist();return pub(u)});
R('GET',/^\/api\/lobby$/,(req,res,u)=>({online:Object.values(db.users).filter(x=>now()-(x.seen||0)<12e4).length,
 challenges:db.challenges.map(c=>({id:c.id,name:db.users[c.by].name,game:c.game,stake:c.stake,mine:!!u&&c.by===u.email}))}),false);
R('POST',/^\/api\/challenges$/,(req,res,u,P,b)=>{const g=game(b.game),s=b.stake;exclCheck(u);
 if(!stakeOk(s))throw E('Stake must be between ₦100 and ₦50,000, in steps of ₦50.');if(activeOf(u.email))throw E('Finish your current match first.');
 if(db.challenges.filter(c=>c.by===u.email).length>=3)throw E('You can have 3 open challenges at most.');
 if(u.bal<s)throw E('Not enough balance. Add funds first.');
 u.bal-=s;log(u.email,-s,'escrow challenge');db.challenges.unshift({id:uid(),by:u.email,game:g,stake:s,rules:cleanRules(b.rules)});persist();return pub(u)});
R('DELETE',/^\/api\/challenges\/(\w+)$/,(req,res,u,P)=>{const i=db.challenges.findIndex(c=>c.id===P[1]&&c.by===u.email);if(i<0)throw E('Challenge not found.');
 const[c]=db.challenges.splice(i,1);u.bal+=c.stake;log(u.email,c.stake,'refund challenge');persist();return pub(u)});
R('POST',/^\/api\/challenges\/(\w+)\/accept$/,(req,res,u,P)=>{exclCheck(u);const i=db.challenges.findIndex(c=>c.id===P[1]);const c=db.challenges[i];
 if(!c)throw E('That challenge is gone.');if(c.by===u.email)throw E('You cannot accept your own challenge.');
 if(activeOf(u.email))throw E('Finish your current match first.');if(u.bal<c.stake)throw E('Not enough balance. Add funds first.');
 db.challenges.splice(i,1);u.bal-=c.stake;log(u.email,-c.stake,'escrow match');const m=newMatch(c.game,c.stake,[c.by,u.email],c.rules);return{id:m.id}});
R('POST',/^\/api\/bot$/,(req,res,u,P,b)=>{const g=game(b.game),s=b.stake;if(s>0&&LIVE&&!BOT_STAKES)throw E('Staked bot matches are off. Play a free practice match or challenge a player.');if(s>0)exclCheck(u);if(s!==0&&!stakeOk(s))throw E('Stake must be between ₦100 and ₦50,000, in steps of ₦50.');
 if(activeOf(u.email))throw E('Finish your current match first.');if(u.bal<s)throw E('Not enough balance. Add funds first.');
 u.bal-=s;log(u.email,-s,'escrow bot match');const m=newMatch(g,s,[u.email,'bot'],b.rules);return{id:m.id}});
const mine=(u,id)=>{const m=db.matches[id];if(!m||!m.players.includes(u.email))throw Object.assign(E('Match not found.'),{status:404});return m};
R('GET',/^\/api\/matches\/(\w+)$/,(req,res,u,P)=>mview(mine(u,P[1]),u.email));
R('POST',/^\/api\/matches\/(\w+)\/move$/,(req,res,u,P,b)=>{const m=mine(u,P[1]);if(m.status!=='active')throw E('This match is over.');const p=m.players.indexOf(u.email),g=m.state;
 if(b.type==='forfeit'){g.over=true;g.winner=1-p}
 else if(m.game==='Whot'){if(b.type==='play')whot.play(g,p,b.i,b.shape);else if(b.type==='draw')whot.draw(g,p);else throw E('Unknown move.')}
 else{if(b.type!=='roll')throw E('Unknown move.');ludo.roll(g,p)}
 after(m);return mview(m,u.email)});
R('GET',/^\/api\/matches\/(\w+)\/events$/,(req,res,u,P)=>{const m=mine(u,P[1]);
 res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache',Connection:'keep-alive'});res.write('retry: 2000\n\n');
 const s=sse.get(m.id)||new Set();sse.set(m.id,s);s.add(res);const k=setInterval(()=>res.write(': k\n\n'),25000);
 req.on('close',()=>{clearInterval(k);s.delete(res)});return undefined});
// ---- real money: Paystack, limits, KYC
const DAY=864e5,sumTx=(e,type,st)=>db.tx.filter(x=>x.user===e&&x.type===type&&now()-x.t<DAY&&st.includes(x.status)).reduce((a,x)=>a+x.amt,0);
function dlimit(u){if(u.dlimitNext&&now()>=u.dlimitNext.at){u.dlimit=u.dlimitNext.v;u.dlimitNext=null}return u.dlimit??50000}
function exclCheck(u){if((u.exUntil||0)>now())throw E('Your account is self-excluded until '+new Date(u.exUntil).toLocaleDateString()+'.')}
const needLive=()=>{if(!LIVE)throw E('Real-money payments are not enabled.')};
async function ps(p,method='GET',body){let r;try{r=await fetch(PSB+p,{method,headers:{Authorization:'Bearer '+PSK,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)})}catch(e){throw Object.assign(new Error('Payment provider unreachable.'),{unknown:true})}
 const d=await r.json().catch(()=>({}));if(!r.ok||d.status===false)throw Object.assign(new Error(d.message||'Payment provider error.'),{http:r.status,unknown:r.status>=500});return d}
async function settleDeposit(ref){const t=db.tx.find(x=>x.ref===ref&&x.type==='deposit');if(!t||t.status==='success')return t;
 const d=(await ps('/transaction/verify/'+encodeURIComponent(ref))).data;
 if(d.status==='success'&&d.amount===t.amt*100&&d.currency==='NGN'){if(t.status!=='success'){t.status='success';db.users[t.user].bal+=t.amt;log(t.user,t.amt,'deposit '+ref);persist()}}
 else if(d.status==='failed'||d.status==='abandoned'){if(t.status==='pending'){t.status='failed';persist()}}return t}
function refundWd(t,st){if(t.status==='failed'||t.status==='rejected')return;t.status=st;const u=db.users[t.user];u.bal+=t.amt;log(t.user,t.amt,'withdrawal '+st+' '+t.ref);persist()}
async function sendTransfer(t){const u=db.users[t.user];t.status='processing';persist();
 try{await ps('/transfer','POST',{source:'balance',amount:t.amt*100,recipient:u.bank.recipient,reference:t.ref,reason:'Ludowhot withdrawal'})}
 catch(e){if(e.http&&!e.unknown)refundWd(t,'failed');else console.error('transfer unknown state',t.ref,e.message)}}
let banks=null,banksAt=0;
const adminOnly=req=>{const h=String(req.headers['x-admin-token']||''),ip=(req.headers['x-forwarded-for']||req.socket.remoteAddress||'').split(',')[0].trim();
 if(!ADMIN||h.length!==ADMIN.length||!same(h,ADMIN)){if(limited('adm'+ip))throw Object.assign(E('Too many attempts.'),{status:429});throw Object.assign(E('Forbidden.'),{status:403})}};
const audit=(a,target,note='')=>{db.audit=db.audit||[];db.audit.push({t:now(),a,target,note});if(db.audit.length>500)db.audit.shift()};
R('GET',/^\/api\/config$/,()=>({live:LIVE,demo:DEMO,botStakes:!LIVE||BOT_STAKES,licence:process.env.LICENCE_TEXT||'',minAge:18,manual:MANUAL,payBank:MANUAL?{bank:process.env.PAY_BANK_NAME||'',number:process.env.PAY_ACCOUNT_NUMBER||'',name:process.env.PAY_ACCOUNT_NAME||'',note:process.env.PAY_NOTE||''}:null}),false);
R('GET',/^\/api\/wallet$/,(req,res,u)=>({tx:db.tx.filter(x=>x.user===u.email).slice(-15).reverse().map(x=>({id:x.id,ref:x.ref,type:x.type,amt:x.amt,status:x.status,t:x.t}))}));
R('POST',/^\/api\/deposit\/init$/,async(req,res,u,P,b)=>{needLive();exclCheck(u);const amt=b.amount;
 if(!Number.isInteger(amt)||amt<100||amt>500000)throw E('Deposit between ₦100 and ₦500,000.');
 const used=sumTx(u.email,'deposit',['pending','success']);if(used+amt>dlimit(u))throw E(`Your daily deposit limit is ₦${dlimit(u).toLocaleString()}. You have ₦${Math.max(0,dlimit(u)-used).toLocaleString()} left today.`);
 const ref='lwdep'+uid()+uid();const r=await ps('/transaction/initialize','POST',{email:u.email,amount:amt*100,currency:'NGN',reference:ref,callback_url:BASE_URL+'/?deposit='+ref});
 db.tx.push({id:ref,ref,user:u.email,type:'deposit',amt,status:'pending',t:now()});persist();return{url:r.data.authorization_url}});
R('POST',/^\/api\/deposit\/verify$/,async(req,res,u,P,b)=>{needLive();const t=db.tx.find(x=>x.ref===b.reference&&x.user===u.email&&x.type==='deposit');if(!t)throw E('Payment not found.');
 await settleDeposit(t.ref);if(t.status!=='success')throw E('Payment not confirmed yet. It will be credited automatically once Paystack confirms it.');return pub(u)});
R('GET',/^\/api\/banks$/,async()=>{needLive();if(!banks||now()-banksAt>216e5){banks=(await ps('/bank?country=nigeria&currency=NGN&perPage=200')).data.map(x=>({name:x.name,code:x.code}));banksAt=now()}return{banks}});
R('POST',/^\/api\/bank$/,async(req,res,u,P,b)=>{needLive();
 if(MANUAL){const bn=clean(b.bankName,40).trim(),nm=clean(b.name,60).trim(),ac=clean(b.account,10);if(!bn||!nm||!/^\d{10}$/.test(ac))throw E('Enter the bank name, the account name and a 10-digit account number.');u.bank={acct:nm,last4:ac.slice(-4),bankName:bn,number:ac,at:now()};persist();return pub(u)}
 const code=clean(b.code,10),acct=clean(b.account,10);if(!/^\d{10}$/.test(acct)||!/^\d{2,6}$/.test(code))throw E('Enter a 10-digit account number and choose a bank.');
 const nm=(await ps(`/bank/resolve?account_number=${acct}&bank_code=${code}`)).data.account_name;
 const rc=(await ps('/transferrecipient','POST',{type:'nuban',name:nm,account_number:acct,bank_code:code,currency:'NGN'})).data.recipient_code;
 u.bank={acct:nm,last4:acct.slice(-4),bankName:(banks||[]).find(x=>x.code===code)?.name||'Bank',recipient:rc,at:now()};persist();return pub(u)});
R('POST',/^\/api\/withdraw$/,async(req,res,u,P,b)=>{needLive();const amt=b.amount;
 if(!Number.isInteger(amt)||amt<500)throw E('Minimum withdrawal is ₦500.');if(KYC_REQ&&u.kyc!=='approved')throw E('Your identity must be verified (KYC) before you can withdraw. Contact support.');
 if(!u.bank)throw E('Add a bank account first.');if(amt>u.bal)throw E('Not enough balance.');
 const used=sumTx(u.email,'withdraw',['pending','processing','paid']);if(used+amt>WD_DAY)throw E(`Daily withdrawal limit is ₦${WD_DAY.toLocaleString()}.`);
 u.bal-=amt;const t={id:uid(),ref:'lwwd'+uid()+uid(),user:u.email,type:'withdraw',amt,status:'pending',t:now(),bank:{name:u.bank.acct,bankName:u.bank.bankName,number:u.bank.number||null}};db.tx.push(t);log(u.email,-amt,'withdraw '+t.ref);persist();
 if(PSK&&amt<=WD_AUTO)await sendTransfer(t);return pub(u)});
R('POST',/^\/api\/limits$/,(req,res,u,P,b)=>{const v=b.dlimit;if(!Number.isInteger(v)||v<0||v>500000)throw E('Enter a limit between ₦0 and ₦500,000.');
 if(v<=dlimit(u)){u.dlimit=v;u.dlimitNext=null}else u.dlimitNext={v,at:now()+DAY};persist();return pub(u)});
R('POST',/^\/api\/exclude$/,(req,res,u,P,b)=>{const d=b.days;if(![1,7,30,180,365].includes(d))throw E('Choose a period.');u.exUntil=Math.max(u.exUntil||0,now()+d*DAY);persist();return pub(u)});
R('POST',/^\/api\/paystack\/webhook$/,async(req,res)=>{if(!PSK)throw Object.assign(E('Not enabled.'),{status:404});
 const sig=String(req.headers['x-paystack-signature']||'');if(!sig||!same(sig,crypto.createHmac('sha512',PSK).update(req.raw).digest('hex')))throw Object.assign(E('Bad signature.'),{status:401});
 const ev=JSON.parse(req.raw),d=ev.data||{};
 if(ev.event==='charge.success')await settleDeposit(d.reference);
 else if(/^transfer\./.test(ev.event||'')){const t=db.tx.find(x=>x.ref===d.reference&&x.type==='withdraw');if(t){if(ev.event==='transfer.success'&&t.status!=='failed'){t.status='paid';persist()}else if(ev.event==='transfer.failed'||ev.event==='transfer.reversed')refundWd(t,'failed')}}
 return{ok:true}},false);
R('GET',/^\/api\/admin\/pending$/,(req)=>{adminOnly(req);return{withdrawals:db.tx.filter(x=>x.type==='withdraw'&&x.status==='pending').map(x=>({id:x.id,user:x.user,amt:x.amt})),kyc:Object.values(db.users).filter(x=>x.kyc==='pending').map(x=>({email:x.email,name:x.name}))}},false);
R('POST',/^\/api\/admin\/kyc$/,(req,res,u,P,b)=>{adminOnly(req);const x=db.users[String(b.email).toLowerCase()];if(!x||!['approved','rejected','pending'].includes(b.status))throw E('Unknown user or status.');x.kyc=b.status;audit('kyc '+b.status,x.email);persist();return{ok:true}},false);
const refCode=()=>{const L='ABCDEFGHJKMNPQRSTUVWXYZ23456789';let r;do{r='LW-'+Array.from({length:6},()=>L[crypto.randomInt(L.length)]).join('')}while(db.tx.some(x=>x.ref===r));return r};
const manual=()=>{if(!MANUAL)throw E('Not available.')};
R('POST',/^\/api\/deposit\/request$/,(req,res,u,P,b)=>{manual();exclCheck(u);const amt=b.amount;
 if(!Number.isInteger(amt)||amt<500||amt>500000)throw E('Deposit between ₦500 and ₦500,000.');
 if(db.tx.some(x=>x.user===u.email&&x.type==='deposit'&&['awaiting','submitted'].includes(x.status)))throw E('You already have an open deposit request. Complete or cancel it first.');
 const used=sumTx(u.email,'deposit',['awaiting','submitted','success']);if(used+amt>dlimit(u))throw E(`Your daily deposit limit is ₦${dlimit(u).toLocaleString()}. You have ₦${Math.max(0,dlimit(u)-used).toLocaleString()} left today.`);
 const t={id:uid(),ref:refCode(),user:u.email,type:'deposit',amt,status:'awaiting',t:now()};db.tx.push(t);persist();return{id:t.id,ref:t.ref,amt,status:t.status}});
const own=(u,id,sts)=>{const t=db.tx.find(x=>x.id===id&&x.user===u.email&&x.type==='deposit'&&sts.includes(x.status));if(!t)throw E('Request not found.');return t};
R('POST',/^\/api\/deposit\/paid$/,(req,res,u,P,b)=>{manual();const t=own(u,b.id,['awaiting']);t.status='submitted';t.paidAt=now();persist();return{ok:true}});
R('POST',/^\/api\/deposit\/cancel$/,(req,res,u,P,b)=>{manual();const t=own(u,b.id,['awaiting']);t.status='cancelled';persist();return{ok:true}});
R('GET',/^\/api\/admin\/overview$/,req=>{adminOnly(req);const U=db.users,nm=e=>U[e]?.name||e,us=Object.values(U);
 const day=type=>db.tx.filter(x=>x.type===type&&now()-x.t<DAY&&['success','paid','pending','processing'].includes(x.status)).reduce((a,x)=>a+x.amt,0);
 return{live:LIVE,manual:MANUAL,
  deposits:db.tx.filter(x=>x.type==='deposit'&&['awaiting','submitted'].includes(x.status)).map(x=>({id:x.id,ref:x.ref,name:nm(x.user),email:x.user,amt:x.amt,status:x.status,t:x.t})),
  withdrawals:db.tx.filter(x=>x.type==='withdraw'&&x.status==='pending').map(x=>({id:x.id,name:nm(x.user),email:x.user,amt:x.amt,t:x.t,bank:x.bank||null,kyc:U[x.user]?.kyc})),
  kyc:us.filter(x=>x.kyc==='pending').map(x=>({email:x.email,name:x.name})),
  stats:{players:us.length,balances:us.reduce((a,x)=>a+x.bal,0),escrow:us.reduce((a,x)=>a+escrowOf(x.email),0),fees:Object.values(db.matches).reduce((a,m)=>a+(m.payout?.fee||0),0),depositsToday:day('deposit'),withdrawalsToday:day('withdraw')},
  players:us.sort((a,b)=>(b.created||0)-(a.created||0)).slice(0,300).map(x=>({name:x.name,email:x.email,bal:x.bal,kyc:x.kyc,excluded:(x.exUntil||0)>now()})),
  recent:(db.audit||[]).slice(-30).reverse()}},false);
R('POST',/^\/api\/admin\/deposits\/(\w+)$/,(req,res,u,P,b)=>{adminOnly(req);const t=db.tx.find(x=>x.id===P[1]&&x.type==='deposit'&&['awaiting','submitted'].includes(x.status));if(!t)throw E('No such open deposit (it may already be handled).');
 if(b.action==='approve'){const amt=b.amount===undefined?t.amt:b.amount;if(!Number.isInteger(amt)||amt<100||amt>500000)throw E('Invalid amount.');
  t.requested=t.amt;t.amt=amt;t.status='success';db.users[t.user].bal+=amt;log(t.user,amt,'manual deposit '+t.ref);audit('deposit approved',t.ref,t.user+' '+amt)}
 else if(b.action==='reject'){t.status='rejected';audit('deposit rejected',t.ref,t.user)}else throw E('Use approve or reject.');
 persist();return{ok:true}},false);
R('POST',/^\/api\/admin\/withdrawals\/(\w+)$/,async(req,res,u,P,b)=>{adminOnly(req);const t=db.tx.find(x=>x.id===P[1]&&x.type==='withdraw'&&x.status==='pending');if(!t)throw E('No such pending withdrawal (it may already be handled).');
 if(b.action==='paid'&&MANUAL){t.status='paid';t.note=clean(b.note,100);audit('withdrawal paid',t.ref,t.user+' '+t.amt+' '+t.note)}
 else if(b.action==='approve'&&PSK)await sendTransfer(t);
 else if(b.action==='reject'){refundWd(t,'rejected');audit('withdrawal rejected',t.ref,t.user)}else throw E('Invalid action.');
 persist();return{ok:true,status:t.status}},false);
// ---- http
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.apk':'application/vnd.android.package-archive'};
function serve(req,res,p){if(p==='/admin')p='/admin.html';let f;try{f=path.normalize(path.join(PUB,p==='/'?'index.html':decodeURIComponent(p)))}catch{f=''}
 if(!f.startsWith(PUB)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404,{'Content-Type':'text/plain'});return res.end('Not found')}
 const ext=path.extname(f),h={'Content-Type':MIME[ext]||'application/octet-stream','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Cache-Control':ext==='.html'||/sw\.js$|auth\.js$|app\.js$/.test(f)?'no-cache':'public, max-age=3600'};
 if(/admin\.html$/.test(f))h['X-Robots-Tag']='noindex';
 if(ext==='.apk')h['Content-Disposition']='attachment; filename="ludowhot.apk"';
 res.writeHead(200,h);fs.createReadStream(f).pipe(res)}
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://x'),p=url.pathname;
 if(!p.startsWith('/api/'))return req.method==='GET'||req.method==='HEAD'?serve(req,res,p):(res.writeHead(405),res.end());
 const r=routes.find(x=>x.m===req.method&&x.re.test(p));
 const out=(c,o)=>{if(res.writableEnded)return;res.writeHead(c,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(o))};
 if(!r)return out(404,{error:'Not found.'});
 let raw='';req.on('data',d=>{raw+=d;if(raw.length>20000)req.destroy()});
 req.on('end',async()=>{try{
  if(req.method!=='GET'&&req.method!=='DELETE'&&!/application\/json/.test(req.headers['content-type']||''))return out(415,{error:'Bad request.'});
  let b={};try{b=raw?JSON.parse(raw):{}}catch{return out(400,{error:'Bad request.'})}
  const u=sess(req);if(r.auth&&!u)return out(401,{error:'Please log in.'});
  const ip=(req.headers['x-forwarded-for']||req.socket.remoteAddress||'').split(',')[0].trim();
  req.raw=raw;const o=await r.fn(req,res,u,r.re.exec(p),b,ip);if(o!==undefined){persist();out(200,o)}
 }catch(e){if(!e.status)console.error(e);out(e.status||500,{error:e.status?e.message:'Server error. Try again.'})}})
}).listen(PORT,()=>console.log('Ludowhot listening on '+PORT+(DEMO?' (demo funds on)':'')));
