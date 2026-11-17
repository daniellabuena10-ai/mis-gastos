
/* ================= Datos base ================= */
const COLORS=["#2f6b4f","#d97706","#2563eb","#7c3aed","#0891b2","#db2777","#ea580c","#16a34a","#4f46e5","#0d9488","#be123c","#6b7280","#ca8a04","#9333ea","#0284c7","#65a30d"];
const EMOJIS=["🛒","🍽️","🚗","🏠","💡","🎉","🛍️","💊","📱","✈️","🎁","📦","☕","🍺","⛽","🚌","🏋️","🐶","👶","🎓","💇","🎮","📚","🎬","🧾","🏦","💳","🔧","👕","💄","🌿","🍔","💼","💶","🏷️","📈","🤝","🪙","🏆","❤️"];
const DEF_GASTO=[
  {id:"comida",n:"Comida",e:"🛒",i:"cart",c:"#2f6b4f"},{id:"restaurantes",n:"Restaurantes",e:"🍽️",i:"utensils",c:"#d97706"},
  {id:"transporte",n:"Transporte",e:"🚗",i:"car",c:"#2563eb"},{id:"casa",n:"Casa",e:"🏠",i:"home",c:"#7c3aed"},
  {id:"facturas",n:"Facturas",e:"💡",i:"bolt",c:"#0891b2"},{id:"ocio",n:"Ocio",e:"🎉",i:"sparkles",c:"#db2777"},
  {id:"compras",n:"Compras",e:"🛍️",i:"bag",c:"#ea580c"},{id:"salud",n:"Salud",e:"💊",i:"health",c:"#16a34a"},
  {id:"suscripciones",n:"Suscripciones",e:"📱",i:"repeat",c:"#4f46e5"},{id:"viajes",n:"Viajes",e:"✈️",i:"plane",c:"#0d9488"},
  {id:"regalos",n:"Regalos",e:"🎁",i:"gift",c:"#be123c"},{id:"otros",n:"Otros",e:"📦",i:"box",c:"#6b7280"}];
const DEF_ING=[
  {id:"i_nomina",n:"Nómina",e:"💼",i:"briefcase",c:"#15803d"},{id:"i_extra",n:"Extras",e:"💶",i:"coins",c:"#0d9488"},
  {id:"i_ventas",n:"Ventas",e:"🏷️",i:"tag",c:"#2563eb"},{id:"i_otros",n:"Otros ingresos",e:"🪙",i:"coins",c:"#ca8a04"}];
const METODOS=["","Tarjeta","Efectivo","Bizum","Transferencia","Domiciliación"];

const fmt=n=>(+n||0).toLocaleString("es-ES",{style:"currency",currency:"EUR"});
const fmt0=n=>(+n||0).toLocaleString("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0});
const pad=n=>String(n).padStart(2,"0");
const todayStr=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
const monthKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}`;
const esc=s=>String(s??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const num=s=>{s=String(s||"").trim().replace(/\s|€/g,"");if(s.includes(","))s=s.replace(/\./g,"").replace(",",".");else if(/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,"");return parseFloat(s)};
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const money2=v=>Math.round(v*100)/100;

let state={mov:{},fijos:{},metas:{},aj:{presupuesto:0,porCat:{},cats:null,catsIng:null}};
let cur=new Date();cur.setDate(1);
let view="inicio",filtroInicio="todo",q={texto:"",cat:"",tipo:""};
let store=null,loaded={mov:false,fijos:false};

const catsG=()=>state.aj.cats&&state.aj.cats.length?state.aj.cats:DEF_GASTO;
const catsI=()=>state.aj.catsIng&&state.aj.catsIng.length?state.aj.catsIng:DEF_ING;
const catsFor=t=>t==="ingreso"?catsI():catsG();
function catOf(id,tipo){return catsG().find(c=>c.id===id)||catsI().find(c=>c.id===id)||DEF_GASTO.find(c=>c.id===id)||DEF_ING.find(c=>c.id===id)||(tipo==="ingreso"?{id,n:"Otros ingresos",e:"🪙",i:"coins",c:"#ca8a04"}:{id,n:"Otros",e:"📦",i:"box",c:"#6b7280"})}
const icoHTML=(c,cls="")=>`<div class="ico ${cls}" style="--c:${esc(c.c||"#667085")}">${svg(iconOf(c))}</div>`;
const amtHTML=v=>{const s=fmt(v),k=s.lastIndexOf(",");return k<0?esc(s):`${s.slice(0,k)}<small>${s.slice(k)}</small>`};
const tipoOf=m=>m.tipo==="ingreso"?"ingreso":"gasto";

/* ================= Almacenamiento ================= */
const LKEY="mis-gastos-v2";
const local={
  load(){try{const s=JSON.parse(localStorage.getItem(LKEY)||"null");if(s){state={...state,...s,aj:{...state.aj,...(s.aj||{})}}}
    const old=JSON.parse(localStorage.getItem("mis-gastos-v1")||"null");if(old&&old.gastos){Object.assign(state.mov,old.gastos);if(old.ajustes)state.aj={...state.aj,...old.ajustes}}}catch(e){}},
  save(){try{localStorage.setItem(LKEY,JSON.stringify(state))}catch(e){}}
};
const localStore={save(){local.save()},del(){local.save()},saveAj(){local.save()}};

let unsubs=[],me=null;
let ajLoaded=false,onboardShown=false;
function resetState(){ajLoaded=false;onboardShown=false;state={mov:{},fijos:{},metas:{},aj:{presupuesto:0,porCat:{},cats:null,catsIng:null,watchlist:null}};loaded={mov:false,fijos:false};cur=new Date();cur.setDate(1);view="inicio";invMounted=false;const iw=document.getElementById("invWidgets");if(iw)iw.innerHTML=""}
async function initStore(){
  if(!window.firebase||!window.FIREBASE_CONFIG||!FIREBASE_CONFIG.apiKey){document.getElementById("splash").textContent="Falta configurar la app.";return}
  firebase.initializeApp(FIREBASE_CONFIG);
  const auth=firebase.auth(),fdb=firebase.firestore();auth.languageCode="es";
  try{await fdb.enablePersistence({synchronizeTabs:true})}catch(e){}
  window._auth=auth;
  try{if(firebase.messaging&&"serviceWorker" in navigator)firebase.messaging().onMessage(p=>{const n=p.notification||p.data||{};toast(`${n.title||"Ahorra+"}: ${n.body||""}`)})}catch(e){}
  auth.onAuthStateChanged(u=>{
    document.getElementById("splash")?.remove();
    unsubs.forEach(f=>f());unsubs=[];resetState();me=u;
    if(!u){store=null;showAuth();return}
    hideAuth();startData(fdb,u);startGroups(fdb,u);setView("inicio");if(lockCfg())showLock();
    const hm=location.hash.match(/^#unir-([A-Za-z0-9]{10,40})$/);if(hm){history.replaceState(null,"",location.pathname);setTimeout(()=>joinGroup(hm[1]),600)}
  });
}
function startData(fdb,u){
  const base=fdb.collection("users").doc(u.uid);window._base=base;
  const cols={mov:base.collection("gastos"),fijos:base.collection("fijos"),metas:base.collection("metas")};
  const ajRef=base.collection("config").doc("ajustes");
  const fail=e=>{
    if(e&&e.code==="permission-denied")showBanner("No se ha podido guardar: sesión caducada. Cierra sesión y vuelve a entrar.");
    else showBanner("No se ha podido guardar. Revisa tu conexión: se guardará cuando vuelvas a tener internet.");
  };
  hideBanner();
  const timer=setTimeout(()=>showBanner("Cargando tus datos… la conexión va lenta."),10000);
  let pending=3;
  for(const k of ["mov","fijos","metas"]){
    let first=true;
    unsubs.push(cols[k].onSnapshot({includeMetadataChanges:true},snap=>{
      const o={};snap.docs.forEach(d=>{o[d.id]={...d.data(),id:d.id}});state[k]=o;
      if(!snap.metadata.fromCache){
        if(first){first=false;if(--pending===0){clearTimeout(timer);hideBanner()}}
        if(k in loaded&&!loaded[k]){loaded[k]=true;generarFijos();maybeOnboard()}
      }
      render();
    },()=>{clearTimeout(timer);showBanner("No se pudieron cargar tus datos. Comprueba tu conexión.")}));
  }
  unsubs.push(ajRef.onSnapshot(s=>{if(s.exists){const d=s.data();state.aj={presupuesto:d.presupuesto||0,porCat:{...(d.porCat||{})},cats:d.cats||null,catsIng:d.catsIng||null,watchlist:Array.isArray(d.watchlist)?d.watchlist:null,onboarded:!!d.onboarded};render();if(view==="inversion")mountWatchlist()}ajLoaded=true;maybeOnboard()},()=>{}));
  const queues={};
  const serial=(key,fn)=>{queues[key]=(queues[key]||Promise.resolve()).then(fn).catch(fail);return queues[key]};
  store={
    save(k,o){const {id:oid,...body}=o;return serial(k+oid,()=>cols[k].doc(oid).set(JSON.parse(JSON.stringify(body))))},
    del(k,oid){return serial(k+oid,()=>cols[k].doc(oid).delete())},
    saveAj(){return serial("aj",()=>ajRef.set(JSON.parse(JSON.stringify(state.aj))))}
  };
}

/* ================= Acceso ================= */
let authMode="entrar";
const AUTH_ERR={"auth/invalid-email":"Ese email no es válido.","auth/user-not-found":"No hay ninguna cuenta con ese email.","auth/wrong-password":"Contraseña incorrecta.","auth/invalid-credential":"Email o contraseña incorrectos.","auth/invalid-login-credentials":"Email o contraseña incorrectos.","auth/email-already-in-use":"Ya existe una cuenta con ese email. Entra con ella.","auth/weak-password":"La contraseña debe tener al menos 6 caracteres.","auth/too-many-requests":"Demasiados intentos. Espera unos minutos.","auth/network-request-failed":"Sin conexión. Revisa tu internet."};
function showAuth(){document.getElementById("app").hidden=true;const a=document.getElementById("auth");a.hidden=false;drawAuth()}
function hideAuth(){document.getElementById("auth").hidden=true;document.getElementById("app").hidden=false}
function drawAuth(msg="",ok=false){
  const reg=authMode==="crear",rec=authMode==="recuperar";
  document.getElementById("authForm").innerHTML=`
    ${rec?`<h2>Recuperar contraseña</h2><p class="small">Te enviaremos un email para crear una nueva.</p>`:`<div class="seg">${[["entrar","Entrar"],["crear","Crear cuenta"]].map(([k,n])=>`<button type="button" data-m="${k}" class="${authMode===k?"on":""}">${n}</button>`).join("")}</div>`}
    ${reg?`<label class="field small" for="aNombre">Tu nombre<input id="aNombre" autocomplete="name" maxlength="40" placeholder="Ej. Laura"></label>`:""}
    <label class="field small" for="aEmail">Email<input id="aEmail" type="email" autocomplete="email" inputmode="email" placeholder="tu@email.com"></label>
    ${rec?"":`<label class="field small" for="aPass">Contraseña<input id="aPass" type="password" autocomplete="${reg?"new-password":"current-password"}" placeholder="${reg?"Mínimo 6 caracteres":"Tu contraseña"}"></label>`}
    <button class="btn primary" style="width:100%;margin-top:4px" id="aGo">${rec?"Enviar email":reg?"Crear cuenta":"Entrar"}</button>
    <div class="note" style="${ok?"color:var(--pos)":""}" id="aMsg">${esc(msg)}</div>
    ${reg?`<p class="small" style="text-align:center;margin:10px 0 0">Al crear tu cuenta aceptas la <a href="privacidad.html" style="color:var(--accent)">política de privacidad y las condiciones</a>.</p>`:""}
    <div style="text-align:center;margin-top:6px">${rec?`<button type="button" class="link" data-m="entrar">Volver</button>`:reg?"":`<button type="button" class="link" data-m="recuperar">¿Has olvidado la contraseña?</button>`}</div>`;
  const f=document.getElementById("authForm");
  f.querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>{authMode=b.dataset.m;drawAuth()});
  f.onsubmit=async e=>{e.preventDefault();const go=f.querySelector("#aGo"),email=f.querySelector("#aEmail").value.trim();
    go.disabled=true;go.textContent="Un momento…";
    try{
      if(rec){await _auth.sendPasswordResetEmail(email);authMode="entrar";drawAuth("Te hemos enviado un email. Revisa también la carpeta de spam.",true);return}
      const pass=f.querySelector("#aPass").value;
      if(reg){const c=await _auth.createUserWithEmailAndPassword(email,pass);const n=f.querySelector("#aNombre").value.trim();if(n)await c.user.updateProfile({displayName:n})}
      else await _auth.signInWithEmailAndPassword(email,pass);
    }catch(err){drawAuth(AUTH_ERR[err.code]||"No se ha podido completar. Inténtalo de nuevo.");const em=document.getElementById("aEmail");if(em)em.value=email}
  };
}


/* ================= Cuenta ================= */
function openNombre(){
  openSheet(`<h2>Cambiar nombre</h2><label class="field small" for="nNom">Nombre<input id="nNom" maxlength="40" autocomplete="name" value="${esc(me&&me.displayName||"")}"></label>
    <div class="note" id="err"></div><div class="btns"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="ok">Guardar</button></div>`);
  sheet.querySelector("#ok").onclick=async()=>{const n=sheet.querySelector("#nNom").value.trim();if(!n){sheet.querySelector("#err").textContent="Escribe un nombre.";return}
    try{await _auth.currentUser.updateProfile({displayName:n});me=_auth.currentUser;closeSheet();render();toast("Nombre actualizado")}catch(e){sheet.querySelector("#err").textContent="No se ha podido guardar. Revisa tu conexión."}};
}
async function sendReset(){
  try{await _auth.sendPasswordResetEmail(me.email);toast("Te hemos enviado un email para cambiar la contraseña")}catch(e){toast("No se ha podido enviar el email. Revisa tu conexión.")}
}
function openBorrar(){
  openSheet(`<h2>Borrar mi cuenta</h2>
    <div class="hint" style="background:var(--neg-soft);color:var(--neg)">${svg("alert")}<span>Se borrarán <b>para siempre</b> tu cuenta y todos tus movimientos, fijos, metas y ajustes. No se puede deshacer.</span></div>
    <p class="small">Si quieres conservar tus datos, antes usa <b>Exportar a Excel → Todo</b>.</p>
    <label class="field small" for="bPass">Escribe tu contraseña para confirmar<input id="bPass" type="password" autocomplete="current-password"></label>
    <div class="note" id="err"></div>
    <div class="btns"><button class="btn" data-close>Cancelar</button><button class="btn danger" id="ok">Borrar definitivamente</button></div>`);
  sheet.querySelector("#ok").onclick=async function(){
    const pass=sheet.querySelector("#bPass").value,err=sheet.querySelector("#err");if(!pass){err.textContent="Escribe tu contraseña.";return}
    this.disabled=true;this.textContent="Borrando…";
    try{
      const u=_auth.currentUser;
      await u.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(u.email,pass));
      const base=window._base;
      for(const k of ["gastos","fijos","metas","config","tickets"]){const s=await base.collection(k).get();for(const d of s.docs)await d.ref.delete()}
      unsubs.forEach(f=>f());unsubs=[];
      await u.delete();
      closeSheet();toast("Tu cuenta y tus datos se han borrado");
    }catch(e){this.disabled=false;this.textContent="Borrar definitivamente";
      err.textContent=(e.code==="auth/wrong-password"||e.code==="auth/invalid-credential"||e.code==="auth/invalid-login-credentials")?"Contraseña incorrecta.":"No se ha podido borrar. Revisa tu conexión e inténtalo de nuevo."}
  };
}





