const $=id=>document.getElementById(id),fmt=n=>'₦'+Math.round(n).toLocaleString(),E=s=>String(s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const api=(m,u,b)=>A.req(m,u,b);
const user=await A.me();
let bal=user?user.bal:0,esc=user?user.escrow:0,mid=null,mv=null,es=null,sel=0,lg=null,filt='All',CH=[],lastCfg=null;
function toast(t){const e=$('toast');e.textContent=t;e.classList.remove('opacity-0');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.add('opacity-0'),2600)}
const upd=()=>{$('bal').textContent=$('bal2').textContent=fmt(bal);$('esc').textContent=fmt(esc)};
const sync=m=>{if(m){bal=m.bal;esc=m.escrow}upd()};
function needLogin(){toast('Log in or sign up to play for stakes');setTimeout(()=>location.href='login.html?next=index.html',1200)}
if(user){$('guest').classList.add('hidden');$('usr').classList.replace('hidden','flex');$('uname').textContent=user.name;$('logout').onclick=async()=>{await A.logout();location.reload()}}
upd();
/* ===== Whot table view ===== */
const SHP={'●':'<circle cx="12" cy="12" r="10"/>','▲':'<path d="M12 2 23 22H1z"/>','✚':'<path d="M8 2h8v6h6v8h-6v6H8v-6H2V8h6z"/>','■':'<rect x="3" y="3" width="18" height="18"/>','★':'<path d="m12 1.5 3 7.3 7.9.6-6 5.2 1.9 7.7L12 18l-6.8 4.3 1.9-7.7-6-5.2 7.9-.6z"/>'},SN={'●':'circle','▲':'triangle','✚':'cross','■':'square','★':'star'};
const shp=(s,c='')=>`<svg class="${c}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${SHP[s]||''}</svg>`;
function wface(c,{i,cls='',tag='button',lg=0,style=''}={}){const w=c.s==='W',k=c.n+(w?'':shp(c.s));
 return `<${tag} ${i!=null?`data-i="${i}"`:''} class="wf ${lg?'lg ':''}${cls}" style="${style}" aria-label="${w?'Whot 20':c.n+' '+SN[c.s]}"><i>${k}</i>${w?'<b class="wm">Whot!</b>':shp(c.s,'big')}<i class="r">${k}</i></${tag}>`}
function wview(o){const n=o.hand.length,step=Math.min(40,266/Math.max(1,n-1)),mid=(n-1)/2,rot=Math.min(6,30/Math.max(n,1)),nb=Math.min(o.oppN,10);
 return `<div class="wtable"><div class="text-center"><span class="pill">${o.opp}</span> <span class="pill !px-2">${o.oppN}</span></div>
 <div class="mt-2 flex justify-center">${Array.from({length:nb},(_,k)=>`<div class="wf wb" style="width:38px;height:54px;margin-left:${k?-18:0}px;transform:rotate(${((k-(nb-1)/2)*5).toFixed(1)}deg)">Whot!</div>`).join('')}</div>
 <div class="my-auto flex items-center justify-center gap-6 py-4">${wface(o.top,{tag:'div',lg:1,style:'transform:rotate(-6deg)'})}<div class="text-center"><button id="wd" class="wf wb lg" aria-label="Draw from market">Whot!${o.pend?'<br>+'+o.pend:''}</button><div class="mt-1 text-xs font-bold text-white/70">Market</div></div><div class="w-8 text-white">${o.want?shp(o.want,'mx-auto h-7 w-7'):''}</div></div>
 <div class="text-center text-sm font-bold text-[#f3d98a]" role="status">${o.msg}</div>
 ${o.sel?`<div class="my-2 flex justify-center gap-2">${Object.keys(SHP).map(s=>`<button class="sp" data-s="${s}" aria-label="${SN[s]}">${shp(s,'h-6 w-6')}</button>`).join('')}</div>`:''}
 <div class="wh mt-3 flex min-h-[120px] items-end justify-center pt-4">${o.hand.map((x,i)=>wface(x.c,{i,cls:x.pl?'pl':'',style:`--m:${i?step-64:0}px;--r:${((i-mid)*rot).toFixed(1)}deg`})).join('')}</div></div>`}
