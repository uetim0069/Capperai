'use strict';
const crypto=require('crypto');
const E=m=>{const e=new Error(m);e.status=400;return e};
const SH=['●','▲','✚','■','★'],RD={hold:true,pick2:true,susp:true,gm:true,defense:false};
const rnd=n=>crypto.randomInt(n);
const shuf=a=>{for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
const cleanRules=r=>{const o={...RD};if(r&&typeof r==='object')for(const k of Object.keys(RD))if(typeof r[k]==='boolean')o[k]=r[k];return o};
function take(g,p,n){const h=g.H[p];for(let i=0;i<n;i++){if(!g.deck.length){const t=g.disc.pop();g.deck=shuf(g.disc);g.disc=[t]}if(g.deck.length)h.push(g.deck.pop())}}
const ok=(g,c)=>g.pend?(g.rules.defense&&c.n===2):c.s==='W'||(g.want?c.s===g.want:(c.s===g.top.s||c.n===g.top.n));
const whot={
 create(rules){const deck=[];SH.forEach(s=>[1,2,3,4,5,7,8,10,11,12,13,14].forEach(n=>deck.push({s,n})));for(let i=0;i<5;i++)deck.push({s:'W',n:20});shuf(deck);
  const g={deck,disc:[],H:[[],[]],top:null,turn:rnd(2),pend:0,want:null,rules:cleanRules(rules),over:false,winner:null,last:null};
  take(g,0,6);take(g,1,6);let t;do{t=g.deck.pop()}while(t.s==='W'||[1,2,8,14].includes(t.n));g.top=t;g.disc=[t];return g},
 play(g,p,i,shape){
  if(g.over||g.turn!==p)throw E('It is not your turn.');const h=g.H[p],c=h[i];
  if(!Number.isInteger(i)||!c||!ok(g,c))throw E('That card cannot be played.');
  if(c.s==='W'&&!SH.includes(shape))throw E('Choose a shape.');
  h.splice(i,1);g.disc.push(c);g.top=c;g.want=null;g.last={by:p,act:'play',card:c,shape:c.s==='W'?shape:undefined};
  if(!h.length){g.over=true;g.winner=p;return}
  const o=1-p,R=g.rules;let again=false;
  if(c.n===2&&R.pick2){if(R.defense)g.pend+=2;else{take(g,o,2);again=true}}
  else if((c.n===1&&R.hold)||(c.n===8&&R.susp))again=true;
  else if(c.n===14&&R.gm){take(g,o,1);again=true}
  else if(c.s==='W')g.want=shape;
  g.turn=again?p:o},
 draw(g,p){if(g.over||g.turn!==p)throw E('It is not your turn.');const n=g.pend||1;take(g,p,n);g.pend=0;g.last={by:p,act:'draw',n};g.turn=1-p},
 bot(g,p){const h=g.H[p],pl=h.map((c,i)=>[c,i]).filter(([c])=>ok(g,c));
  if(!pl.length)return this.draw(g,p);const [c,i]=pl.find(([c])=>c.s!=='W')||pl[0];let shape;
  if(c.s==='W'){const k={};h.forEach(x=>{if(x.s!=='W')k[x.s]=(k[x.s]||0)+1});shape=Object.keys(k).sort((a,b)=>k[b]-k[a])[0]||SH[0]}
  this.play(g,p,i,shape)},
 view(g,p){const l=g.last;return{hand:g.H[p].map(c=>({...c,ok:g.turn===p&&!g.over&&ok(g,c)})),oppN:g.H[1-p].length,top:g.top,want:g.want,pend:g.pend,turn:g.turn===p?'me':'opp',last:l&&{me:l.by===p,act:l.act,card:l.card,shape:l.shape,n:l.n}}}
};
const S=[0,26],SAFE=[0,13,26,39];
const ludo={
 create(){return{P:[-1,-1],turn:rnd(2),die:0,over:false,winner:null,last:null}},
 roll(g,p){if(g.over||g.turn!==p)throw E('It is not your turn.');const die=g.die=1+rnd(6),q=g.P[p];let moved=false,sent=false;
  if(q<0){if(die===6){g.P[p]=0;moved=true}}else if(q+die<=56){g.P[p]=q+die;moved=true}
  if(moved&&g.P[p]<=50){const a=(S[p]+g.P[p])%52,o=1-p;if(g.P[o]>=0&&g.P[o]<=50&&(S[o]+g.P[o])%52===a&&!SAFE.includes(a)){g.P[o]=-1;sent=true}}
  g.last={by:p,die,moved,sent};
  if(g.P[p]===56){g.over=true;g.winner=p;return}
  g.turn=moved&&die===6?p:1-p},
 view(g,p){const l=g.last;return{P:g.P,side:p,die:g.die,turn:g.turn===p?'me':'opp',last:l&&{me:l.by===p,die:l.die,moved:l.moved,sent:l.sent}}}
};
module.exports={whot,ludo,E,cleanRules};