/* ================= Resumen inteligente ================= */
const normNota=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
function computeInsights(){
  const out=[],all=movsMes(),gs=gastos(all);if(!gs.length&&!Object.keys(state.mov).length)return out;
  // gastos hormiga
  const small=gs.filter(g=>+g.importe<=10);
  if(small.length>=4){const by={};small.forEach(g=>{const k=normNota(g.nota)||catOf(g.cat).n.toLowerCase();by[k]=by[k]||{n:0,v:0,lab:g.nota||catOf(g.cat).n};by[k].n++;by[k].v+=+g.importe});
    const top=Object.values(by).sort((a,b)=>b.v-a.v)[0];
    out.push({ic:"coffee",c:"#f3c969",t:`Gastos hormiga: <b>${fmt0(sum(small))}</b> en ${small.length} compras pequeñas este mes`,d:top&&top.n>1?`Lo que más se repite: ${esc(top.lab)} (${top.n} veces, ${fmt(top.v)}).`:"Pequeñas compras que, sumadas, se notan."})}
  // suscripciones (mismo concepto y precio parecido en 2+ meses, sin ser fijo)
  const since=new Date(cur.getFullYear(),cur.getMonth()-3,1),sk=monthKey(since);
  const grp={};Object.values(state.mov).filter(m=>tipoOf(m)==="gasto"&&!m.fijo&&m.fecha>=sk&&normNota(m.nota)).forEach(m=>{const k=normNota(m.nota);(grp[k]=grp[k]||[]).push(m)});
  const subs=Object.values(grp).filter(l=>{const ms=new Set(l.map(m=>m.fecha.slice(0,7)));if(ms.size<2)return false;const a=l.map(m=>+m.importe),mn=Math.min(...a),mx=Math.max(...a);return mx<=mn*1.15&&mx<=200}).map(l=>({n:l[0].nota,v:+l[l.length-1].importe}));
  if(subs.length)out.push({ic:"repeat",c:"#a5b4fc",t:`Posible${subs.length>1?"s":""} suscripci${subs.length>1?"ones":"ón"}: <b>${subs.slice(0,3).map(s=>esc(s.n)).join(", ")}</b>`,d:`Suman unos ${fmt(sum(subs.map(s=>({importe:s.v}))))} al mes. Puedes convertirlas en gastos fijos o darte de baja de las que no uses.`});
  // categorías que suben
  const prev=gastos(movsMes(new Date(cur.getFullYear(),cur.getMonth()-1,1))),now=new Date(),isThis=monthKey(now)===monthKey(cur),lim=isThis?now.getDate():31;
  const tc={},tp={};gs.forEach(g=>tc[g.cat]=(tc[g.cat]||0)+(+g.importe));prev.filter(g=>+g.fecha.slice(8,10)<=lim).forEach(g=>tp[g.cat]=(tp[g.cat]||0)+(+g.importe));
  const up=Object.keys(tc).map(k=>({k,d:tc[k]-(tp[k]||0),p:tp[k]?(tc[k]-tp[k])/tp[k]:null})).filter(x=>x.d>20&&(x.p===null||x.p>.2)).sort((a,b)=>b.d-a.d)[0];
  if(up){const c=catOf(up.k,"gasto");out.push({ic:iconOf(c),c:c.c,t:`<b>${esc(c.n)}</b>: ${fmt0(up.d)} más que el mes pasado${isThis?" a estas alturas":""}`,d:up.p!==null?`Un ${Math.round(up.p*100)} % más. Si no era algo puntual, quizá merezca un límite.`:"El mes pasado no tuviste gastos en esta categoría."})}
  // día de la semana
  if(gs.length>=8){const dw=[0,0,0,0,0,0,0];gs.forEach(g=>dw[new Date(g.fecha+"T12:00").getDay()]+=+g.importe);const i=dw.indexOf(Math.max(...dw)),names=["los domingos","los lunes","los martes","los miércoles","los jueves","los viernes","los sábados"];
    out.push({ic:"calendar",c:"#7dd3fc",t:`Gastas más <b>${names[i]}</b>`,d:`${fmt0(dw[i])} este mes, el ${Math.round(dw[i]/sum(gs)*100)} % del total.`})}
  // buen ritmo
  const I=sum(ingresos(all)),G=sum(gs);if(I>0&&(I-G)/I>=.2)out.push({ic:"trophy",c:"#2ee59d",t:`¡Buen mes! Estás ahorrando el <b>${Math.round((I-G)/I*100)} %</b> de tus ingresos`,d:"Por encima del 20 % que se suele recomendar."});
  return out;
}
function insightsCard(){const ins=computeInsights();if(!ins.length)return"";
  return `<div class="card"><h3 style="margin-bottom:6px">Resumen inteligente</h3>${ins.map(x=>`<div class="tip">${icoHTML({i:x.ic,c:x.c})}<div><div style="font-weight:600">${x.t}</div><div class="small">${x.d}</div></div></div>`).join("")}</div>`}

/* ================= Ocultar cifras ================= */
function applyHide(){let on=false;try{on=localStorage.getItem("ahorra-hide")==="1"}catch(e){}document.body.classList.toggle("hide-amounts",on);
  const b=document.getElementById("eye");if(b){b.innerHTML=on?svg("eyeOff"):svg("eye");b.setAttribute("aria-label",on?"Mostrar cifras":"Ocultar cifras")}}
function toggleHide(){let on=document.body.classList.contains("hide-amounts");try{localStorage.setItem("ahorra-hide",on?"0":"1")}catch(e){}applyHide()}

/* ================= Bienvenida ================= */
function maybeOnboard(){
  if(onboardShown||!me||!ajLoaded||!loaded.mov||!loaded.fijos)return;
  if(state.aj.onboarded||Object.keys(state.mov).length||Object.keys(state.fijos).length||state.aj.presupuesto)return;
  onboardShown=true;setTimeout(()=>onboardStep(0,{}),400);
}
function finishOnboard(){state.aj.onboarded=true;saveAj()}
function onboardStep(n,d){
  const dots=`<div class="ob-dots">${[0,1,2].map(i=>`<i class="${i<=n?"on":""}"></i>`).join("")}</div>`;
  if(n===0){openSheet(`<h2>Bienvenido a Ahorra+${me.displayName?", "+esc(me.displayName.split(" ")[0]):""}</h2>${dots}
    <p class="small">Vamos a dejar tu app lista en menos de un minuto. Puedes saltarte cualquier paso.</p>
    <label class="field small" for="obIng">¿Cuánto ingresas al mes? (nómina, aproximado)<input id="obIng" inputmode="decimal" placeholder="Ej. 1.600 €"></label>
    <label class="field small" for="obDia">¿Qué día cobras?<input id="obDia" inputmode="numeric" placeholder="Ej. 1" value="1"></label>
    <div class="btns"><button class="btn" id="skip">Saltar</button><button class="btn primary" id="ok">Siguiente</button></div>`);
    sheet.querySelector("#skip").onclick=()=>{finishOnboard();closeSheet()};
    sheet.querySelector("#ok").onclick=()=>{const v=num(sheet.querySelector("#obIng").value),dia=Math.max(1,Math.min(31,parseInt(sheet.querySelector("#obDia").value)||1));
      if(v>0){saveFijo({id:uid("x"),tipo:"ingreso",importe:money2(v),cat:catsI()[0].id,nota:"Nómina",dia,metodo:"Transferencia",activo:true,omitidos:[],desde:monthKey(new Date())});d.ing=v}
      onboardStep(1,d)};return}
  if(n===1){const sug=d.ing?Math.round(d.ing*0.8/10)*10:"";
    openSheet(`<h2>Tu presupuesto mensual</h2>${dots}<p class="small">Lo máximo que quieres gastar cada mes. ${d.ing?`Te proponemos el 80 % de tus ingresos para ahorrar al menos un 20 %.`:""}</p>
    <input class="amount-in" id="obPres" inputmode="decimal" placeholder="0 €" value="${sug}">
    <div class="btns" style="margin-top:14px"><button class="btn" id="skip">Saltar</button><button class="btn primary" id="ok">Siguiente</button></div>`);
    const go=save=>{if(save){const v=num(sheet.querySelector("#obPres").value);if(v>0){state.aj.presupuesto=money2(v);d.pres=v}}onboardStep(2,d)};
    sheet.querySelector("#skip").onclick=()=>go(false);sheet.querySelector("#ok").onclick=()=>go(true);return}
  if(n===2){const base=d.pres||d.ing||0,obj=base?Math.round(base*3/100)*100:"";
    openSheet(`<h2>Tu colchón de emergencia</h2>${dots}<p class="small">Lo recomendable es tener ahorrados de 3 a 6 meses de gastos para imprevistos. Lo creamos como meta y lo verás crecer.</p>
    <div class="two"><label class="field small" for="obObj">Objetivo (€)<input id="obObj" inputmode="decimal" value="${obj}"></label><label class="field small" for="obYa">Ya tengo (€)<input id="obYa" inputmode="decimal" placeholder="0"></label></div>
    <div class="btns"><button class="btn" id="skip">Saltar</button><button class="btn primary" id="ok">Terminar</button></div>`);
    const end=save=>{if(save){const o=num(sheet.querySelector("#obObj").value),y=num(sheet.querySelector("#obYa").value)||0;if(o>0)saveMeta({id:uid("m"),nombre:"Colchón de emergencia",i:"shield",objetivo:money2(o),ahorrado:money2(Math.max(0,y)),fecha:"",creado:Date.now()})}
      finishOnboard();closeSheet();toast("¡Listo! Ya puedes empezar a apuntar tus gastos")};
    sheet.querySelector("#skip").onclick=()=>end(false);sheet.querySelector("#ok").onclick=()=>end(true)}
}

/* ================= Bloqueo (PIN / Face ID) ================= */
const lockKey=()=>`ahorra-lock-${me&&me.uid}`;
function lockCfg(){try{return JSON.parse(localStorage.getItem(lockKey())||"null")}catch(e){return null}}
function setLockCfg(c){try{c?localStorage.setItem(lockKey(),JSON.stringify(c)):localStorage.removeItem(lockKey())}catch(e){}}
async function hashPin(pin){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(me.uid+":"+pin));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
const b64=buf=>btoa(String.fromCharCode(...new Uint8Array(buf))),unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function bioAvailable(){try{return !!(window.PublicKeyCredential&&await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())}catch(e){return false}}
async function bioRegister(){const cred=await navigator.credentials.create({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),rp:{name:"Ahorra+",id:location.hostname},
  user:{id:new TextEncoder().encode(me.uid),name:me.email,displayName:me.displayName||me.email},pubKeyCredParams:[{type:"public-key",alg:-7},{type:"public-key",alg:-257}],
  authenticatorSelection:{authenticatorAttachment:"platform",userVerification:"required",residentKey:"discouraged"},timeout:60000}});return b64(cred.rawId)}
async function bioCheck(id){await navigator.credentials.get({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),allowCredentials:[{type:"public-key",id:unb64(id)}],userVerification:"required",timeout:60000}});return true}
let lockedAt=0,isLocked=false;
function showLock(){const c=lockCfg();if(!c||isLocked)return;isLocked=true;
  const L=document.getElementById("lock");let pin="";L.hidden=false;
  const draw=(msg="")=>{L.innerHTML=`<div class="lk"><img src="logo.png" alt="" class="lk-logo"><div class="lk-t">Introduce tu código</div>
    <div class="lk-dots">${[0,1,2,3].map(i=>`<i class="${i<pin.length?"on":""}"></i>`).join("")}</div><div class="lk-msg">${esc(msg)}</div>
    <div class="lk-pad">${[1,2,3,4,5,6,7,8,9].map(n=>`<button data-n="${n}">${n}</button>`).join("")}<button data-bio aria-label="Face ID" ${c.bio?"":"style=\"visibility:hidden\""}>${svg("faceid")}</button><button data-n="0">0</button><button data-del aria-label="Borrar">${svg("chevL")}</button></div>
    <button class="link lk-forgot">¿Has olvidado el código?</button></div>`;
    L.querySelectorAll("[data-n]").forEach(b=>b.onclick=()=>{if(pin.length<4){pin+=b.dataset.n;draw();if(pin.length===4)check()}});
    L.querySelector("[data-del]").onclick=()=>{pin=pin.slice(0,-1);draw()};
    const bb=L.querySelector("[data-bio]");if(c.bio)bb.onclick=async()=>{try{await bioCheck(c.bio);unlock()}catch(e){draw("No se ha podido verificar. Usa tu código.")}};
    L.querySelector(".lk-forgot").onclick=()=>{setLockCfg(null);isLocked=false;L.hidden=true;_auth.signOut();toast("Vuelve a entrar con tu email y contraseña")};};
  const check=async()=>{const h=await hashPin(pin);if(h===c.pin)unlock();else{pin="";draw("Código incorrecto");L.querySelector(".lk-dots").classList.add("shake")}};
  const unlock=()=>{isLocked=false;L.hidden=true;L.innerHTML=""};
  draw();
}
document.addEventListener("visibilitychange",()=>{if(document.hidden)lockedAt=Date.now();else if(me&&lockCfg()&&Date.now()-lockedAt>60000&&lockedAt)showLock()});
async function openLockSettings(){const c=lockCfg(),bio=await bioAvailable();
  openSheet(`<h2>Bloqueo de la app</h2>
    <p class="small">Pide un código de 4 cifras${bio?" o Face ID / huella":""} al abrir la app o al volver a ella tras más de un minuto. Se configura en cada dispositivo.</p>
    ${c?`<div class="hint">${svg("check")}<span>El bloqueo está <b>activado</b>${c.bio?" con Face ID / huella":""}.</span></div>
      ${bio&&!c.bio?`<button class="btn" id="addBio" style="width:100%;margin-bottom:8px">${svg("faceid")}Activar Face ID / huella</button>`:""}
      <div class="btns"><button class="btn" id="chg">Cambiar código</button><button class="btn danger" id="off">Desactivar</button></div>`
    :`<button class="btn primary" id="on" style="width:100%">${svg("shield")}Activar bloqueo</button>`}<div class="note" id="err"></div>`);
  const err=sheet.querySelector("#err");
  const setPin=async()=>{openSheet(`<h2>Elige un código</h2><label class="field small" for="p1">Código de 4 cifras<input id="p1" type="password" inputmode="numeric" maxlength="4" autocomplete="off"></label>
      <label class="field small" for="p2">Repite el código<input id="p2" type="password" inputmode="numeric" maxlength="4" autocomplete="off"></label><div class="note" id="err"></div>
      <div class="btns"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="ok">Guardar</button></div>`);
    sheet.querySelector("#ok").onclick=async()=>{const a=sheet.querySelector("#p1").value,b=sheet.querySelector("#p2").value,e=sheet.querySelector("#err");
      if(!/^\d{4}$/.test(a)){e.textContent="El código debe tener 4 números.";return}if(a!==b){e.textContent="Los códigos no coinciden.";return}
      const old=lockCfg()||{};setLockCfg({pin:await hashPin(a),bio:old.bio||null});closeSheet();toast("Bloqueo activado");if(bio&&!old.bio)setTimeout(openLockSettings,300)}};
  const on=sheet.querySelector("#on");if(on)on.onclick=setPin;
  const chg=sheet.querySelector("#chg");if(chg)chg.onclick=setPin;
  const off=sheet.querySelector("#off");if(off)confirmBtn(off,()=>{setLockCfg(null);closeSheet();toast("Bloqueo desactivado")});
  const ab=sheet.querySelector("#addBio");if(ab)ab.onclick=async()=>{try{const id=await bioRegister();setLockCfg({...lockCfg(),bio:id});closeSheet();toast("Face ID / huella activado")}catch(e){err.textContent="No se ha podido activar. Inténtalo de nuevo."}};
}


/* ================= Notificaciones push ================= */
const pushSupported=()=>"serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window&&window.firebase&&firebase.messaging;
const isStandalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
async function enablePush(){
  if(!window.VAPID_KEY)throw new Error("novapid");
  if(!pushSupported())throw new Error(/iphone|ipad/i.test(navigator.userAgent)&&!isStandalone()?"ios-browser":"unsupported");
  const perm=await Notification.requestPermission();if(perm!=="granted")throw new Error("denied");
  const reg=await navigator.serviceWorker.ready;
  const token=await firebase.messaging().getToken({vapidKey:VAPID_KEY,serviceWorkerRegistration:reg});
  if(!token)throw new Error("notoken");
  await window._base.collection("config").doc("push").set({tokens:firebase.firestore.FieldValue.arrayUnion(token),tz:"Europe/Madrid",updated:Date.now(),
    prefs:{fijos:true,presupuesto:true,semanal:true}},{merge:true});
  try{localStorage.setItem("ahorra-push-"+me.uid,token)}catch(e){}
  return token;
}
async function disablePush(){let t=null;try{t=localStorage.getItem("ahorra-push-"+me.uid)}catch(e){}
  try{if(t)await window._base.collection("config").doc("push").set({tokens:firebase.firestore.FieldValue.arrayRemove(t)},{merge:true});if(pushSupported())await firebase.messaging().deleteToken()}catch(e){}
  try{localStorage.removeItem("ahorra-push-"+me.uid)}catch(e){}}
const pushOn=()=>{try{return !!localStorage.getItem("ahorra-push-"+me.uid)&&Notification.permission==="granted"}catch(e){return false}};
function openPushSettings(){
  const on=pushOn();
  openSheet(`<h2>Notificaciones</h2>
    <p class="small">Te avisamos en el móvil aunque no tengas la app abierta:</p>
    <div class="tip">${icoHTML({i:"calendar",c:"#7dd3fc"})}<div><b>Pagos y cobros de mañana</b><div class="small">Alquiler, suscripciones, nómina…</div></div></div>
    <div class="tip">${icoHTML({i:"gauge",c:"#f3c969"})}<div><b>Presupuesto y límites</b><div class="small">Al llegar al 80 % y al superarlo.</div></div></div>
    <div class="tip">${icoHTML({i:"receipt",c:"#2ee59d"})}<div><b>Resumen de la semana</b><div class="small">Cada lunes, cuánto gastaste.</div></div></div>
    ${/iphone|ipad/i.test(navigator.userAgent)&&!isStandalone()?`<div class="hint">${svg("alert")}<span>En iPhone las notificaciones solo funcionan con la app instalada en la pantalla de inicio. Ábrela desde su icono.</span></div>`:""}
    <div class="note" id="err"></div>
    <div class="btns">${on?`<button class="btn danger" id="off">Desactivar</button>`:`<button class="btn" data-close>Ahora no</button><button class="btn primary" id="on">${svg("bell")}Activar</button>`}</div>`);
  const err=sheet.querySelector("#err");
  const b=sheet.querySelector("#on");if(b)b.onclick=async()=>{b.disabled=true;b.textContent="Activando…";
    try{await enablePush();closeSheet();toast("Notificaciones activadas");render()}catch(e){b.disabled=false;b.textContent="Activar";
      err.textContent={novapid:"Las notificaciones aún no están configuradas en la app.",denied:"Has bloqueado las notificaciones. Actívalas en Ajustes del iPhone → Notificaciones → Ahorra+.","ios-browser":"Abre la app desde el icono de la pantalla de inicio para activarlas.",unsupported:"Este navegador no admite notificaciones."}[e.message]||"No se han podido activar. Inténtalo de nuevo."}};
  const off=sheet.querySelector("#off");if(off)off.onclick=async()=>{await disablePush();closeSheet();toast("Notificaciones desactivadas");render()};
}