/* ===== Rules, lounge, tour ===== */
const RD={hold:true,pick2:true,susp:true,gm:true,defense:false};
let rules=(()=>{try{return{...RD,...JSON.parse(localStorage.getItem('capper_rules'))}}catch{return{...RD}}})();
const defRules=()=>Object.keys(RD).every(k=>rules[k]===RD[k]),saveRules=()=>{try{localStorage.setItem('capper_rules',JSON.stringify(rules))}catch{}};
const show=id=>{$(id).classList.remove('hidden');$(id).classList.add('flex')},hide=id=>{$(id).classList.add('hidden');$(id).classList.remove('flex')};
const RS=[['hold','Hold on','Card 1: play again'],['pick2','Pick two','Card 2: opponent picks two'],['susp','Suspension','Card 8: opponent skips a turn'],['gm','General market','Card 14: everyone else picks one']];
const sumRules=()=>$('lg-rs').textContent=defRules()?'Standard rules, no pick defense':'Custom rules';
function renderRules(){$('rl-list').innerHTML=RS.map(([k,t,d])=>`<label class="flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/5 p-4"><span><b class="block">${t}</b><span class="text-sm text-white/70">${d}</span></span><input type="checkbox" role="switch" data-k="${k}" class="h-6 w-6 accent-[#c4f25a]" ${rules[k]?'checked':''}></label>`).join('');$('rl-def').value=rules.defense?'1':'0'}
$('rl-list').onchange=e=>{const k=e.target.dataset.k;if(k){rules[k]=e.target.checked;saveRules()}};
$('rl-def').onchange=e=>{rules.defense=e.target.value==='1';saveRules()};
$('rl-reset').onclick=()=>{rules={...RD};saveRules();renderRules()};
$('rl-done').onclick=()=>{hide('rules');sumRules()};
$('lg-rules').onclick=()=>{renderRules();show('rules')};

/* ===== Ludo view ===== */
const LS=[0,26],LSAFE=[0,13,26,39],LR=110,LC=150,LCOL=['#0cb35b','#e5484d'];
const lxy=(a,r=LR)=>{const t=a/52*2*Math.PI-Math.PI/2;return[LC+r*Math.cos(t),LC+r*Math.sin(t)]};
const lat=(p,q)=>q<0?lxy(LS[p],LR+26):q<=50?lxy((LS[p]+q)%52):q<=55?lxy((LS[p]+50)%52,LR-18*(q-50)):[LC,LC];
function ludoView(v){let s='<svg viewBox="0 0 300 300" class="mx-auto w-full max-w-[300px]" role="img" aria-label="Ludo board">';
 for(let a=0;a<52;a++){const[x,y]=lxy(a);s+=`<circle cx="${x}" cy="${y}" r="${LS.includes(a)?6.5:4.5}" fill="${a===LS[0]?LCOL[0]:a===LS[1]?LCOL[1]:'#dfe6e2'}" stroke="${LSAFE.includes(a)?'#8a958f':'none'}"/>`}
 [0,1].forEach(p=>{for(let q=51;q<=55;q++){const[x,y]=lat(p,q);s+=`<circle cx="${x}" cy="${y}" r="4.5" fill="${LCOL[p]}" opacity=".35"/>`}});
 s+=`<circle cx="${LC}" cy="${LC}" r="11" fill="#fff" stroke="#0cb35b" stroke-width="3"/>`;
 [0,1].forEach(p=>{const[x,y]=lat(p,v.P[p]),off=v.P[0]===v.P[1]&&v.P[0]>=0?(p?4:-4):0;s+=`<circle cx="${x+off}" cy="${y}" r="9" fill="${LCOL[p]}" stroke="#fff" stroke-width="2.5"/>`});
 s+='</svg>';const l=v.last,mine=v.turn==='me'&&!v.over;
 const msg=v.over?(v.win?'You reached home!':'Opponent reached home'):l?`${l.me?'You':'Opponent'} rolled ${l.die}${l.sent?', sent home!':l.moved?'':', no move'}. ${mine?'Your turn.':'Waiting for opponent.'}`:mine?'Roll a 6 to leave base. Your turn.':'Opponent goes first.';
 return s+`<div class="mt-2 flex items-center justify-center gap-4"><div class="die">${v.die||'–'}</div><button id="lr" class="gbtn rounded-lg px-6 py-3 font-bold ${mine?'':'opacity-40'}">Roll dice</button></div><div class="mt-3 text-center text-sm font-bold text-sb-dark" role="status">${msg}</div>
 <p class="mt-2 text-center text-[11px] text-gray-600"><span style="color:${LCOL[v.side]}">●</span> You, <span style="color:${LCOL[1-v.side]}">●</span> ${E(v.opp)}. Roll 6 to leave base and roll again. Land on a rival to send them home. Grey rings are safe.</p>`}
