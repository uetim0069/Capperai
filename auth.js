const A={
 async req(m,u,b){const r=await fetch(u,{method:m,headers:b?{'content-type':'application/json'}:{},body:b?JSON.stringify(b):undefined,credentials:'same-origin'});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Something went wrong. Try again.');return d},
 async me(){try{return await this.req('GET','/api/me')}catch{return null}},
 signup(name,email,password){return this.req('POST','/api/signup',{name,email,password,age18:true})},
 login(email,password){return this.req('POST','/api/login',{email,password})},
 async logout(){try{await this.req('POST','/api/logout',{})}catch{}},
 next(){const n=new URLSearchParams(location.search).get('next');return n&&/^[\w.-]+\.html$/.test(n)?n:'index.html'},
 initInstall(cb){let dip=null;
  addEventListener('beforeinstallprompt',e=>{e.preventDefault();dip=e});
  addEventListener('appinstalled',()=>{dip=null;cb&&cb()});
  document.querySelectorAll('.inst').forEach(b=>b.onclick=async()=>{
   if(dip){dip.prompt();await dip.userChoice;dip=null;return}
   let d=document.getElementById('how');
   if(!d){d=document.createElement('dialog');d.id='how';d.className='max-w-sm rounded-2xl p-6 text-sm backdrop:bg-black/70';
    d.innerHTML='<h3 class="font-head text-2xl font-bold text-sb-dark">Install Ludowhot</h3><p class="mt-3"><b>Android (Chrome):</b> tap the ⋮ menu, then Install app or Add to Home screen. You can also download the APK from the home page.</p><p class="mt-2"><b>iPhone (Safari):</b> tap Share, then Add to Home Screen.</p><form method="dialog"><button class="gbtn mt-4 w-full rounded-lg py-2.5 font-bold">Got it</button></form>';document.body.appendChild(d)}
   d.showModal()});
  if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{})}
};