/* ================= Grupos (gastos compartidos) ================= */
let groups={},curGroup=null,gExp={},gUnsub=null,fdbRef=null;
function startGroups(fdb,u){fdbRef=fdb;groups={};
  unsubs.push(fdb.collection("groups").where("members","array-contains",u.uid).onSnapshot(s=>{const o={};s.docs.forEach(d=>o[d.id]={...d.data(),id:d.id});groups=o;if(view==="grupos"||view==="grupo")render()},()=>{}));
  unsubs.push(()=>{if(gUnsub){gUnsub();gUnsub=null}});
}
const gName=(g,uid)=>uid===me.uid?"Tú":((g.names&&g.names[uid])||"Miembro");
function gBalances(g,exps){const b={};(g.members||[]).forEach(u=>b[u]=0);
  for(const e of exps){const imp=+e.importe||0;
    if(e.tipo==="pago"){b[e.de]=(b[e.de]||0)+imp;b[e.a]=(b[e.a]||0)-imp;continue}
    const rep=(e.reparto&&e.reparto.length?e.reparto:g.members)||[];const parte=imp/(rep.length||1);
    b[e.pagador]=(b[e.pagador]||0)+imp;rep.forEach(u=>b[u]=(b[u]||0)-parte)}
  return b}
function gSettle(b){const deb=[],cre=[];Object.entries(b).forEach(([u,v])=>{const r=Math.round(v*100)/100;if(r<-0.009)deb.push([u,-r]);else if(r>0.009)cre.push([u,r])});
  deb.sort((a,b)=>b[1]-a[1]);cre.sort((a,b)=>b[1]-a[1]);const out=[];let i=0,j=0;
  while(i<deb.length&&j<cre.length){const x=Math.min(deb[i][1],cre[j][1]);out.push({de:deb[i][0],a:cre[j][0],imp:Math.round(x*100)/100});deb[i][1]-=x;cre[j][1]-=x;if(deb[i][1]<0.01)i++;if(cre[j][1]<0.01)j++}
  return out}
function vGrupos(){
  const list=Object.values(groups).sort((a,b)=>(b.creado||0)-(a.creado||0));
  return `<div class="card"><div class="row"><div><h3>Gastos compartidos</h3><div class="small" style="margin-top:4px">Viajes, piso, cenas… apunta lo que paga cada uno y Ahorra+ calcula quién debe a quién.</div></div></div>
    <div class="btns" style="margin-top:14px"><button class="btn" data-act="unirgrupo">${svg("handshake")}Unirme</button><button class="btn primary" data-act="nuevogrupo">${svg("plus")}Crear grupo</button></div></div>
  ${list.length?`<div class="card" style="padding:4px 16px">${list.map(g=>`<div class="menu-item" data-grupo="${esc(g.id)}">${icoHTML({i:"handshake",c:"#2ee59d"})}<div style="min-width:0"><div style="font-weight:700">${esc(g.nombre)}</div><div class="small">${(g.members||[]).length} miembro${(g.members||[]).length===1?"":"s"}</div></div><span class="chev">${svg("chevR")}</span></div>`).join("")}</div>`
  :`<div class="card empty">${icoHTML({i:"handshake",c:"#2ee59d"})}<span><b>Aún no tienes grupos.</b><br>Crea uno e invita a tus amigos con un enlace.</span></div>`}`;
}
function openGrupo(id){curGroup=id;gExp={};if(gUnsub)gUnsub();
  gUnsub=fdbRef.collection("groups").doc(id).collection("gastos").onSnapshot(s=>{const o={};s.docs.forEach(d=>o[d.id]={...d.data(),id:d.id});gExp=o;if(view==="grupo")render()},()=>{toast("No tienes acceso a este grupo")});
  setView("grupo")}
function vGrupo(){
  const g=groups[curGroup];if(!g)return `<div class="card empty">Cargando grupo…</div>`;
  const exps=Object.values(gExp).sort((a,b)=>(b.fecha||"").localeCompare(a.fecha||"")||(b.creado||0)-(a.creado||0));
  const b=gBalances(g,exps),mine=b[me.uid]||0,sett=gSettle(b),total=sum(exps.filter(e=>e.tipo!=="pago"));
  return `<button class="link" data-act="volvergrupos" style="margin-bottom:8px">${svg("chevL")}Todos los grupos</button>
  <section class="hero"><div class="hero-top"><div class="brandchip">${svg("handshake")}${esc(g.nombre)}</div><button class="link" data-act="invitar">${svg("plus")}Invitar</button></div>
    <div class="lbl">${Math.abs(mine)<0.01?"Estás al día":mine>0?"Te deben":"Debes"}</div>
    <div class="big">${amtHTML(Math.abs(mine))}</div>
    <div class="insight">Gasto total del grupo: <b>${fmt0(total)}</b> · ${(g.members||[]).length} miembros</div>
    <div class="flows" style="grid-template-columns:1fr">${(g.members||[]).map(u=>`<div class="flow" style="justify-content:space-between"><span style="font-weight:600">${esc(gName(g,u))}</span><span class="v" style="color:${(b[u]||0)>0.009?"#7dffc8":(b[u]||0)<-0.009?"#ffb3b3":"inherit"}">${(b[u]||0)>0.009?"+":(b[u]||0)<-0.009?"−":""}${fmt(Math.abs(b[u]||0))}</span></div>`).join("")}</div>
  </section>
  <div class="card"><h3 style="margin-bottom:8px">Saldar cuentas</h3>${sett.length?sett.map((s,k)=>`<div class="tip">${icoHTML({i:"coins",c:"#f3c969"})}<div class="row"><span><b>${esc(gName(g,s.de))}</b> ${s.de===me.uid?"debes":"debe"} <b>${fmt(s.imp)}</b> a <b>${s.a===me.uid?"ti":esc(gName(g,s.a))}</b></span><button class="btn sm" data-saldar="${k}">Pagado</button></div></div>`).join(""):`<div class="small">Todo saldado. Nadie debe nada.</div>`}</div>
  <div class="btns" style="margin-bottom:14px"><button class="btn primary" data-act="gastogrupo">${svg("plus")}Añadir gasto del grupo</button></div>
  ${exps.length?`<div class="card" style="padding:2px 16px">${exps.map(e=>e.tipo==="pago"?`<div class="item" data-gexp="${esc(e.id)}">${icoHTML({i:"check",c:"#2ee59d"})}<div style="min-width:0"><div class="t">${esc(gName(g,e.de))} pagó a ${esc(gName(g,e.a))}</div><div class="small">${e.fecha.split("-").reverse().join("/")} · Liquidación</div></div><div class="amt">${amtHTML(e.importe)}</div></div>`
    :`<div class="item" data-gexp="${esc(e.id)}">${icoHTML({i:"receipt",c:"#a5b4fc"})}<div style="min-width:0"><div class="t">${esc(e.desc)}</div><div class="small">Pagó ${esc(gName(g,e.pagador))} · ${e.fecha.split("-").reverse().join("/")} · entre ${(e.reparto||g.members).length}</div></div><div class="amt">${amtHTML(e.importe)}</div></div>`).join("")}</div>`:`<div class="card empty">${icoHTML({i:"receipt",c:"#a5b4fc"})}<span>Aún no hay gastos en este grupo.</span></div>`}
  <div style="text-align:center;margin:8px 0 20px"><button class="link" data-act="salirgrupo" style="color:var(--neg)">Salir del grupo</button></div>`;
}
function wireGrupos(el){
  el.querySelectorAll("[data-grupo]").forEach(x=>x.onclick=()=>openGrupo(x.dataset.grupo));
  el.querySelectorAll("[data-gexp]").forEach(x=>x.onclick=()=>openGastoGrupo(gExp[x.dataset.gexp]));
  const g=groups[curGroup];if(view==="grupo"&&g){const sett=gSettle(gBalances(g,Object.values(gExp)));
    el.querySelectorAll("[data-saldar]").forEach(x=>x.onclick=()=>{const s=sett[+x.dataset.saldar];if(!s)return;
      fdbRef.collection("groups").doc(curGroup).collection("gastos").add({tipo:"pago",de:s.de,a:s.a,importe:s.imp,fecha:todayStr(),creado:Date.now(),por:me.uid}).then(()=>toast("Pago registrado")).catch(()=>toast("No se ha podido guardar"))})}
}
function openNuevoGrupo(){
  openSheet(`<h2>Crear grupo</h2><label class="field small" for="gNom">Nombre del grupo<input id="gNom" maxlength="40" placeholder="Ej. Viaje a Lisboa, Piso, Cenas"></label>
    <div class="note" id="err"></div><div class="btns"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="ok">Crear</button></div>`);
  sheet.querySelector("#ok").onclick=async function(){const n=sheet.querySelector("#gNom").value.trim();if(!n){sheet.querySelector("#err").textContent="Ponle un nombre al grupo.";return}
    this.disabled=true;try{const ref=await fdbRef.collection("groups").add({nombre:n.slice(0,40),members:[me.uid],names:{[me.uid]:me.displayName||me.email.split("@")[0]},owner:me.uid,creado:Date.now()});
      closeSheet();openGrupo(ref.id);setTimeout(invitarGrupo,400)}catch(e){this.disabled=false;sheet.querySelector("#err").textContent=e.code==="permission-denied"?"Falta activar los grupos en Firebase (reglas).":"No se ha podido crear. Revisa tu conexión."}};
}
const inviteLink=id=>`${location.origin}${location.pathname}#unir-${id}`;
function invitarGrupo(){const g=groups[curGroup];if(!g)return;const link=inviteLink(g.id);
  openSheet(`<h2>Invitar a ${esc(g.nombre)}</h2><p class="small">Envía este enlace a tus amigos. Al abrirlo y entrar en Ahorra+, se unirán al grupo.</p>
    <div class="input" style="word-break:break-all;font-size:13px;margin-bottom:12px">${esc(link)}</div>
    <div class="small" style="margin-bottom:14px">O que usen <b>Unirme</b> con este código: <b style="font-family:var(--mono);color:var(--ink)">${esc(g.id)}</b></div>
    <div class="btns"><button class="btn" id="cp">Copiar enlace</button>${navigator.share?`<button class="btn primary" id="sh">Compartir</button>`:""}</div>`);
  sheet.querySelector("#cp").onclick=async function(){try{await navigator.clipboard.writeText(link);this.textContent="Copiado"}catch(e){this.textContent="Mantén pulsado el enlace para copiar"}};
  const sh=sheet.querySelector("#sh");if(sh)sh.onclick=()=>navigator.share({title:"Ahorra+",text:`Únete a «${g.nombre}» en Ahorra+ para repartir gastos`,url:link}).catch(()=>{});
}
function openUnir(){
  openSheet(`<h2>Unirme a un grupo</h2><label class="field small" for="gCod">Código o enlace de invitación<input id="gCod" autocomplete="off" placeholder="Pega aquí el enlace o el código"></label>
    <div class="note" id="err"></div><div class="btns"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="ok">Unirme</button></div>`);
  sheet.querySelector("#ok").onclick=()=>{const v=sheet.querySelector("#gCod").value.trim(),m=v.match(/([A-Za-z0-9]{15,40})\s*$/);if(!m){sheet.querySelector("#err").textContent="No reconozco ese código.";return}closeSheet();joinGroup(m[1])};
}
async function joinGroup(id){
  try{const ref=fdbRef.collection("groups").doc(id),s=await ref.get();if(!s.exists){toast("Ese grupo no existe");return}
    const g=s.data();if(!(g.members||[]).includes(me.uid))await ref.update({members:firebase.firestore.FieldValue.arrayUnion(me.uid),[`names.${me.uid}`]:me.displayName||me.email.split("@")[0]});
    toast(`Te has unido a «${g.nombre}»`);openGrupo(id)}catch(e){toast(e.code==="permission-denied"?"No se ha podido unir: falta activar los grupos en Firebase.":"No se ha podido unir. Revisa el enlace o tu conexión.")}
}
function salirGrupo(){const g=groups[curGroup];if(!g)return;
  openSheet(`<h2>Salir de ${esc(g.nombre)}</h2><p class="small">Dejarás de ver este grupo. Los gastos ya apuntados se quedan para el resto.</p>
    <div class="btns"><button class="btn" data-close>Cancelar</button><button class="btn danger" id="ok">Salir</button></div>`);
  sheet.querySelector("#ok").onclick=async()=>{try{await fdbRef.collection("groups").doc(g.id).update({members:firebase.firestore.FieldValue.arrayRemove(me.uid)});closeSheet();if(gUnsub){gUnsub();gUnsub=null}setView("grupos");toast("Has salido del grupo")}catch(e){toast("No se ha podido salir. Inténtalo de nuevo.")}};
}
function openGastoGrupo(e){
  const g=groups[curGroup];if(!g)return;if(e&&e.tipo==="pago"){
    openSheet(`<h2>Liquidación</h2><p>${esc(gName(g,e.de))} pagó ${fmt(e.importe)} a ${esc(gName(g,e.a))} el ${e.fecha.split("-").reverse().join("/")}.</p><div class="btns"><button class="btn danger" id="del">Borrar</button><button class="btn" data-close>Cerrar</button></div>`);
    confirmBtn(sheet.querySelector("#del"),()=>{fdbRef.collection("groups").doc(g.id).collection("gastos").doc(e.id).delete();closeSheet()});return}
  const editing=!!e;e=e||{pagador:me.uid,reparto:[...g.members],fecha:todayStr()};
  openSheet(`<h2>${editing?"Editar gasto del grupo":"Gasto del grupo"}</h2>
    <input class="amount-in" id="gImp" inputmode="decimal" placeholder="0,00 €" value="${editing?String(e.importe).replace(".",","):""}">
    <label class="field small" for="gDesc" style="margin-top:12px">Concepto<input id="gDesc" maxlength="60" placeholder="Ej. Cena, gasolina, supermercado" value="${esc(e.desc||"")}"></label>
    <div class="two"><label class="field small" for="gPag">Pagó<select id="gPag">${g.members.map(u=>`<option value="${esc(u)}" ${u===e.pagador?"selected":""}>${esc(gName(g,u))}</option>`).join("")}</select></label>
    <label class="field small" for="gFec">Fecha<input type="date" id="gFec" value="${e.fecha}"></label></div>
    <div class="small" style="font-weight:600;margin-bottom:6px">Dividir a partes iguales entre</div>
    <div class="filters" style="flex-wrap:wrap">${g.members.map(u=>`<button type="button" class="${(e.reparto||g.members).includes(u)?"on":""}" data-rep="${esc(u)}">${esc(gName(g,u))}</button>`).join("")}</div>
    ${editing?"":`<label class="check"><input type="checkbox" id="gMine" checked> Apuntar mi parte en mis gastos</label>`}
    <div class="note" id="err"></div>
    <div class="btns">${editing?`<button class="btn danger" id="del">Borrar</button>`:`<button class="btn" data-close>Cancelar</button>`}<button class="btn primary" id="ok">Guardar</button></div>`);
  const rep=new Set(e.reparto||g.members);
  sheet.querySelectorAll("[data-rep]").forEach(b=>b.onclick=()=>{const u=b.dataset.rep;if(rep.has(u)){if(rep.size>1)rep.delete(u)}else rep.add(u);b.classList.toggle("on",rep.has(u))});
  const del=sheet.querySelector("#del");if(del)confirmBtn(del,()=>{fdbRef.collection("groups").doc(g.id).collection("gastos").doc(e.id).delete();closeSheet()});
  sheet.querySelector("#ok").onclick=async()=>{const v=num(sheet.querySelector("#gImp").value),desc=sheet.querySelector("#gDesc").value.trim();
    if(!(v>0)){sheet.querySelector("#err").textContent="Escribe un importe válido";return}if(!desc){sheet.querySelector("#err").textContent="Escribe un concepto";return}
    const data={desc:desc.slice(0,60),importe:money2(v),pagador:sheet.querySelector("#gPag").value,reparto:[...rep],fecha:sheet.querySelector("#gFec").value||todayStr(),creado:e.creado||Date.now(),por:e.por||me.uid};
    const col=fdbRef.collection("groups").doc(g.id).collection("gastos");
    try{if(editing)await col.doc(e.id).set(data);else await col.add(data)}catch(err){sheet.querySelector("#err").textContent="No se ha podido guardar.";return}
    const mine=sheet.querySelector("#gMine");
    if(mine&&mine.checked&&rep.has(me.uid)){const parte=money2(data.importe/rep.size),c=catsG().find(x=>x.id==="ocio")||catsG()[0];
      saveMov({id:uid("g"),tipo:"gasto",importe:parte,cat:c.id,nota:`${data.desc} (${g.nombre})`.slice(0,80),metodo:"",fecha:data.fecha,creado:Date.now()})}
    closeSheet();toast("Gasto del grupo guardado")};
}

/* ================= Tickets ================= */
function compressImg(file){return new Promise((res,rej)=>{const url=URL.createObjectURL(file),img=new Image();
  img.onload=()=>{const M=1280,k=Math.min(1,M/Math.max(img.width,img.height)),c=document.createElement("canvas");c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);
    c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);let q=.72,d=c.toDataURL("image/jpeg",q);while(d.length>700000&&q>.3){q-=.12;d=c.toDataURL("image/jpeg",q)}res(d)};
  img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error("img"))};img.src=url})}