/* ===== lobby ===== */
function renderLobby(){const L=CH.filter(c=>filt==='All'||c.game===filt);
 $('lobby-list').innerHTML=L.length?L.map(c=>`<div class="flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-0 ${c.mine?'bg-sb/10':''}"><div class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sb-bar font-bold text-white">${E(c.name[0])}</div><div class="min-w-0 flex-1"><div class="truncate font-semibold">${E(c.name)}</div><div class="text-xs text-gray-600">${c.game}, ${fmt(c.stake)} stake</div></div><div class="hidden text-right text-xs text-gray-600 sm:block">Win<br><b class="text-sm text-sb-dark">${fmt(c.stake*1.8)}</b></div>${c.mine?`<button data-x="${c.id}" class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-bold">Cancel</button>`:`<button data-id="${c.id}" class="acc gbtn rounded-lg px-4 py-2 text-sm font-bold">Accept</button>`}</div>`).join(''):'<p class="p-6 text-center text-gray-500">No open challenges. Post one!</p>'}
async function poll(){try{const d=await api('GET','/api/lobby');CH=d.challenges;$('online').textContent=Math.max(1,d.online).toLocaleString();renderLobby();
 if(user){const m=await api('GET','/api/me');sync(m);if(m.active&&!mid)openMatch(m.active)}}catch{}}
$('lobby-list').onclick=async e=>{const x=e.target.closest('[data-x]');if(x){try{sync(await api('DELETE','/api/challenges/'+x.dataset.x));poll()}catch(er){toast(er.message)}return}
 const b=e.target.closest('.acc');if(!b)return;const c=CH.find(y=>y.id===b.dataset.id);if(c)startMatch(c.game,c.stake,c.name,'p2p',c.id)};
$('tabs').onclick=e=>{const b=e.target.closest('.tab');if(!b)return;filt=b.dataset.f;[...$('tabs').children].forEach(x=>x.classList.toggle('on',x===b));renderLobby()};
const cw=()=>$('cw').textContent=fmt((+$('cs').value||0)*1.8);$('cs').oninput=cw;cw();
$('post').onclick=async()=>{if(!user)return needLogin();try{sync(await api('POST','/api/challenges',{game:$('cg').value,stake:+$('cs').value,rules}));toast('Challenge posted. Waiting for an opponent.');poll()}catch(e){toast(e.message)}};
$('fund').onclick=async()=>{if(!user)return needLogin();try{sync(await api('POST','/api/fund'));toast('Demo funds added')}catch(e){toast(e.message)}};
let bgame='Whot',bstake=500;const bw=()=>$('bw').textContent=fmt(bstake*1.8);
$('bg').onclick=e=>{const b=e.target.closest('.chip');if(!b)return;bgame=b.dataset.g;[...$('bg').children].forEach(x=>x.classList.toggle('on',x===b))};
$('bs').onclick=e=>{const b=e.target.closest('.chip');if(!b)return;bstake=+b.dataset.s;[...$('bs').children].forEach(x=>x.classList.toggle('on',x===b));bw()};
$('botgo').onclick=()=>startMatch(bgame,bstake,'Ludowhot Bot','bot');bw();
/* ===== lounge ===== */
function startMatch(game,stake,opp,mode,chId){
 if(mid||lg)return;if(!user)return needLogin();if(bal<stake&&mode==='bot'||bal<stake&&mode==='p2p'){toast('Not enough balance. Add funds first.');return}
 lg={game,stake,opp,mode,chId};
 $('lg-id').textContent='Assigned when the match starts';
 $('lg-pot').textContent=`Stake ${fmt(stake)} each. Pot ${fmt(stake*2)}. Winner gets ${fmt(stake*1.8)}.`;
 const row=(n,b)=>`<li class="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 p-3"><span class="grid h-10 w-10 place-items-center rounded-full bg-[#f3d98a] font-bold text-sb-deep">${E(n[0])}</span><span class="flex-1"><b>${E(n)}</b> <span class="ml-1 rounded bg-white/10 px-1.5 py-0.5 text-xs">${b}</span><span class="block text-sm text-[#7ee2a8]">Ready</span></span></li>`;
 $('lg-players').innerHTML=row(user.name,'You')+row(opp,mode==='bot'?'Bot':'Player');
 $('lg-rules').classList.toggle('hidden',game!=='Whot');sumRules();$('lg-start').textContent='Start game, stake '+fmt(stake);show('lounge');$('lg-start').focus()}
$('lg-start').onclick=async()=>{const p=lg;if(!p)return;lastCfg=p;
 try{const r=p.mode==='bot'?await api('POST','/api/bot',{game:p.game,stake:p.stake,rules}):await api('POST','/api/challenges/'+p.chId+'/accept');lg=null;hide('lounge');openMatch(r.id)}
 catch(e){lg=null;hide('lounge');toast(e.message);poll()}};
$('lg-leave').onclick=()=>{lg=null;hide('lounge')};
/* ===== match ===== */
function openMatch(id){mid=id;mv=null;sel=0;$('res').classList.add('hidden');$('res').classList.remove('flex');$('arena').classList.replace('hidden','flex');
 if(es)es.close();es=new EventSource('/api/matches/'+id+'/events');es.onmessage=()=>load();load()}
async function load(){if(!mid)return;try{mv=await api('GET','/api/matches/'+mid);render()}catch(e){toast(e.message)}}
const wmsg=v=>{const l=v.last,w=l&&(l.me?'You':'Opponent');if(v.over)return v.win?'You finished all your cards!':'Opponent finished all their cards';
 if(!l)return v.turn==='me'?'Your move: match the shape or number':'Opponent goes first';
 const t=v.turn==='me'?'Your turn.':'Waiting for opponent.';
 return l.act==='draw'?`${w} drew ${l.n} card${l.n>1?'s':''}. ${t}`:`${w} played ${l.card.s==='W'?'Whot':l.card.n+' '+SN[l.card.s]}${l.shape?', chose '+SN[l.shape]:''}. ${t}`};
function render(){const v=mv;$('mt').textContent=v.game+', vs '+v.opp;$('ms').textContent='Stake '+fmt(v.stake)+' each. Pot '+fmt(v.pot)+' in escrow. Match '+v.id;
 $('board').innerHTML=v.game==='Whot'?wview({opp:E(v.opp),oppN:v.oppN,top:v.top,want:v.want,pend:v.pend,msg:wmsg(v),sel:!!sel,hand:v.hand.map(c=>({c:{s:c.s,n:c.n},pl:c.ok&&!sel}))}):ludoView(v);
 if(v.over){$('res').classList.remove('hidden');$('res').classList.add('flex');$('rt').textContent=v.win?'You won':'You lost';
  $('rb').innerHTML=v.win?`Pot ${fmt(v.pot)}<br>Platform fee (10%) –${fmt(v.pot*.1)}<br><b class="text-lg text-sb-dark">${fmt(v.payout)} paid to your wallet</b>`:`Your ${fmt(v.stake)} stake went to ${v.bot?'the house':E(v.opp)}.`;
  api('GET','/api/me').then(sync).catch(()=>{})}}
async function send(b){try{mv=await api('POST','/api/matches/'+mid+'/move',b);render()}catch(x){toast(x.message);load()}}
$('board').onclick=e=>{if(!mv||mv.over||mv.turn!=='me')return;
 if(mv.game==='Ludo'){if(e.target.closest('#lr'))send({type:'roll'});return}
 const s=e.target.closest('.sp');if(s&&sel){const i=sel-1;sel=0;send({type:'play',i,shape:s.dataset.s});return}
 if(sel)return;if(e.target.closest('#wd'))return send({type:'draw'});
 const b=e.target.closest('.wf[data-i]');if(!b)return;const i=+b.dataset.i,c=mv.hand[i];if(!c||!c.ok)return;
 if(c.s==='W'){sel=i+1;render();return}send({type:'play',i})};
const closeArena=()=>{if(es)es.close();es=null;mid=null;mv=null;$('arena').classList.replace('flex','hidden')};
$('leave').onclick=async()=>{if(mv&&!mv.over){if(confirm('Leave now? You forfeit your stake.')){await send({type:'forfeit'})}}else closeArena()};
$('done').onclick=closeArena;
$('again').onclick=()=>{const c=lastCfg;closeArena();if(c){const ch=c.mode==='p2p'?null:c;ch?startMatch(c.game,c.stake,c.opp,'bot'):poll()}};
addEventListener('keydown',e=>{if(e.key!=='Escape')return;for(const id of['rules','tour','lounge'])if(!$(id).classList.contains('hidden')){id==='lounge'?$('lg-leave').click():id==='tour'?endTour():hide(id);return}if(!$('arena').classList.contains('hidden'))$('leave').click()});
A.initInstall(()=>toast('Ludowhot installed'));
poll();setInterval(poll,3000);
const TS=[['Welcome to Ludowhot','Whot and Ludo against real players or a bot. Quick rounds, real strategy, and a pot to win.',[['★',8],['✚',5],['W',20],['■',14],['●',1]]],
['Your turn','Play a card with the same shape or number as the pile. Nothing to play? Tap the market to draw.',[['▲',5],['●',10],['■',3]]],
['Watch for action cards','Pick Two makes your opponent draw. Hold On and Suspension give you another turn. General Market makes everyone else draw. Whot is wild: choose any shape.',[['✚',2],['W',20],['●',1]]],
['Stakes stay in escrow','Both stakes lock in escrow before the game starts and the winner is paid to their wallet. Funds are demo funds until payments go live.',[['★',7],['▲',7]]]];
let ti=0;
function tour(i){ti=i;const t=TS[i],n=t[2].length;
 $('tr-art').innerHTML=t[2].map(([s,v],k)=>wface({s,n:v},{tag:'div',lg:1,style:`margin-left:${k?-28:0}px;transform:rotate(${((k-(n-1)/2)*9).toFixed(1)}deg)`})).join('');
 $('tr-h').textContent=t[0];$('tr-p').textContent=t[1];
 $('tr-dots').innerHTML=TS.map((_,k)=>`<span class="h-2 rounded-full ${k===i?'w-7 bg-[#c4f25a]':'w-2 bg-white/25'}"></span>`).join('');
 $('tr-next').textContent=i===TS.length-1?'Start playing':'Next';show('tour')}
const endTour=()=>{hide('tour');try{localStorage.setItem('capper_tour','1')}catch{}};
$('tr-next').onclick=()=>ti<TS.length-1?tour(ti+1):endTour();$('tr-skip').onclick=endTour;
document.querySelectorAll('.ht').forEach(b=>b.onclick=()=>tour(0));
try{if(!localStorage.getItem('capper_tour'))setTimeout(()=>tour(0),600)}catch{}