const tkCache={};
async function getTicket(id){if(tkCache[id])return tkCache[id];try{const s=await window._base.collection("tickets").doc(id).get();const d=s.exists?s.data().img:null;if(d)tkCache[id]=d;return d}catch(e){return null}}
function putTicket(id,data){tkCache[id]=data;window._base.collection("tickets").doc(id).set({img:data,creado:Date.now()}).catch(()=>toast("No se ha podido guardar la foto del ticket"))}
function delTicket(id){delete tkCache[id];window._base&&window._base.collection("tickets").doc(id).delete().catch(()=>{})}
function viewTicket(src){const v=document.createElement("div");v.className="tk-view";v.innerHTML=`<img src="${src}" alt="Ticket"><button class="xbtn" aria-label="Cerrar">${svg("x")}</button>`;v.onclick=()=>v.remove();document.body.appendChild(v)}

/* ================= Avisos ================= */
function computeAlerts(){
  const out=[],now=new Date(),mk=monthKey(now),ms=Object.values(state.mov).filter(m=>m.fecha&&m.fecha.startsWith(mk)),G=sum(gastos(ms)),pres=+state.aj.presupuesto||0;
  if(pres>0){const p=G/pres;if(p>=1)out.push({id:`pres-over-${mk}`,lvl:"neg",ic:"alert",t:"Has superado tu presupuesto",d:`Llevas ${fmt0(G)} gastados de ${fmt0(pres)} este mes.`});
    else if(p>=.8)out.push({id:`pres-80-${mk}`,lvl:"warn",ic:"gauge",t:`Has usado el ${Math.round(p*100)} % del presupuesto`,d:`Te quedan ${fmt0(pres-G)} hasta fin de mes.`})}
  for(const [cid,lim] of Object.entries(state.aj.porCat||{})){const v=sum(gastos(ms).filter(m=>m.cat===cid)),c=catOf(cid,"gasto");if(!(lim>0))continue;
    if(v>lim)out.push({id:`cat-over-${cid}-${mk}`,lvl:"neg",ic:iconOf(c),t:`${c.n}: límite superado`,d:`${fmt0(v)} de ${fmt0(lim)}.`});
    else if(v>=lim*.8)out.push({id:`cat-80-${cid}-${mk}`,lvl:"warn",ic:iconOf(c),t:`${c.n}: cerca del límite`,d:`${fmt0(v)} de ${fmt0(lim)}.`})}
  const hoy=now.getDate(),dim=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  for(const f of Object.values(state.fijos)){if(f.activo===false||(f.tipo||"gasto")!=="gasto")continue;const dia=Math.min(+f.dia||1,dim);
    if(dia>hoy&&dia-hoy<=3&&!state.mov[`f_${f.id}_${mk}`])out.push({id:`fijo-${f.id}-${mk}`,lvl:"info",ic:"calendar",t:`Pago próximo: ${f.nota||catOf(f.cat).n}`,d:`${fmt(f.importe)} el día ${dia}.`})}
  for(const m of Object.values(state.metas)){if(!m.fecha||(m.ahorrado||0)>=m.objetivo)continue;const dias=Math.round((new Date(m.fecha+"T12:00")-now)/864e5);
    if(dias>=0&&dias<=30)out.push({id:`meta-${m.id}-${m.fecha}`,lvl:"info",ic:iconOf(m),t:`Meta «${m.nombre}» en ${dias} día${dias===1?"":"s"}`,d:`Te faltan ${fmt0(m.objetivo-(m.ahorrado||0))}.`})}
  return out;
}
const seenKey=()=>`ahorra-seen-${me&&me.uid}`;
function seenSet(){try{return new Set(JSON.parse(localStorage.getItem(seenKey())||"[]"))}catch(e){return new Set()}}
function updateBadge(){const b=document.getElementById("badge");if(!b||!me)return;const s=seenSet(),n=computeAlerts().filter(a=>!s.has(a.id)).length;b.hidden=!n;b.textContent=n}
function openAlerts(){
  const list=computeAlerts(),col={neg:"#ff6b6b",warn:"#f3c969",info:"#2ee59d"};
  openSheet(`<h2>Avisos</h2>${list.length?list.map(a=>`<div class="tip">${icoHTML({i:a.ic,c:col[a.lvl]})}<div><div style="font-weight:700">${esc(a.t)}</div><div class="small">${esc(a.d)}</div></div></div>`).join(""):`<div class="empty">${icoHTML({i:"check",c:"#2ee59d"})}<span><b>Todo en orden.</b><br>Te avisaremos si te acercas al presupuesto, a un límite o a un pago fijo.</span></div>`}
    <div class="btns" style="margin-top:12px"><button class="btn" data-close>Cerrar</button></div>`);
  try{const s=seenSet();list.forEach(a=>s.add(a.id));localStorage.setItem(seenKey(),JSON.stringify([...s].slice(-200)))}catch(e){}
  updateBadge();
}

/* ================= Informe mensual ================= */
function openReport(){
  const all=movsMes(),gs=gastos(all),is=ingresos(all),G=sum(gs),I=sum(is),bal=I-G,mesTxt=cur.toLocaleDateString("es-ES",{month:"long",year:"numeric"});
  const tot={};gs.forEach(g=>tot[g.cat]=(tot[g.cat]||0)+(+g.importe));
  const cats=Object.entries(tot).map(([id,v])=>({c:catOf(id,"gasto"),v})).sort((a,b)=>b.v-a.v);
  const top=gs.slice().sort((a,b)=>b.importe-a.importe).slice(0,5);
  const r=document.getElementById("report");
  r.innerHTML=`<div class="rp-head"><img src="logo.png" alt=""><div><div class="rp-brand">Ahorra+</div><div class="rp-sub">Informe de ${esc(mesTxt)}${me&&me.displayName?` · ${esc(me.displayName)}`:""}</div></div></div>
    <div class="rp-kpis"><div><span>Ingresos</span><b>${fmt(I)}</b></div><div><span>Gastos</span><b>${fmt(G)}</b></div><div><span>Balance</span><b>${bal<0?"−":""}${fmt(Math.abs(bal))}</b></div><div><span>Tasa de ahorro</span><b>${I>0?Math.round(bal/I*100)+" %":"—"}</b></div></div>
    <h4>Gastos por categoría</h4><table><tr><th>Categoría</th><th>Importe</th><th>%</th></tr>${cats.map(x=>`<tr><td>${esc(x.c.n)}</td><td>${fmt(x.v)}</td><td>${G?Math.round(x.v/G*100):0} %</td></tr>`).join("")||`<tr><td colspan="3">Sin gastos</td></tr>`}</table>
    <h4>Mayores gastos</h4><table><tr><th>Fecha</th><th>Concepto</th><th>Importe</th></tr>${top.map(g=>`<tr><td>${g.fecha.split("-").reverse().join("/")}</td><td>${esc(g.nota||catOf(g.cat).n)}</td><td>${fmt(g.importe)}</td></tr>`).join("")||`<tr><td colspan="3">—</td></tr>`}</table>
    <h4>Todos los movimientos</h4><table><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Importe</th></tr>${all.slice().reverse().map(m=>`<tr><td>${m.fecha.split("-").reverse().join("/")}</td><td>${esc(m.nota||"")}</td><td>${esc(catOf(m.cat,tipoOf(m)).n)}</td><td>${tipoOf(m)==="ingreso"?"+":"−"}${fmt(m.importe)}</td></tr>`).join("")||`<tr><td colspan="4">Sin movimientos</td></tr>`}</table>
    <p class="rp-foot">Generado con Ahorra+ el ${new Date().toLocaleDateString("es-ES")}.</p>`;
  openSheet(`<h2>Informe de ${esc(mesTxt)}</h2>
    <div class="trio" style="margin-bottom:12px"><div><div class="lbl">Ingresos</div><div class="v">${fmt0(I)}</div></div><div><div class="lbl">Gastos</div><div class="v">${fmt0(G)}</div></div><div><div class="lbl">Balance</div><div class="v" style="color:${bal<0?"var(--neg)":"var(--pos)"}">${bal<0?"−":""}${fmt0(Math.abs(bal))}</div></div></div>
    <div class="hint">${svg("export")}<span>Pulsa <b>Guardar PDF</b>: se abrirá el menú de impresión. En iPhone, toca <b>Compartir → Guardar en Archivos</b> para tenerlo en PDF.</span></div>
    <div class="btns"><button class="btn" data-close>Cerrar</button><button class="btn primary" id="pdf">${svg("export")}Guardar PDF</button></div>`);
  sheet.querySelector("#pdf").onclick=()=>{closeSheet();document.body.classList.add("printing");setTimeout(()=>{try{window.print()}catch(e){}setTimeout(()=>document.body.classList.remove("printing"),500)},100)};
}

/* ================= Importar CSV ================= */
function openImport(){
  openSheet(`<h2>Importar movimientos</h2>
    <div class="hint">${svg("export")}<span>Pega aquí lo que copiaste con «Exportar a Excel» (en esta app o en la versión anterior). Columnas: Fecha;Tipo;Concepto;Categoría;Pago;Importe.</span></div>
    <textarea class="csv" id="csvIn" placeholder="Fecha;Tipo;Concepto;Categoría;Pago;Importe"></textarea>
    <div class="note" id="err"></div>
    <div class="btns"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="imp">Importar</button></div>`);
  sheet.querySelector("[data-close].btn").onclick=closeSheet;
  sheet.querySelector("#imp").onclick=()=>{
    const txt=sheet.querySelector("#csvIn").value.trim();if(!txt)return;
    const parseLine=l=>{const out=[];let cur="",q=false;for(let i=0;i<l.length;i++){const ch=l[i];if(q){if(ch==='"'&&l[i+1]==='"'){cur+='"';i++}else if(ch==='"')q=false;else cur+=ch}else if(ch==='"')q=true;else if(ch===";"||ch==="\t"){out.push(cur);cur=""}else cur+=ch}out.push(cur);return out};
    const lines=txt.split(/\r?\n/).filter(Boolean);let n=0,bad=0;
    const existing=new Set(Object.values(state.mov).map(m=>`${m.fecha}|${m.importe}|${m.nota||""}`));
    for(const l of lines){const [fecha,tipoT,nota,catN,metodo,impT]=parseLine(l);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(fecha||"")){if(n||bad||!/fecha/i.test(fecha||""))bad++;continue}
      const v=Math.abs(num(impT));if(!(v>0)){bad++;continue}
      const tipo=/ingreso/i.test(tipoT||"")||(!/gasto/i.test(tipoT||"")&&!String(impT).trim().startsWith("-"))?"ingreso":"gasto";
      const cats=catsFor(tipo);const c=cats.find(x=>x.n.toLowerCase()===(catN||"").trim().toLowerCase())||cats.find(x=>/otros/i.test(x.n))||cats[0];
      const key=`${fecha}|${money2(v)}|${(nota||"").trim()}`;if(existing.has(key))continue;existing.add(key);
      saveMov({id:uid("g"),tipo,importe:money2(v),cat:c.id,nota:(nota||"").trim().slice(0,80),metodo:METODOS.includes(metodo)?metodo:"",fecha,creado:Date.now()});n++}
    if(!n){sheet.querySelector("#err").textContent=bad?"No he reconocido el formato. Pega el texto tal cual lo copiaste.":"No había movimientos nuevos.";return}
    closeSheet();toast(`${n} movimiento${n===1?"":"s"} importado${n===1?"":"s"}`);
  };
}

function showBanner(t){const b=document.getElementById("banner");b.textContent=t;b.style.display="block"}
function hideBanner(){document.getElementById("banner").style.display="none"}

/* acciones de guardado (actualizan el estado y luego persisten) */
function saveMov(m){state.mov[m.id]=m;render();store&&store.save("mov",m)}
function delMov(id,{undo=true}={}){
  const m=state.mov[id];if(!m)return;
  delete state.mov[id];
  let fijoPrev=null;
  if(m.fijo&&state.fijos[m.fijo]){const f=state.fijos[m.fijo];fijoPrev=JSON.parse(JSON.stringify(f));const mk=m.fecha.slice(0,7);
    f.omitidos=[...new Set([...(f.omitidos||[]),mk])];store&&store.save("fijos",f)}
  render();store&&store.del("mov",id);
  if(m.ticket)setTimeout(()=>{if(!state.mov[id])delTicket(id)},8000);
  if(undo)toast(`${tipoOf(m)==="ingreso"?"Ingreso":"Gasto"} borrado`,()=>{if(fijoPrev){state.fijos[fijoPrev.id]=fijoPrev;store&&store.save("fijos",fijoPrev)}saveMov(m)});
}
function saveFijo(f){state.fijos[f.id]=f;store&&store.save("fijos",f);generarFijos();render()}
function delFijo(id){delete state.fijos[id];store&&store.del("fijos",id);render()}
function saveMeta(m){state.metas[m.id]=m;render();store&&store.save("metas",m)}
function delMeta(id){const m=state.metas[id];delete state.metas[id];render();store&&store.del("metas",id);toast("Meta borrada",()=>saveMeta(m))}
function saveAj(){render();store&&store.saveAj()}

/* ================= Gastos fijos automáticos ================= */
function generarFijos(){
  if(!loaded.mov||!loaded.fijos)return;
  const hoy=new Date(),hoyK=monthKey(hoy),hoyD=hoy.getDate();
  for(const f of Object.values(state.fijos)){
    if(f.activo===false||!f.desde)continue;
    let [y,m]=f.desde.split("-").map(Number);
    let guard=0;
    while(guard++<120){
      const mk=`${y}-${pad(m)}`;if(mk>hoyK)break;
      const dim=new Date(y,m,0).getDate(),dia=Math.min(+f.dia||1,dim);
      const due=mk<hoyK||dia<=hoyD;
      const id=`f_${f.id}_${mk}`;
      if(due&&!state.mov[id]&&!(f.omitidos||[]).includes(mk)){
        const mov={id,tipo:f.tipo||"gasto",importe:f.importe,cat:f.cat,nota:f.nota||"",fecha:`${mk}-${pad(dia)}`,metodo:f.metodo||"",fijo:f.id,creado:Date.now()};
        state.mov[id]=mov;store&&store.save("mov",mov);
      }
      m++;if(m>12){m=1;y++}
    }
  }
}

/* ================= Cálculos ================= */
function movsMes(d=cur){const k=monthKey(d);return Object.values(state.mov).filter(g=>g.fecha&&g.fecha.startsWith(k)).sort((a,b)=>b.fecha.localeCompare(a.fecha)||(b.creado||0)-(a.creado||0))}
const sum=arr=>arr.reduce((s,g)=>s+(+g.importe||0),0);
const gastos=arr=>arr.filter(m=>tipoOf(m)==="gasto");
const ingresos=arr=>arr.filter(m=>tipoOf(m)==="ingreso");

/* ================= Render ================= */
let lastView="",lastCounts={};
function countUp(root){
  root.querySelectorAll("[data-count]").forEach(n=>{const k=n.dataset.count,to=+n.dataset.val,from=lastCounts[k];lastCounts[k]=to;
    if(from===undefined||from===to||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    const t0=performance.now(),D=700;const step=t=>{const p=Math.min(1,(t-t0)/D),e=1-Math.pow(1-p,3),v=from+(to-from)*e;
      n.innerHTML=`${v<-0.004?"−":v>0.004?"+":""}${amtHTML(Math.abs(v))}`;if(p<1)requestAnimationFrame(step)};requestAnimationFrame(step)});
}
function render(){
  const ml=cur.toLocaleDateString("es-ES",{month:innerWidth<440?"short":"long",year:"numeric"}).replace(".","").replace(" de "," ");document.getElementById("month").textContent=ml.charAt(0).toUpperCase()+ml.slice(1);
  document.getElementById("monthnav").hidden=!(view==="inicio"||view==="analisis");
  document.getElementById("title").textContent=({inicio:"Resumen",analisis:"Análisis",buscar:"Movimientos",inversion:"Inversión",mas:"Ajustes",grupos:"Grupos",grupo:(groups[curGroup]&&groups[curGroup].nombre)||"Grupo"})[view];
  document.getElementById("add").hidden=view==="mas"||view==="inversion"||view==="grupos"||view==="grupo";
  document.getElementById("invWidgets").hidden=view!=="inversion";
  if(view==="inversion")mountInversion();
  const el=document.getElementById("view");
  const fid=document.activeElement&&document.activeElement.id;
  const keepFocus=(view==="buscar"&&fid==="qtext")||(view==="inversion"&&/^s(Ini|Mes|Anos|Rent)$/.test(fid||""));
  const selStart=keepFocus?document.activeElement.selectionStart:0;
  el.classList.toggle("noanim",lastView===view);lastView=view;
  el.innerHTML=({inicio:vInicio,analisis:vAnalisis,buscar:vBuscar,inversion:vInversion,mas:vMas,grupos:vGrupos,grupo:vGrupo})[view]();
  wire(el);countUp(el);updateBadge();
  if(keepFocus){const i=document.getElementById(fid);i.focus();try{i.setSelectionRange(selStart,selStart)}catch(e){}}
}

function itemHTML(g,showDate){
  const t=tipoOf(g),c=catOf(g.cat,t);
  const d=showDate?new Date(g.fecha+"T12:00").toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"2-digit"})+" · ":"";
  return `<div class="item" data-mov="${esc(g.id)}">
    ${icoHTML(c)}
    <div style="min-width:0"><div class="t">${esc(g.nota||c.n)}</div><div class="small">${d}${esc(c.n)}${g.metodo?" · "+esc(g.metodo):""}${g.fijo?`<span class="tag">${svg("repeat")}Fijo</span>`:""}${g.ticket?`<span class="tag">${svg("receipt")}Ticket</span>`:""}</div></div>
    <div class="amt ${t==="ingreso"?"inc":""}">${t==="ingreso"?"+":"−"}${amtHTML(g.importe)}</div></div>`;
}

function vInicio(){
  const all=movsMes(),G=sum(gastos(all)),I=sum(ingresos(all)),bal=I-G,pres=+state.aj.presupuesto||0;
  const now=new Date(),isThis=monthKey(now)===monthKey(cur);
  // comparación con el mes anterior a la misma altura del mes
  let insight="";
  {const prevD=new Date(cur.getFullYear(),cur.getMonth()-1,1),pm=movsMes(prevD);
   const lim=isThis?now.getDate():31;
   const pG=sum(gastos(pm).filter(m=>+m.fecha.slice(8,10)<=lim));
   if(pG>0&&G>0){const d=G-pG,mes=prevD.toLocaleDateString("es-ES",{month:"long"});
     insight=`<div class="insight">${svg(d>0?"arrowUp":"arrowDown")}<span><b>${fmt0(Math.abs(d))}</b> ${d>0?"más":"menos"} que en ${mes}${isThis?" a estas alturas":""}</span></div>`}}
  let budget="";
  if(pres>0){const p=Math.min(100,G/pres*100),left=pres-G;
    const daysIn=new Date(cur.getFullYear(),cur.getMonth()+1,0).getDate(),rest=isThis?daysIn-now.getDate()+1:0;
    budget=`<div class="hbar ${G>pres?"over":""}"><div style="width:${p}%"></div></div>
    <div class="hrow"><span>${Math.round(G/pres*100)}% de ${fmt0(pres)}</span><span>${left>=0?`Quedan <b>${fmt0(left)}</b>${rest>0?` · ${fmt0(left/rest)}/día`:""}`:`Te pasas <b>${fmt0(-left)}</b>`}</span></div>`}
  const list=filtroInicio==="todo"?all:all.filter(m=>tipoOf(m)===filtroInicio);
  let movs;
  if(!list.length)movs=`<div class="card empty">${icoHTML({i:"receipt",c:""})}${all.length?"No hay movimientos de este tipo.":"<span><b>Sin movimientos este mes.</b><br>Pulsa Añadir para apuntar el primero.</span>"}</div>`;
  else{const byDay={};list.forEach(g=>(byDay[g.fecha]??=[]).push(g));
    movs=Object.entries(byDay).map(([f,gs])=>{const d=new Date(f+"T12:00");
      const lab=f===todayStr()?"Hoy":d.toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"short"});
      const net=sum(ingresos(gs))-sum(gastos(gs));
      return `<div class="day"><span>${lab}</span><span class="num">${net>0?"+":net<0?"−":""}${fmt(Math.abs(net))}</span></div><div class="card" style="padding:2px 14px">${gs.map(g=>itemHTML(g)).join("")}</div>`}).join("")}
  const metas=Object.values(state.metas);
  const metasMini=metas.length?`<div class="card"><div class="row" style="margin-bottom:12px"><h3>Metas de ahorro</h3><button class="link" data-act="metas">Ver todas${svg("chevR")}</button></div>
    ${metas.slice(0,3).map(m=>{const p=Math.min(100,(m.ahorrado||0)/(m.objetivo||1)*100);return `<div style="margin-bottom:12px"><div class="row"><span style="font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px">${svg(iconOf(m))}${esc(m.nombre)}</span><span class="small num">${fmt0(m.ahorrado||0)} / ${fmt0(m.objetivo)}</span></div><div class="mini"><div style="width:${p}%;background:var(--accent)"></div></div></div>`}).join("")}</div>`:"";
  // línea de evolución del balance día a día
  const daysIn=new Date(cur.getFullYear(),cur.getMonth()+1,0).getDate(),lastDay=isThis?now.getDate():daysIn;
  const pts=[];let acc=0;for(let d=1;d<=lastDay;d++){const f=`${monthKey(cur)}-${pad(d)}`;all.filter(m=>m.fecha===f).forEach(m=>acc+=tipoOf(m)==="ingreso"?+m.importe:-m.importe);pts.push(acc)}
  let spark="";if(pts.length>1){const mn=Math.min(0,...pts),mx=Math.max(1,...pts),W=320,H=52;
    const xy=pts.map((v,i)=>[i/(daysIn-1)*W,4+(H-8)*(1-(v-mn)/(mx-mn||1))]);const p=xy.map(([x,y],i)=>`${i?"L":"M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");const [lx,ly]=xy[xy.length-1];
    spark=`<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="sg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2ee59d" stop-opacity=".45"/><stop offset="1" stop-color="#2ee59d" stop-opacity="0"/></linearGradient></defs><path d="${p}L${lx},${H}L0,${H}Z" fill="url(#sg)"/><path d="${p}" fill="none" stroke="#7dffc8" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/><circle cx="${lx}" cy="${ly}" r="3.5" fill="#fff"/></svg>`}
  return `<section class="hero">
    <div class="hero-top"><div class="brandchip"><img src="logo.png" alt="">Ahorra+</div><button class="link" data-act="presupuesto">${pres?"Presupuesto":"Fijar presupuesto"}</button></div>
    <div class="lbl">Balance de ${cur.toLocaleDateString("es-ES",{month:"long"})}</div>
    <div class="big" data-count="bal" data-val="${bal}">${bal<0?"−":bal>0?"+":""}${amtHTML(Math.abs(bal))}</div>
    ${insight}${spark}
    <div class="flows">
      <div class="flow"><div class="dot" style="background:rgba(63,195,161,.18);color:#7fe0c4">${svg("arrowDown")}</div><div><div class="lbl">Ingresos</div><div class="v">${fmt0(I)}</div></div></div>
      <div class="flow"><div class="dot" style="background:rgba(249,112,102,.16);color:#fda29b">${svg("arrowUp")}</div><div><div class="lbl">Gastos</div><div class="v">${fmt0(G)}</div></div></div>
    </div>
    ${budget}
  </section>
  ${(()=>{const ins=computeInsights();return ins.length?`<div class="card insight-mini" data-act="analisisgo">${icoHTML({i:ins[0].ic,c:ins[0].c})}<div><div class="lbl">Resumen inteligente</div><div style="font-weight:600;margin-top:2px">${ins[0].t}</div></div><span class="chev">${svg("chevR")}</span></div>`:""})()}
  <div class="quick">
    <button data-act="nuevogasto"><span class="qi">${svg("arrowUp")}</span>Gasto</button>
    <button data-act="nuevoingreso"><span class="qi">${svg("arrowDown")}</span>Ingreso</button>
    <button data-act="informe"><span class="qi">${svg("receipt")}</span>Informe</button>
    <button data-act="grupos"><span class="qi">${svg("handshake")}</span>Grupos</button>
  </div>
    ${metasMini}
    <div class="seg">${[["todo","Todo"],["gasto","Gastos"],["ingreso","Ingresos"]].map(([k,n])=>`<button data-filtro="${k}" class="${filtroInicio===k?"on":""}">${n}</button>`).join("")}</div>
    ${movs}`;
}

function donut(rows,total){
  if(!(total>0))return"";let a=0;const R=62,C=2*Math.PI*R,rs=rows.filter(r=>r.v>0),gap=rs.length>1?3:0;
  return `<svg viewBox="0 0 160 160" width="168" height="168" style="display:block;margin:2px auto 16px" role="img" aria-label="Gastos por categoría">`+
    `<circle cx="80" cy="80" r="${R}" fill="none" style="stroke:var(--line)" stroke-width="14"/>`+
    rs.map(r=>{const l=r.v/total*C;const s=`<circle cx="80" cy="80" r="${R}" fill="none" stroke="${esc(r.c)}" stroke-width="14" stroke-dasharray="${Math.max(0.5,l-gap)} ${C-Math.max(0.5,l-gap)}" stroke-dashoffset="${-a}" transform="rotate(-90 80 80)"/>`;a+=l;return s}).join("")+
    `<text x="80" y="74" text-anchor="middle" font-size="10.5" font-weight="600" style="fill:var(--muted)">Total gastado</text><text x="80" y="96" text-anchor="middle" font-size="19" font-weight="700" style="fill:var(--ink);font-family:Sora,sans-serif">${fmt0(total)}</text></svg>`;
}

function vAnalisis(){
  const all=movsMes(),gs=gastos(all),total=sum(gs);
  const tot={};gs.forEach(g=>tot[g.cat]=(tot[g.cat]||0)+(+g.importe));
  const known=catsG().map(c=>c.id);
  const extra=Object.keys(tot).filter(k=>!known.includes(k)).map(k=>catOf(k,"gasto"));
  const rows=[...catsG(),...extra].map(c=>({...c,v:tot[c.id]||0,lim:+(state.aj.porCat[c.id]||0)})).filter(c=>c.v>0||c.lim>0).sort((a,b)=>b.v-a.v);
  const catsCard=`<div class="card"><h3 style="margin-bottom:12px">Gastos por categoría</h3>${donut(rows,total)}${rows.length?`<div class="cats">`+rows.map(r=>{
    const p=r.lim>0?Math.min(100,r.v/r.lim*100):(total?r.v/total*100:0),over=r.lim>0&&r.v>r.lim;
    return `<div class="cat" data-buscarcat="${esc(r.id)}" style="cursor:pointer">${icoHTML(r)}
      <div><div class="row"><span style="font-weight:600">${esc(r.n)}</span><span class="small">${r.lim>0?`de ${fmt0(r.lim)}`:`${Math.round(total?r.v/total*100:0)}%`}</span></div>
      <div class="mini"><div style="width:${p}%;background:${over?"var(--neg)":esc(r.c)}"></div></div></div>
      <div class="amt" style="${over?"color:var(--neg)":""}">${amtHTML(r.v)}</div></div>`}).join("")+`</div>`:`<div class="empty">Sin gastos este mes.</div>`}
    <div style="text-align:center;margin-top:14px"><button class="link" data-act="limites">${svg("gauge")}Límites por categoría</button></div></div>`;

  // 6 meses ingresos vs gastos
  const months=[];for(let i=5;i>=0;i--){const d=new Date(cur.getFullYear(),cur.getMonth()-i,1),ms=movsMes(d);months.push({d,g:sum(gastos(ms)),i:sum(ingresos(ms))})}
  const pres=+state.aj.presupuesto||0;
  const max=Math.max(1,...months.map(m=>Math.max(m.g,m.i)),pres);
  const step=(()=>{const raw=max/3,p=Math.pow(10,Math.floor(Math.log10(raw)));return [1,2,2.5,5,10].map(k=>k*p).find(v=>v>=raw)})(),top=step*3;
  const W=320,L=34,H=130,T=8,gw=(W-L)/6,bw=Math.min(14,gw/3);
  const y=v=>T+H-(v/top)*H;
  const grid=[0,1,2,3].map(k=>{const v=k*step;return `<line x1="${L}" x2="${W}" y1="${y(v)}" y2="${y(v)}" style="stroke:var(--line)" ${k?'stroke-dasharray="2 4"':""}/><text x="${L-6}" y="${y(v)+3.5}" text-anchor="end" font-size="9.5" style="fill:var(--muted)">${v>=1000?(v/1000).toLocaleString("es-ES",{maximumFractionDigits:1})+"k":Math.round(v)}</text>`}).join("");
  const chart=`<svg viewBox="0 0 ${W} ${T+H+22}" width="100%" role="img" aria-label="Ingresos y gastos de los últimos 6 meses">${grid}`+months.map((m,k)=>{const cx=L+gw*k+gw/2,last=k===5;
    return `<rect x="${cx-bw-1.5}" y="${y(m.i)}" width="${bw}" height="${Math.max(T+H-y(m.i),1.5)}" rx="3" style="fill:var(--pos)" opacity="${last?1:.45}"/>
    <rect x="${cx+1.5}" y="${y(m.g)}" width="${bw}" height="${Math.max(T+H-y(m.g),1.5)}" rx="3" style="fill:var(--ink)" opacity="${last?.9:.28}"/>
    <text x="${cx}" y="${T+H+16}" text-anchor="middle" font-size="10.5" font-weight="${last?700:500}" style="fill:${last?"var(--ink)":"var(--muted)"}">${m.d.toLocaleDateString("es-ES",{month:"short"}).replace(".","")}</text>`}).join("")+
    (pres&&pres<=top?`<line x1="${L}" x2="${W}" y1="${y(pres)}" y2="${y(pres)}" style="stroke:var(--warn)" stroke-width="1.5" stroke-dasharray="5 4"/>`:"")+`</svg>`;

  const now=new Date(),isThis=monthKey(now)===monthKey(cur),daysIn=new Date(cur.getFullYear(),cur.getMonth()+1,0).getDate();
  const daysGone=isThis?now.getDate():daysIn,avg=total/Math.max(1,daysGone);
  const fijosHechos=sum(gs.filter(g=>g.fijo)),variable=total-fijosHechos;
  const fijosPend=isThis?sum(Object.values(state.fijos).filter(f=>f.activo!==false&&(f.tipo||"gasto")==="gasto"&&!state.mov[`f_${f.id}_${monthKey(cur)}`]&&!(f.omitidos||[]).includes(monthKey(cur)))):0;
  const prevision=variable/Math.max(1,daysGone)*daysIn+fijosHechos+fijosPend;
  const prev=months[4].g,diff=prev?((total-prev)/prev*100):null;
  const big=gs.slice().sort((a,b)=>b.importe-a.importe)[0];

  // año
  const yr=cur.getFullYear(),ya=Object.values(state.mov).filter(m=>m.fecha&&m.fecha.startsWith(yr+"-"));
  const yG=sum(gastos(ya)),yI=sum(ingresos(ya));
  const mesesConDatos=new Set(ya.map(m=>m.fecha.slice(0,7))).size||1;

  return `${insightsCard()}${catsCard}
  <div class="card"><h3 style="margin-bottom:10px">Últimos 6 meses</h3>${chart}
    <div class="legend"><span><i style="background:var(--pos)"></i>Ingresos</span><span><i style="background:var(--ink);opacity:.9"></i>Gastos</span>${pres?`<span><i style="background:var(--warn)"></i>Presupuesto</span>`:""}</div></div>
  <div class="stats">
    <div class="card stat"><div class="lbl">Media diaria</div><div class="v">${fmt(avg)}</div></div>
    <div class="card stat"><div class="lbl">${isThis?"Previsión mes":"Total gastos"}</div><div class="v">${fmt(isThis?prevision:total)}</div></div>
    <div class="card stat"><div class="lbl">Vs. mes anterior</div><div class="v">${diff==null?"—":`<span class="pill ${diff>0?"up":"down"}">${svg(diff>0?"arrowUp":"arrowDown")}${Math.abs(Math.round(diff))}%</span>`}</div></div>
    <div class="card stat"><div class="lbl">Mayor gasto</div><div class="v" style="font-size:15px">${big?fmt(big.importe):"—"}</div>${big?`<div class="small" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(big.nota||catOf(big.cat).n)}</div>`:""}</div>
  </div>
  <div class="card"><h3 style="margin-bottom:12px">Año ${yr}</h3>
    <div class="trio">
      <div><div class="lbl">Ingresos</div><div class="v" style="color:var(--pos)">${fmt0(yI)}</div></div>
      <div><div class="lbl">Gastos</div><div class="v">${fmt0(yG)}</div></div>
      <div><div class="lbl">Ahorrado</div><div class="v" style="${yI-yG<0?"color:var(--neg)":""}">${fmt0(yI-yG)}</div></div>
    </div>
    <div class="small" style="margin-top:10px">Gasto medio al mes: <b>${fmt(yG/mesesConDatos)}</b></div></div>`;
}

function vBuscar(){
  const t=q.texto.trim().toLowerCase();
  let res=Object.values(state.mov).filter(m=>{
    if(q.tipo&&tipoOf(m)!==q.tipo)return false;
    if(q.cat&&m.cat!==q.cat)return false;
    if(t){const c=catOf(m.cat,tipoOf(m));const hay=`${m.nota||""} ${c.n} ${m.metodo||""} ${String(m.importe).replace(".",",")}`.toLowerCase();if(!hay.includes(t))return false}
    return true}).sort((a,b)=>b.fecha.localeCompare(a.fecha)||(b.creado||0)-(a.creado||0));
  const active=t||q.cat||q.tipo;
  const G=sum(gastos(res)),I=sum(ingresos(res));
  const allCats=[...catsG(),...catsI()];
  return `<div class="searchbox"><svg class="i" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg><input class="input" id="qtext" type="search" placeholder="Busca por concepto, categoría o importe" value="${esc(q.texto)}" autocomplete="off"></div>
    <div class="filters">${[["","Todo"],["gasto","Gastos"],["ingreso","Ingresos"]].map(([k,n])=>`<button data-qtipo="${k}" class="${q.tipo===k?"on":""}">${n}</button>`).join("")}</div>
    <div class="filters"><button data-qcat="" class="${!q.cat?"on":""}">Todas</button>${allCats.filter(c=>!q.tipo||catsFor(q.tipo).includes(c)).map(c=>`<button data-qcat="${esc(c.id)}" class="${q.cat===c.id?"on":""}" style="--c:${esc(c.c)}">${svg(iconOf(c))}${esc(c.n)}</button>`).join("")}</div>
    ${active?`<div class="small" style="margin:0 2px 8px">${res.length} resultado${res.length===1?"":"s"}${G?` · gastos ${fmt(G)}`:""}${I?` · ingresos ${fmt(I)}`:""}</div>`:""}
    ${res.length?`<div class="card" style="padding:2px 14px">${res.slice(0,300).map(m=>itemHTML(m,true)).join("")}</div>${res.length>300?`<div class="note">Mostrando los 300 más recientes</div>`:""}`:`<div class="card empty">${active?"No hay nada que coincida.":"Aún no hay movimientos."}</div>`}`;
}

function vMas(){
  const fijos=Object.values(state.fijos).sort((a,b)=>(a.dia||1)-(b.dia||1));
  const fG=sum(fijos.filter(f=>f.activo!==false&&(f.tipo||"gasto")==="gasto")),fI=sum(fijos.filter(f=>f.activo!==false&&f.tipo==="ingreso"));
  const metas=Object.values(state.metas);
  const n=Object.keys(state.mov).length;
  return `
  <div class="card"><h3 style="margin-bottom:10px">Cuenta</h3>
    <div class="row" style="margin-bottom:6px"><div style="min-width:0"><div style="font-weight:600">${esc(me&&me.displayName||"Sin nombre")}</div><div class="small" style="overflow:hidden;text-overflow:ellipsis">${esc(me&&me.email||"")}</div></div><button class="btn sm" data-act="salir">Cerrar sesión</button></div>
    <div class="menu-item" data-act="notis">${icoHTML({i:"bell",c:""})}<div><div style="font-weight:600">Notificaciones</div><div class="small">${pushOn()?"Activadas":"Desactivadas"}</div></div><span class="chev">${svg("chevR")}</span></div>
    <div class="menu-item" data-act="bloqueo">${icoHTML({i:"faceid",c:""})}<div><div style="font-weight:600">Bloqueo con Face ID o código</div><div class="small">${lockCfg()?"Activado":"Desactivado"}</div></div><span class="chev">${svg("chevR")}</span></div>
    <div class="menu-item" data-act="nombre">${icoHTML({i:"tag",c:""})}<div><div style="font-weight:600">Cambiar nombre</div></div><span class="chev">${svg("chevR")}</span></div>
    <div class="menu-item" data-act="clave">${icoHTML({i:"shield",c:""})}<div><div style="font-weight:600">Cambiar contraseña</div><div class="small">Te enviamos un email para hacerlo</div></div><span class="chev">${svg("chevR")}</span></div>
    <div class="menu-item" data-act="privacidad">${icoHTML({i:"book",c:""})}<div><div style="font-weight:600">Privacidad y condiciones</div></div><span class="chev">${svg("chevR")}</span></div>
    <a class="menu-item" href="mailto:soporte.ahorra@gmail.com" style="color:inherit;text-decoration:none">${icoHTML({i:"handshake",c:""})}<div><div style="font-weight:600">Contacto y soporte</div><div class="small">soporte.ahorra@gmail.com</div></div><span class="chev">${svg("chevR")}</span></a>
    <div class="menu-item" data-act="borrar">${icoHTML({i:"alert",c:"#b42318"})}<div><div style="font-weight:600;color:var(--neg)">Borrar mi cuenta</div><div class="small">Elimina tu cuenta y todos tus datos</div></div><span class="chev">${svg("chevR")}</span></div>
  </div>
  <div class="card">
    <div class="row" style="margin-bottom:6px"><h3>Gastos e ingresos fijos</h3><button class="btn sm" data-act="nuevofijo">${svg("plus")}Añadir</button></div>
    <div class="small" style="margin-bottom:6px">Se apuntan solos cada mes el día que elijas.${fijos.length?` Al mes: <b>${fmt(fG)}</b> en gastos${fI?` y <b>${fmt(fI)}</b> en ingresos`:""}.`:""}</div>
    ${fijos.length?fijos.map(f=>{const t=f.tipo||"gasto",c=catOf(f.cat,t);return `<div class="item" data-fijo="${esc(f.id)}" style="${f.activo===false?"opacity:.5":""}">
      ${icoHTML(c)}
      <div style="min-width:0"><div class="t">${esc(f.nota||c.n)}</div><div class="small">Día ${f.dia} de cada mes${f.activo===false?" · en pausa":""}</div></div>
      <div class="amt ${t==="ingreso"?"inc":""}">${t==="ingreso"?"+":"−"}${amtHTML(f.importe)}</div></div>`}).join(""):`<div class="small" style="padding:10px 0">Ej.: alquiler, luz, gimnasio, Netflix, tu nómina…</div>`}
  </div>

  <div class="card" id="metas">
    <div class="row" style="margin-bottom:6px"><h3>Metas de ahorro</h3><button class="btn sm" data-act="nuevameta">${svg("plus")}Añadir</button></div>
    ${metas.length?metas.map(m=>{const p=Math.min(1,(m.ahorrado||0)/(m.objetivo||1)),R=16,C=2*Math.PI*R;
      return `<div class="item" data-meta="${esc(m.id)}" style="grid-template-columns:44px 1fr auto">
      <svg class="goal-ring" width="44" height="44" viewBox="0 0 44 44"><circle cx="22" cy="22" r="${R}" fill="none" style="stroke:var(--line)" stroke-width="5"/><circle cx="22" cy="22" r="${R}" fill="none" style="stroke:var(--accent)" stroke-width="5" stroke-linecap="round" stroke-dasharray="${p*C} ${C}" transform="rotate(-90 22 22)"/><g transform="translate(14 14) scale(.667)" fill="none" style="stroke:var(--accent)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ICONS[iconOf(m)]}</g></svg>
      <div style="min-width:0"><div class="t">${esc(m.nombre)}</div><div class="small">${fmt0(m.ahorrado||0)} de ${fmt0(m.objetivo)}${m.fecha?` · para ${new Date(m.fecha+"T12:00").toLocaleDateString("es-ES",{month:"short",year:"numeric"})}`:""}</div></div>
      <div class="amt">${Math.round(p*100)} %</div></div>`}).join(""):`<div class="small" style="padding:10px 0">Ej.: vacaciones, colchón de emergencia, coche nuevo…</div>`}
  </div>

  <div class="card" style="padding:4px 16px">
    <div class="menu-item" data-act="presupuesto">${icoHTML({i:"gauge",c:"#0d7a64"})}<div><div style="font-weight:600">Presupuesto mensual</div><div class="small">${state.aj.presupuesto?fmt(state.aj.presupuesto):"Sin presupuesto"}</div></div><span class="chev">${svg("chevR")}</span></div>
    <div class="menu-item" data-act="limites">${icoHTML({i:"sliders",c:"#0d7a64"})}<div><div style="font-weight:600">Límites por categoría</div><div class="small">${Object.keys(state.aj.porCat||{}).length||"Ningún"} límite${Object.keys(state.aj.porCat||{}).length===1?"":"s"}</div></div><span class="chev">${svg("chevR")}</span></div>
    <div class="menu-item" data-act="categorias">${icoHTML({i:"layers",c:"#0d7a64"})}<div><div style="font-weight:600">Categorías</div><div class="small">${catsG().length} de gastos · ${catsI().length} de ingresos</div></div><span class="chev">${svg("chevR")}</span></div>
    <div class="menu-item" data-act="exportar">${icoHTML({i:"export",c:"#0d7a64"})}<div><div style="font-weight:600">Exportar a Excel</div><div class="small">${n} movimiento${n===1?"":"s"} en total</div></div><span class="chev">${svg("chevR")}</span></div>
    <div class="menu-item" data-act="importar">${icoHTML({i:"arrowDown",c:"#0d7a64"})}<div><div style="font-weight:600">Importar movimientos</div><div class="small">Desde Excel o la versión anterior</div></div><span class="chev">${svg("chevR")}</span></div>
  </div>`;
}


/* ================= Inversión ================= */
let invMounted=false,sim=null;
const DEF_WATCH=["AMEX:VT","AMEX:VOO","NASDAQ:QQQ","BINANCE:BTCUSDT"];
const watchlist=()=>state.aj.watchlist&&state.aj.watchlist.length?state.aj.watchlist:DEF_WATCH;
const isDark=()=>true;
function tvWidget(host,name,cfg){
  const box=document.createElement("div");box.className="tradingview-widget-container";
  box.innerHTML='<div class="tradingview-widget-container__widget"></div>';
  const s=document.createElement("script");s.type="text/javascript";s.async=true;
  s.src=`https://s3.tradingview.com/external-embedding/embed-widget-${name}.js`;
  s.innerHTML=JSON.stringify({colorTheme:isDark()?"dark":"light",isTransparent:true,locale:"es",...cfg});
  box.appendChild(s);host.appendChild(box);
}
function mountInversion(){
  if(invMounted)return;invMounted=true;
  const iw=document.getElementById("invWidgets");
  iw.innerHTML=`<div class="card"><h3>Mercados</h3><p class="small" style="margin:4px 0 10px">Cotizaciones con retraso, de TradingView. Toca una pestaña para cambiar de mercado.</p><div id="tvMarkets"></div></div>
    <div class="card"><div class="row" style="margin-bottom:4px"><h3>Mi lista de seguimiento</h3><button class="btn sm" id="wlAdd">${svg("plus")}Añadir</button></div>
      <p class="small" style="margin:0 0 6px">Escribe el símbolo tal como aparece en TradingView, por ejemplo <b>AAPL</b>, <b>BME:SAN</b> o <b>XETR:VWCE</b>.</p><div id="tvWatch"></div></div>
    <div class="card"><h3 style="margin-bottom:10px">Noticias de mercado</h3><div id="tvNews"></div></div>
    <div class="card hint" style="display:block;box-shadow:none"><b style="color:var(--ink)">Aviso importante.</b> Esta sección es informativa y educativa. No es asesoramiento financiero ni una recomendación para comprar o vender ningún producto. Invertir conlleva riesgo de perder dinero y las rentabilidades pasadas no garantizan las futuras. Si tienes dudas, consulta con un asesor registrado en la CNMV.</div>`;
  tvWidget(iw.querySelector("#tvMarkets"),"market-overview",{dateRange:"12M",showChart:true,width:"100%",height:560,showSymbolLogo:true,showFloatingTooltip:false,
    plotLineColorGrowing:"#2ee59d",plotLineColorFalling:"#ff6b6b",gridLineColor:"rgba(255,255,255,0.06)",scaleFontColor:"#8792a2",
    belowLineFillColorGrowing:"rgba(46,229,157,0.18)",belowLineFillColorFalling:"rgba(180,35,24,0.10)",belowLineFillColorGrowingBottom:"rgba(46,229,157,0)",belowLineFillColorFallingBottom:"rgba(180,35,24,0)",symbolActiveColor:"rgba(46,229,157,0.10)",
    tabs:[
      {title:"Índices",symbols:[{s:"TVC:IBEX35",d:"IBEX 35"},{s:"FOREXCOM:SPXUSD",d:"S&P 500"},{s:"FOREXCOM:NSXUSD",d:"Nasdaq 100"},{s:"TVC:SX5E",d:"Euro Stoxx 50"},{s:"FOREXCOM:DJI",d:"Dow Jones"}]},
      {title:"Fondos indexados",symbols:[{s:"AMEX:VT",d:"Vanguard Total World"},{s:"AMEX:VOO",d:"Vanguard S&P 500"},{s:"NASDAQ:QQQ",d:"Invesco Nasdaq 100"},{s:"AMEX:BND",d:"Vanguard Bonos EE. UU."},{s:"AMEX:GLD",d:"Oro (SPDR Gold)"}]},
      {title:"Cripto",symbols:[{s:"BINANCE:BTCUSDT",d:"Bitcoin"},{s:"BINANCE:ETHUSDT",d:"Ethereum"},{s:"BINANCE:SOLUSDT",d:"Solana"}]},
      {title:"Divisas",symbols:[{s:"FX:EURUSD",d:"Euro / Dólar"},{s:"FX:EURGBP",d:"Euro / Libra"},{s:"FX_IDC:EURMXN",d:"Euro / Peso mexicano"}]}]});
  tvWidget(iw.querySelector("#tvNews"),"timeline",{feedMode:"market",market:"stock",displayMode:"regular",width:"100%",height:520});
  iw.querySelector("#wlAdd").onclick=openWatchAdd;
  mountWatchlist();
}
let wlKey="";
function mountWatchlist(){
  const host=document.getElementById("tvWatch");if(!host)return;
  const list=watchlist(),key=list.join("|")+(isDark()?"d":"l");if(key===wlKey&&host.childElementCount)return;wlKey=key;
  host.innerHTML="";
  list.forEach(sym=>{const row=document.createElement("div");row.className="wl-item";
    row.innerHTML=`<button class="wl-del" aria-label="Quitar ${esc(sym)}" title="Quitar">${svg("x")}</button>`;
    row.querySelector(".wl-del").onclick=()=>{const l=watchlist().filter(x=>x!==sym);state.aj.watchlist=l.length?l:[];saveAj();wlKey="";mountWatchlist()};
    host.appendChild(row);
    tvWidget(row,"mini-symbol-overview",{symbol:sym,width:"100%",height:170,dateRange:"12M",autosize:false,chartOnly:false,noTimeScale:true,trendLineColor:"rgba(46,229,157,1)",underLineColor:"rgba(46,229,157,0.15)",underLineBottomColor:"rgba(46,229,157,0)"});
  });
  if(!list.length)host.innerHTML=`<div class="empty">Tu lista está vacía. Pulsa Añadir.</div>`;
}
function openWatchAdd(){
  openSheet(`<h2>Añadir a mi lista</h2>
    <label class="field small" for="wlSym">Símbolo<input id="wlSym" autocomplete="off" autocapitalize="characters" placeholder="Ej. AAPL, BME:ITX, XETR:VWCE"></label>
    <div class="hint">${svg("search")||""}<span>Búscalo en tradingview.com y copia el código que aparece junto al nombre. Para acciones españolas usa <b>BME:</b> delante (BME:SAN, BME:ITX…).</span></div>
    <div class="note" id="err"></div>
    <div class="btns"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="ok">Añadir</button></div>`);
  const inp=sheet.querySelector("#wlSym");setTimeout(()=>inp.focus(),150);
  sheet.querySelector("#ok").onclick=()=>{const v=inp.value.trim().toUpperCase().replace(/\s+/g,"");
    if(!/^[A-Z0-9_]+(:[A-Z0-9_.!-]+)?$/.test(v)){sheet.querySelector("#err").textContent="Escribe un símbolo válido, por ejemplo AAPL o BME:SAN.";return}
    const l=watchlist().filter(x=>x!==v);if(l.length>=12){sheet.querySelector("#err").textContent="Máximo 12 valores en la lista.";return}
    state.aj.watchlist=[...l,v];saveAj();wlKey="";mountWatchlist();closeSheet();toast(`${v} añadido a tu lista`)};
}
function vInversion(){
  const months=[];for(let i=1;i<=6;i++){const d=new Date(cur.getFullYear(),cur.getMonth()-i+1,1),ms=movsMes(d);months.push({g:sum(gastos(ms)),i:sum(ingresos(ms))})}
  const withData=months.filter(m=>m.g||m.i),n=Math.max(1,withData.length);
  const avgG=withData.reduce((s,m)=>s+m.g,0)/n,avgI=withData.reduce((s,m)=>s+m.i,0)/n,avgS=avgI-avgG;
  const rate=avgI>0?avgS/avgI*100:null;
  const colchon=sum(Object.values(state.metas).map(m=>({importe:m.ahorrado||0})));
  const objMin=avgG*3,objMax=avgG*6,colPct=objMin>0?Math.min(100,colchon/objMin*100):0;
  if(!sim)sim={ini:0,mes:Math.max(0,Math.round(avgS>0?avgS*0.5:50)),anos:10,rent:5};
  const tips=[];
  if(!withData.length)tips.push(["receipt","Apunta tus ingresos y gastos durante un par de meses: así esta sección podrá calcular cuánto puedes invertir."]);
  else{
    if(avgS<=0)tips.push(["alert","Ahora mismo gastas lo mismo o más de lo que ingresas. Antes de invertir, conviene ajustar gastos hasta ahorrar algo cada mes."]);
    else if(colchon<objMin)tips.push(["shield",`Lo habitual es tener primero un colchón de emergencia de 3 a 6 meses de gastos (${fmt0(objMin)} – ${fmt0(objMax)}). Puedes crearlo como meta de ahorro en Ajustes.`]);
    else tips.push(["check","Tienes un colchón de emergencia razonable. Lo que ahorres a partir de ahí es lo que podrías plantearte invertir a largo plazo."]);
    if(rate!=null&&rate>0&&rate<10)tips.push(["gauge",`Ahorras alrededor del ${Math.round(rate)} % de tus ingresos. Una referencia común es apuntar al 10–20 %.`]);
  }
  tips.push(["layers","Diversificar (muchas empresas y países a la vez, como hacen los fondos indexados globales) reduce el riesgo de depender de una sola apuesta."]);
  tips.push(["coins","Fíjate en las comisiones: un 1 % anual de diferencia se come una parte grande del resultado a 20 o 30 años."]);
  tips.push(["calendar","Invierte solo el dinero que no vayas a necesitar en años. A corto plazo la bolsa puede caer bastante."]);
  return `<section class="hero">
    <div class="lbl">Tu capacidad de inversión · media de los últimos meses</div>
    <div class="big">${avgS<0?"−":""}${amtHTML(Math.abs(avgS))}<small style="font-size:.45em;opacity:.7"> /mes</small></div>
    <div class="insight">${rate==null?"Aún no hay datos suficientes":`Ahorras el <b>${Math.round(rate)} %</b> de lo que ingresas`}</div>
    <div class="flows">
      <div class="flow"><div class="dot" style="background:rgba(63,195,161,.18);color:#7fe0c4">${svg("shield")}</div><div><div class="lbl">En tus metas</div><div class="v">${fmt0(colchon)}</div></div></div>
      <div class="flow"><div class="dot" style="background:rgba(255,255,255,.1);color:#cfd8e3">${svg("target")}</div><div><div class="lbl">Colchón ideal</div><div class="v">${objMin?fmt0(objMin):"—"}</div></div></div>
    </div>
    ${objMin?`<div class="hbar"><div style="width:${colPct}%"></div></div><div class="hrow"><span>Colchón de emergencia (3 meses de gastos)</span><span><b>${Math.round(colPct)} %</b></span></div>`:""}
  </section>
  <div class="card"><h3 style="margin-bottom:12px">Antes de invertir</h3>${tips.map(([ic,t])=>`<div class="tip">${icoHTML({i:ic,c:"#0d7a64"})}<span>${t}</span></div>`).join("")}</div>
  <div class="card" id="simCard"><h3>Simulador de interés compuesto</h3><p class="small" style="margin:4px 0 12px">Calcula cuánto podría crecer una inversión periódica. La rentabilidad es una suposición tuya, no una promesa.</p>
    <div class="two"><label class="field small" for="sIni">Capital inicial (€)<input id="sIni" inputmode="decimal" value="${sim.ini}"></label><label class="field small" for="sMes">Aportación al mes (€)<input id="sMes" inputmode="decimal" value="${sim.mes}"></label></div>
    <div class="two"><label class="field small" for="sAnos">Años<input id="sAnos" inputmode="numeric" value="${sim.anos}"></label><label class="field small" for="sRent">Rentabilidad anual (%)<input id="sRent" inputmode="decimal" value="${String(sim.rent).replace(".",",")}"></label></div>
    <div id="simOut">${simHTML()}</div></div>`;
}
function simCalc(){const r=(sim.rent||0)/100/12,N=Math.max(0,Math.min(60,Math.round(sim.anos||0)))*12;let v=+sim.ini||0;const pts=[v];for(let k=1;k<=N;k++){v=v*(1+r)+(+sim.mes||0);if(k%12===0)pts.push(v)}
  const ap=(+sim.ini||0)+(+sim.mes||0)*N;return {v,ap,pts}}
function simHTML(){const {v,ap,pts}=simCalc();const g=v-ap;
  const W=320,H=110,T=6,max=Math.max(1,...pts),L=pts.length-1||1;
  const xy=pts.map((p,k)=>[k/L*W,T+H-(p/max)*H]);const line=xy.map(([x,y],k)=>`${k?"L":"M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const apl=pts.map((_,k)=>{const a=(+sim.ini||0)+(+sim.mes||0)*12*k;return [k/L*W,T+H-(a/max)*H]}).map(([x,y],k)=>`${k?"L":"M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  return `<div class="trio" style="margin:4px 0 12px"><div><div class="lbl">Aportado</div><div class="v">${fmt0(ap)}</div></div><div><div class="lbl">Valor estimado</div><div class="v" style="color:var(--pos)">${fmt0(v)}</div></div><div><div class="lbl">Ganancia</div><div class="v">${g>=0?"+":"−"}${fmt0(Math.abs(g))}</div></div></div>
  ${pts.length>1?`<svg viewBox="0 0 ${W} ${T+H+4}" width="100%" role="img" aria-label="Evolución estimada"><path d="${line}L${W},${T+H}L0,${T+H}Z" style="fill:var(--accent-soft)"/><path d="${apl}" style="stroke:var(--muted);fill:none" stroke-width="1.5" stroke-dasharray="4 4"/><path d="${line}" style="stroke:var(--pos);fill:none" stroke-width="2.2"/></svg>
  <div class="legend"><span><i style="background:var(--pos)"></i>Valor estimado</span><span><i style="background:var(--muted)"></i>Dinero aportado</span></div>`:""}`}
function wireSim(el){const c=el.querySelector("#simCard");if(!c)return;
  const map={sIni:"ini",sMes:"mes",sAnos:"anos",sRent:"rent"};
  Object.entries(map).forEach(([id,k])=>{const i=c.querySelector("#"+id);i.oninput=()=>{const v=num(i.value);sim[k]=isNaN(v)?0:Math.max(0,v);c.querySelector("#simOut").innerHTML=simHTML()}})}

/* ================= Interacción ================= */
function wire(el){
  wireSim(el);wireGrupos(el);
  el.querySelectorAll("[data-mov]").forEach(i=>i.onclick=()=>openMov(state.mov[i.dataset.mov]));
  el.querySelectorAll("[data-fijo]").forEach(i=>i.onclick=()=>openFijo(state.fijos[i.dataset.fijo]));
  el.querySelectorAll("[data-meta]").forEach(i=>i.onclick=()=>openMeta(state.metas[i.dataset.meta]));
  el.querySelectorAll("[data-filtro]").forEach(b=>b.onclick=()=>{filtroInicio=b.dataset.filtro;render()});
  el.querySelectorAll("[data-qtipo]").forEach(b=>b.onclick=()=>{q.tipo=b.dataset.qtipo;q.cat="";render()});
  el.querySelectorAll("[data-qcat]").forEach(b=>b.onclick=()=>{q.cat=b.dataset.qcat;render()});
  el.querySelectorAll("[data-buscarcat]").forEach(b=>b.onclick=()=>{q={texto:"",cat:b.dataset.buscarcat,tipo:"gasto"};setView("buscar")});
  const qt=el.querySelector("#qtext");if(qt)qt.oninput=()=>{q.texto=qt.value;render()};
  el.querySelectorAll("[data-act]").forEach(b=>b.onclick=()=>({presupuesto:openBudget,limites:openLimits,categorias:openCats,exportar:openExport,importar:openImport,notis:openPushSettings,analisisgo:()=>setView("analisis"),bloqueo:openLockSettings,grupos:()=>setView("grupos"),nuevogrupo:openNuevoGrupo,unirgrupo:openUnir,gastogrupo:()=>openGastoGrupo(),invitar:invitarGrupo,salirgrupo:salirGrupo,volvergrupos:()=>setView("grupos"),nuevogasto:()=>openMov(null,"gasto"),nuevoingreso:()=>openMov(null,"ingreso"),informe:openReport,nombre:openNombre,clave:sendReset,privacidad:()=>{location.href="privacidad.html"},borrar:openBorrar,salir:()=>{if(confirmSalir()){_auth.signOut()}},
    nuevofijo:()=>openFijo(),nuevameta:()=>openMeta(),metas:()=>{setView("mas");setTimeout(()=>document.getElementById("metas")?.scrollIntoView({behavior:"smooth"}),50)}})[b.dataset.act]());
}
let salirT=0;function confirmSalir(){const b=document.querySelector('[data-act="salir"]');if(Date.now()-salirT<4000)return true;salirT=Date.now();if(b)b.textContent="¿Seguro? Pulsa otra vez";return false}
function setView(v){view=v;document.querySelectorAll("nav.tabbar button").forEach(x=>x.classList.toggle("on",x.dataset.v===v));render();window.scrollTo(0,0)}

const bg=document.getElementById("sheetBg"),sheet=document.getElementById("sheet");
function openSheet(html){
  html=html.replace(/^\s*<h2>([\s\S]*?)<\/h2>/,`<div class="sheet-head"><h2>$1</h2><button type="button" class="xbtn" aria-label="Cerrar" data-close>${svg("x")}</button></div>`);
  sheet.innerHTML=html;bg.classList.add("open");sheet.scrollTop=0;
  sheet.querySelectorAll("[data-close]").forEach(b=>b.onclick=closeSheet)}
function closeSheet(){bg.classList.remove("open")}
bg.onclick=e=>{if(e.target===bg)closeSheet()};
let toastT=null;
function toast(msg,undo){
  const h=document.getElementById("toastHost");clearTimeout(toastT);
  h.innerHTML=`<div class="toast"><span>${esc(msg)}</span>${undo?`<button id="undo">Deshacer</button>`:""}</div>`;
  if(undo)h.querySelector("#undo").onclick=()=>{h.innerHTML="";undo()};
  toastT=setTimeout(()=>h.innerHTML="",5000);
}
function confirmBtn(btn,fn){btn.onclick=()=>{if(btn.dataset.sure){fn()}else{btn.dataset.sure=1;btn.textContent="¿Seguro?"}}}
function catChips(tipo,sel){return catsFor(tipo).map(c=>`<button type="button" class="chip ${c.id===sel?"on":""}" data-c="${esc(c.id)}" style="--c:${esc(c.c)}">${svg(iconOf(c))}<span>${esc(c.n)}</span></button>`).join("")}
function tipoSeg(t){return `<div class="seg" id="tipoSeg"><button type="button" data-t="gasto" class="${t==="gasto"?"on":""}">Gasto</button><button type="button" data-t="ingreso" class="${t==="ingreso"?"on":""}">Ingreso</button></div>`}
function wireTipoCats(st){
  const chipsEl=sheet.querySelector(".chips");
  const wireChips=()=>chipsEl.querySelectorAll(".chip").forEach(b=>b.onclick=()=>{st.cat=b.dataset.c;chipsEl.querySelectorAll(".chip").forEach(x=>x.classList.toggle("on",x===b))});
  wireChips();
  sheet.querySelectorAll("#tipoSeg button").forEach(b=>b.onclick=()=>{
    if(st.tipo===b.dataset.t)return;st.tipo=b.dataset.t;
    sheet.querySelectorAll("#tipoSeg button").forEach(x=>x.classList.toggle("on",x===b));
    st.cat=catsFor(st.tipo)[0].id;chipsEl.innerHTML=catChips(st.tipo,st.cat);wireChips();
  });
}

function openMov(g,tipo0){
  const editing=!!g;
  g=g||{tipo:tipo0||"gasto",cat:catsFor(tipo0||"gasto")[0].id,fecha:monthKey(cur)===monthKey(new Date())?todayStr():`${monthKey(cur)}-01`};
  const st={tipo:tipoOf(g),cat:g.cat};
  if(!catsFor(st.tipo).some(c=>c.id===st.cat)&&!editing)st.cat=catsFor(st.tipo)[0].id;
  openSheet(`<h2>${editing?"Editar movimiento":"Nuevo movimiento"}</h2>
    <form id="f">${tipoSeg(st.tipo)}
      <input class="amount-in" id="imp" inputmode="decimal" placeholder="0,00 €" value="${editing?String(g.importe).replace(".",","):""}" autocomplete="off">
      <div class="chips">${catChips(st.tipo,st.cat)}</div>
      <label class="field small">Concepto<input id="nota" placeholder="Ej. Mercadona" value="${esc(g.nota||"")}" maxlength="80"></label>
      <div class="two">
        <label class="field small">Fecha<input type="date" id="fecha" value="${g.fecha}"></label>
        <label class="field small">Pago<select id="metodo">${METODOS.map(m=>`<option ${m===(g.metodo||"")?"selected":""} value="${m}">${m||"—"}</option>`).join("")}</select></label>
      </div>
      ${editing?(g.fijo?`<div class="hint">${svg("repeat")}<span>Apuntado automáticamente por un fijo. Si lo borras, solo se quita este mes.</span></div>`:""):`<label class="check"><input type="checkbox" id="rep"> Repetir cada mes (se apuntará solo)</label>`}
      <div class="ticket"><label class="btn sm" for="tkIn" id="tkLbl">${svg("receipt")}${g.ticket?"Cambiar foto del ticket":"Añadir foto del ticket"}</label><input type="file" id="tkIn" accept="image/*" hidden>
        <div id="tkPrev">${g.ticket?`<div class="small">Cargando ticket…</div>`:""}</div></div>
      <div class="btns">
        ${editing?`<button type="button" class="btn danger" id="del">Borrar</button>`:`<button type="button" class="btn" id="cancel">Cancelar</button>`}
        <button class="btn primary" type="submit">Guardar</button>
      </div><div class="note" id="err"></div>
    </form>`);
  wireTipoCats(st);
  const prev=sheet.querySelector("#tkPrev");
  const showTk=src=>{prev.innerHTML=src?`<img class="tk-thumb" src="${src}" alt="Foto del ticket"><button type="button" class="link" id="tkDel">${svg("x")}Quitar foto</button>`:"";
    const d=prev.querySelector("#tkDel");if(d)d.onclick=()=>{st.ticketData=null;st.ticketRemove=true;showTk(null);sheet.querySelector("#tkLbl").lastChild.textContent="Añadir foto del ticket"};
    const im=prev.querySelector("img");if(im)im.onclick=()=>viewTicket(src)};
  if(g.ticket&&g.id)getTicket(g.id).then(src=>{if(!st.ticketData&&!st.ticketRemove)showTk(src)});
  sheet.querySelector("#tkIn").onchange=async e=>{const f=e.target.files&&e.target.files[0];if(!f)return;prev.innerHTML=`<div class="small">Procesando foto…</div>`;
    try{st.ticketData=await compressImg(f);st.ticketRemove=false;showTk(st.ticketData)}catch(err){prev.innerHTML=`<div class="note">No se ha podido leer la imagen.</div>`}};
  const imp=sheet.querySelector("#imp");if(!editing)setTimeout(()=>imp.focus(),150);
  sheet.querySelector("#cancel")?.addEventListener("click",closeSheet);
  const del=sheet.querySelector("#del");if(del)confirmBtn(del,()=>{delMov(g.id);closeSheet()});
  sheet.querySelector("#f").onsubmit=e=>{
    e.preventDefault();const v=num(imp.value);
    if(!(v>0)){sheet.querySelector("#err").textContent="Escribe un importe válido";imp.focus();return}
    const fecha=sheet.querySelector("#fecha").value||todayStr();
    const base={tipo:st.tipo,importe:money2(v),cat:st.cat,nota:sheet.querySelector("#nota").value.trim().slice(0,80),metodo:sheet.querySelector("#metodo").value};
    const rep=sheet.querySelector("#rep");
    if(rep&&rep.checked){
      const fid=uid("x");const mk=fecha.slice(0,7);
      const f={id:fid,...base,dia:+fecha.slice(8,10),desde:mk,activo:true,omitidos:[]};
      // crea ya el de este mes con la fecha elegida
      const m={id:`f_${fid}_${mk}`,...base,fecha,fijo:fid,creado:Date.now()};
      if(st.ticketData){m.ticket=true;putTicket(m.id,st.ticketData)}
      saveMov(m);saveFijo(f);
    }else{
      const id=g.id||uid("g"),m={...g,...base,id,fecha,creado:g.creado||Date.now()};
      if(st.ticketData){m.ticket=true;putTicket(id,st.ticketData)}else if(st.ticketRemove){delete m.ticket;delTicket(id)}
      saveMov(m);
    }
    const [y,mm]=fecha.split("-");cur=new Date(+y,+mm-1,1);render();closeSheet();
  };
}

function openFijo(f){
  const editing=!!f;
  f=f||{tipo:"gasto",cat:catsG()[0].id,dia:new Date().getDate(),activo:true};
  const st={tipo:f.tipo||"gasto",cat:f.cat};
  openSheet(`<h2>${editing?"Editar fijo":"Nuevo gasto o ingreso fijo"}</h2>
    <form id="f">${tipoSeg(st.tipo)}
      <input class="amount-in" id="imp" inputmode="decimal" placeholder="0,00 €" value="${editing?String(f.importe).replace(".",","):""}" autocomplete="off">
      <div class="chips">${catChips(st.tipo,st.cat)}</div>
      <label class="field small">Concepto<input id="nota" placeholder="Ej. Alquiler, Netflix, Nómina" value="${esc(f.nota||"")}" maxlength="80"></label>
      <div class="two">
        <label class="field small">Día de cada mes<input id="dia" type="number" min="1" max="31" inputmode="numeric" value="${f.dia||1}"></label>
        <label class="field small">Pago<select id="metodo">${METODOS.map(m=>`<option ${m===(f.metodo||"")?"selected":""} value="${m}">${m||"—"}</option>`).join("")}</select></label>
      </div>
      ${editing?`<label class="check"><input type="checkbox" id="activo" ${f.activo!==false?"checked":""}> Activo (desmárcalo para pausarlo)</label>
        <div class="small" style="margin-bottom:12px">Los cambios se aplican a partir de ahora; los meses ya apuntados no cambian.</div>`:`<div class="small" style="margin-bottom:12px">Se apuntará este mes (si el día ya ha llegado) y todos los siguientes.</div>`}
      <div class="btns">${editing?`<button type="button" class="btn danger" id="del">Eliminar</button>`:`<button type="button" class="btn" id="cancel">Cancelar</button>`}<button class="btn primary">Guardar</button></div>
      <div class="note" id="err"></div></form>`);
  wireTipoCats(st);
  sheet.querySelector("#cancel")?.addEventListener("click",closeSheet);
  const del=sheet.querySelector("#del");if(del)confirmBtn(del,()=>{delFijo(f.id);closeSheet();toast("Fijo eliminado. Los meses ya apuntados se mantienen.")});
  sheet.querySelector("#f").onsubmit=e=>{e.preventDefault();
    const v=num(sheet.querySelector("#imp").value);if(!(v>0)){sheet.querySelector("#err").textContent="Escribe un importe válido";return}
    const dia=Math.max(1,Math.min(31,parseInt(sheet.querySelector("#dia").value)||1));
    const hoyK=monthKey(new Date());
    const nf={...f,id:f.id||uid("x"),tipo:st.tipo,cat:st.cat,importe:money2(v),nota:sheet.querySelector("#nota").value.trim().slice(0,80),dia,metodo:sheet.querySelector("#metodo").value,
      activo:editing?sheet.querySelector("#activo").checked:true,omitidos:f.omitidos||[]};
    // al editar o reactivar, no rellenar meses pasados que no se generaron
    if(!editing||!f.desde||(f.activo===false&&nf.activo))nf.desde=hoyK;
    saveFijo(nf);closeSheet();
  };
}

function openMeta(m){
  const editing=!!m;m=m||{i:"target",ahorrado:0};
  let ic=iconOf(m);
  openSheet(`<h2>${editing?esc(m.nombre):"Nueva meta de ahorro"}</h2>
    ${editing?`<div class="card" style="background:var(--soft);border:0;box-shadow:none">
      <div class="row"><span class="small">Llevas ahorrado</span><span class="small">Objetivo ${fmt(m.objetivo)}</span></div>
      <div class="big">${fmt(m.ahorrado||0)}</div>
      <div class="bar"><div style="width:${Math.min(100,(m.ahorrado||0)/(m.objetivo||1)*100)}%"></div></div>
      ${(m.ahorrado||0)>=m.objetivo?`<div style="font-weight:700;color:var(--pos);display:flex;gap:6px;align-items:center">${svg("check")}Meta conseguida</div>`:`<div class="small">Te faltan ${fmt(m.objetivo-(m.ahorrado||0))}${m.fecha?(()=>{const now=new Date(),end=new Date(m.fecha+"T12:00");const months=(end.getFullYear()-now.getFullYear())*12+end.getMonth()-now.getMonth();return months>0?` · unos ${fmt((m.objetivo-(m.ahorrado||0))/months)} al mes`:""})():""}</div>`}
      <div class="two" style="margin-top:12px"><input class="input" id="aporte" inputmode="decimal" placeholder="Cantidad" style="margin:0"><div class="btns" style="margin:0"><button class="btn sm primary" id="mas" style="flex:1">+ Añadir</button><button class="btn sm" id="menos" style="flex:1">− Sacar</button></div></div>
    </div>`:""}
    <form id="f">
      <label class="field small">Nombre<input id="nombre" placeholder="Ej. Vacaciones en verano" value="${esc(m.nombre||"")}" maxlength="50"></label>
      <div class="small" style="font-weight:600">Icono</div><div class="pick">${META_ICONS.map(o=>`<button type="button" class="${o===ic?"on":""}" data-e="${o}" aria-label="${o}">${svg(o)}</button>`).join("")}</div>
      <div class="two">
        <label class="field small">Objetivo (€)<input id="obj" inputmode="decimal" value="${m.objetivo?String(m.objetivo).replace(".",","):""}"></label>
        <label class="field small">Para cuándo (opcional)<input id="fecha" type="date" value="${m.fecha||""}"></label>
      </div>
      ${editing?"":`<label class="field small">Ya tengo ahorrado (€)<input id="ya" inputmode="decimal" placeholder="0"></label>`}
      <div class="btns">${editing?`<button type="button" class="btn danger" id="del">Borrar</button>`:`<button type="button" class="btn" id="cancel">Cancelar</button>`}<button class="btn primary">Guardar</button></div>
      <div class="note" id="err"></div></form>`);
  sheet.querySelectorAll(".pick button").forEach(b=>b.onclick=()=>{ic=b.dataset.e;sheet.querySelectorAll(".pick button").forEach(x=>x.classList.toggle("on",x===b))});
  sheet.querySelector("#cancel")?.addEventListener("click",closeSheet);
  const del=sheet.querySelector("#del");if(del)confirmBtn(del,()=>{delMeta(m.id);closeSheet()});
  const mover=s=>{const v=num(sheet.querySelector("#aporte").value);if(!(v>0)){sheet.querySelector("#aporte").focus();return}
    const nm={...m,ahorrado:Math.max(0,money2((m.ahorrado||0)+s*v))};saveMeta(nm);openMeta(nm);toast(s>0?`Añadido ${fmt(v)} a ${m.nombre}`:`Sacado ${fmt(v)} de ${m.nombre}`)};
  sheet.querySelector("#mas")?.addEventListener("click",()=>mover(1));
  sheet.querySelector("#menos")?.addEventListener("click",()=>mover(-1));
  sheet.querySelector("#f").onsubmit=e=>{e.preventDefault();
    const nombre=sheet.querySelector("#nombre").value.trim(),obj=num(sheet.querySelector("#obj").value);
    if(!nombre){sheet.querySelector("#err").textContent="Ponle un nombre";return}
    if(!(obj>0)){sheet.querySelector("#err").textContent="Escribe un objetivo válido";return}
    const ya=editing?(m.ahorrado||0):(num(sheet.querySelector("#ya").value)||0);
    saveMeta({...m,id:m.id||uid("m"),nombre:nombre.slice(0,50),i:ic,objetivo:money2(obj),ahorrado:money2(Math.max(0,ya)),fecha:sheet.querySelector("#fecha").value||"",creado:m.creado||Date.now()});closeSheet()};
}

function openBudget(){
  openSheet(`<h2>Presupuesto mensual</h2>
    <form id="f"><input class="amount-in" id="p" inputmode="decimal" placeholder="Ej. 1.200 €" value="${state.aj.presupuesto?String(state.aj.presupuesto).replace(".",","):""}">
    <p class="small">Lo máximo que quieres gastar cada mes. Déjalo vacío para no usar presupuesto.</p>
    <div class="btns"><button type="button" class="btn" id="c">Cancelar</button><button class="btn primary">Guardar</button></div></form>`);
  sheet.querySelector("#c").onclick=closeSheet;
  sheet.querySelector("#f").onsubmit=e=>{e.preventDefault();state.aj.presupuesto=Math.max(0,num(sheet.querySelector("#p").value)||0);saveAj();closeSheet()};
}

function openLimits(){
  openSheet(`<h2>Límites por categoría</h2><p class="small" style="margin-top:-6px">Opcional. Se marca en rojo cuando te pasas.</p>
    <form id="f">${catsG().map(c=>`<label class="field small" style="display:grid;grid-template-columns:38px 1fr 110px;align-items:center;gap:10px;margin-bottom:8px">
      ${icoHTML(c)}<span style="color:var(--ink);font-size:14px">${esc(c.n)}</span>
      <input data-c="${esc(c.id)}" inputmode="decimal" placeholder="—" value="${state.aj.porCat[c.id]?String(state.aj.porCat[c.id]).replace(".",","):""}" style="margin:0"></label>`).join("")}
    <div class="btns"><button type="button" class="btn" id="c">Cancelar</button><button class="btn primary">Guardar</button></div></form>`);
  sheet.querySelector("#c").onclick=closeSheet;
  sheet.querySelector("#f").onsubmit=e=>{e.preventDefault();const pc={};
    sheet.querySelectorAll("input[data-c]").forEach(i=>{const v=num(i.value);if(v>0)pc[i.dataset.c]=v});state.aj.porCat=pc;saveAj();closeSheet()};
}

function openCats(tipo="gasto"){
  const list=catsFor(tipo);
  openSheet(`<h2>Categorías</h2>${tipoSeg(tipo)}
    <div>${list.map(c=>`<div class="menu-item" data-cid="${esc(c.id)}">${icoHTML(c)}<div style="font-weight:600">${esc(c.n)}</div><span class="chev">${svg("chevR")}</span></div>`).join("")}</div>
    <div class="btns" style="margin-top:12px"><button class="btn" id="c">Cerrar</button><button class="btn primary" id="nueva">Nueva categoría</button></div>`);
  sheet.querySelectorAll("#tipoSeg button").forEach(b=>b.onclick=()=>openCats(b.dataset.t));
  sheet.querySelectorAll("[data-cid]").forEach(b=>b.onclick=()=>openCat(tipo,list.find(c=>c.id===b.dataset.cid)));
  sheet.querySelector("#c").onclick=closeSheet;
  sheet.querySelector("#nueva").onclick=()=>openCat(tipo);
}
function openCat(tipo,c){
  const editing=!!c;c=c||{i:tipo==="ingreso"?"coins":"box",c:COLORS[Math.floor(Math.random()*COLORS.length)],n:""};
  let e=iconOf(c),col=c.c;
  const used=Object.values(state.mov).filter(m=>m.cat===c.id).length;
  openSheet(`<h2>${editing?"Editar categoría":"Nueva categoría de "+(tipo==="ingreso"?"ingresos":"gastos")}</h2>
    <form id="f"><label class="field small">Nombre<input id="n" value="${esc(c.n)}" maxlength="24" placeholder="Ej. Mascotas"></label>
    <div class="small" style="font-weight:600">Icono</div><div class="pick">${CAT_ICONS.map(x=>`<button type="button" data-e="${x}" class="${x===e?"on":""}" aria-label="${x}">${svg(x)}</button>`).join("")}</div>
    <div class="small" style="font-weight:600">Color</div><div class="pick">${COLORS.map(x=>`<button type="button" data-col="${x}" class="sw ${x===col?"on":""}" style="background:${x}" aria-label="Color ${x}"></button>`).join("")}</div>
    ${editing&&used?`<div class="small" style="margin-bottom:10px">Tiene ${used} movimiento${used===1?"":"s"}. Si la borras, pasarán a «${tipo==="ingreso"?"Otros ingresos":"Otros"}».</div>`:""}
    <div class="btns">${editing?`<button type="button" class="btn danger" id="del">Borrar</button>`:""}<button type="button" class="btn" id="back">Volver</button><button class="btn primary">Guardar</button></div>
    <div class="note" id="err"></div></form>`);
  sheet.querySelectorAll("[data-e]").forEach(b=>b.onclick=()=>{e=b.dataset.e;sheet.querySelectorAll("[data-e]").forEach(x=>x.classList.toggle("on",x===b))});
  sheet.querySelectorAll("[data-col]").forEach(b=>b.onclick=()=>{col=b.dataset.col;sheet.querySelectorAll("[data-col]").forEach(x=>x.classList.toggle("on",x===b))});
  sheet.querySelector("#back").onclick=()=>openCats(tipo);
  const key=tipo==="ingreso"?"catsIng":"cats";
  const del=sheet.querySelector("#del");
  if(del)confirmBtn(del,()=>{
    const list=catsFor(tipo).filter(x=>x.id!==c.id);
    if(!list.length){sheet.querySelector("#err").textContent="Tiene que quedar al menos una categoría";return}
    let fallback=list.find(x=>x.id===(tipo==="ingreso"?"i_otros":"otros"));
    if(!fallback){fallback=tipo==="ingreso"?DEF_ING[3]:DEF_GASTO[11];list.push(fallback)}
    state.aj[key]=list;
    if(state.aj.porCat[c.id]){delete state.aj.porCat[c.id]}
    saveAj();
    Object.values(state.mov).filter(m=>m.cat===c.id).forEach(m=>{m.cat=fallback.id;store&&store.save("mov",m)});
    Object.values(state.fijos).filter(f=>f.cat===c.id).forEach(f=>{f.cat=fallback.id;store&&store.save("fijos",f)});
    render();openCats(tipo);
  });
  sheet.querySelector("#f").onsubmit=ev=>{ev.preventDefault();
    const n=sheet.querySelector("#n").value.trim();if(!n){sheet.querySelector("#err").textContent="Ponle un nombre";return}
    const list=catsFor(tipo).map(x=>({...x}));
    if(editing){const i=list.findIndex(x=>x.id===c.id);list[i]={...list[i],n,i:e,c:col}}
    else list.push({id:uid(tipo==="ingreso"?"ci":"cg"),n,i:e,c:col});
    state.aj[key]=list;saveAj();openCats(tipo);
  };
}

function openExport(){
  const scope={mes:movsMes(),todo:Object.values(state.mov).sort((a,b)=>b.fecha.localeCompare(a.fecha))};
  const build=arr=>{const rows=[["Fecha","Tipo","Concepto","Categoría","Pago","Importe"],...arr.slice().reverse().map(g=>[g.fecha,tipoOf(g)==="ingreso"?"Ingreso":"Gasto",g.nota||"",catOf(g.cat,tipoOf(g)).n,g.metodo||"",(tipoOf(g)==="ingreso"?"":"-")+String(g.importe).replace(".",",")])];
    return rows.map(r=>r.map(x=>/[;"\n]/.test(x)?`"${String(x).replace(/"/g,'""')}"`:x).join(";")).join("\n")};
  let which="mes";
  const draw=()=>{const csv=build(scope[which]);
    openSheet(`<h2>Exportar a Excel</h2>
      <div class="seg"><button data-w="mes" class="${which==="mes"?"on":""}">${esc(cur.toLocaleDateString("es-ES",{month:"long",year:"numeric"}))}</button><button data-w="todo" class="${which==="todo"?"on":""}">Todo</button></div>
      <textarea class="csv" readonly>${esc(csv)}</textarea>
      <p class="small">Pulsa Copiar y pégalo en Excel, Google Sheets o Numbers. Usa punto y coma como separador.</p>
      <div class="btns"><button class="btn" id="c">Cerrar</button><button class="btn primary" id="cp">Copiar</button></div>`);
    sheet.querySelectorAll("[data-w]").forEach(b=>b.onclick=()=>{which=b.dataset.w;draw()});
    sheet.querySelector("#c").onclick=closeSheet;
    sheet.querySelector("#cp").onclick=async function(){try{await navigator.clipboard.writeText(csv);this.textContent="Copiado"}catch(e){const t=sheet.querySelector("textarea");t.focus();t.select();this.textContent="Selecciona y copia"}};
  };draw();
}

/* ================= Arranque ================= */
document.getElementById("add").onclick=()=>openMov();
document.getElementById("prev").onclick=()=>{cur=new Date(cur.getFullYear(),cur.getMonth()-1,1);render()};
document.getElementById("next").onclick=()=>{cur=new Date(cur.getFullYear(),cur.getMonth()+1,1);render()};
document.querySelectorAll("nav.tabbar button").forEach(b=>b.onclick=()=>setView(b.dataset.v));
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeSheet()});
document.addEventListener("visibilitychange",()=>{if(!document.hidden){generarFijos();render()}});

document.getElementById("bell").onclick=openAlerts;
try{if(window.firebase&&firebase.messaging&&firebase.apps.length===0){}}catch(e){}
document.getElementById("eye").onclick=toggleHide;applyHide();
window.addEventListener("afterprint",()=>document.body.classList.remove("printing"));
initStore();
if("serviceWorker" in navigator&&location.protocol==="https:")navigator.serviceWorker.register("sw.js").catch(()=>{});
