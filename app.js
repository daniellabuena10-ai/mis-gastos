
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
function resetState(){state={mov:{},fijos:{},metas:{},aj:{presupuesto:0,porCat:{},cats:null,catsIng:null,watchlist:null}};loaded={mov:false,fijos:false};cur=new Date();cur.setDate(1);view="inicio";invMounted=false;const iw=document.getElementById("invWidgets");if(iw)iw.innerHTML=""}
async function initStore(){
  if(!window.firebase||!window.FIREBASE_CONFIG||!FIREBASE_CONFIG.apiKey){document.getElementById("splash").textContent="Falta configurar la app.";return}
  firebase.initializeApp(FIREBASE_CONFIG);
  const auth=firebase.auth(),fdb=firebase.firestore();auth.languageCode="es";
  try{await fdb.enablePersistence({synchronizeTabs:true})}catch(e){}
  window._auth=auth;
  auth.onAuthStateChanged(u=>{
    document.getElementById("splash")?.remove();
    unsubs.forEach(f=>f());unsubs=[];resetState();me=u;
    if(!u){store=null;showAuth();return}
    hideAuth();startData(fdb,u);setView("inicio");
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
        if(k in loaded&&!loaded[k]){loaded[k]=true;generarFijos()}
      }
      render();
    },()=>{clearTimeout(timer);showBanner("No se pudieron cargar tus datos. Comprueba tu conexión.")}));
  }
  unsubs.push(ajRef.onSnapshot(s=>{if(s.exists){const d=s.data();state.aj={presupuesto:d.presupuesto||0,porCat:{...(d.porCat||{})},cats:d.cats||null,catsIng:d.catsIng||null,watchlist:Array.isArray(d.watchlist)?d.watchlist:null};render();if(view==="inversion")mountWatchlist()}},()=>{}));
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
      for(const k of ["gastos","fijos","metas","config"]){const s=await base.collection(k).get();for(const d of s.docs)await d.ref.delete()}
      unsubs.forEach(f=>f());unsubs=[];
      await u.delete();
      closeSheet();toast("Tu cuenta y tus datos se han borrado");
    }catch(e){this.disabled=false;this.textContent="Borrar definitivamente";
      err.textContent=(e.code==="auth/wrong-password"||e.code==="auth/invalid-credential"||e.code==="auth/invalid-login-credentials")?"Contraseña incorrecta.":"No se ha podido borrar. Revisa tu conexión e inténtalo de nuevo."}
  };
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
function render(){
  const ml=cur.toLocaleDateString("es-ES",{month:"long",year:"numeric"});document.getElementById("month").textContent=ml.charAt(0).toUpperCase()+ml.slice(1);
  document.getElementById("monthnav").hidden=!(view==="inicio"||view==="analisis");
  document.getElementById("title").textContent={inicio:"Resumen",analisis:"Análisis",buscar:"Movimientos",inversion:"Inversión",mas:"Ajustes"}[view];
  document.getElementById("add").hidden=view==="mas"||view==="inversion";
  document.getElementById("invWidgets").hidden=view!=="inversion";
  if(view==="inversion")mountInversion();
  const el=document.getElementById("view");
  const fid=document.activeElement&&document.activeElement.id;
  const keepFocus=(view==="buscar"&&fid==="qtext")||(view==="inversion"&&/^s(Ini|Mes|Anos|Rent)$/.test(fid||""));
  const selStart=keepFocus?document.activeElement.selectionStart:0;
  el.innerHTML=({inicio:vInicio,analisis:vAnalisis,buscar:vBuscar,inversion:vInversion,mas:vMas})[view]();
  wire(el);
  if(keepFocus){const i=document.getElementById(fid);i.focus();try{i.setSelectionRange(selStart,selStart)}catch(e){}}
}

function itemHTML(g,showDate){
  const t=tipoOf(g),c=catOf(g.cat,t);
  const d=showDate?new Date(g.fecha+"T12:00").toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"2-digit"})+" · ":"";
  return `<div class="item" data-mov="${esc(g.id)}">
    ${icoHTML(c)}
    <div style="min-width:0"><div class="t">${esc(g.nota||c.n)}</div><div class="small">${d}${esc(c.n)}${g.metodo?" · "+esc(g.metodo):""}${g.fijo?`<span class="tag">${svg("repeat")}Fijo</span>`:""}</div></div>
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
  return `<section class="hero">
    <div class="row"><span class="lbl">Balance de ${cur.toLocaleDateString("es-ES",{month:"long"})}</span><button class="link" data-act="presupuesto">${pres?"Presupuesto":"Fijar presupuesto"}</button></div>
    <div class="big">${bal<0?"−":bal>0?"+":""}${amtHTML(Math.abs(bal))}</div>
    ${insight}
    <div class="flows">
      <div class="flow"><div class="dot" style="background:rgba(63,195,161,.18);color:#7fe0c4">${svg("arrowDown")}</div><div><div class="lbl">Ingresos</div><div class="v">${fmt0(I)}</div></div></div>
      <div class="flow"><div class="dot" style="background:rgba(249,112,102,.16);color:#fda29b">${svg("arrowUp")}</div><div><div class="lbl">Gastos</div><div class="v">${fmt0(G)}</div></div></div>
    </div>
    ${budget}
  </section>
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

  return `${catsCard}
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
const isDark=()=>{const t=document.documentElement.dataset.theme;return t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches};
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
    plotLineColorGrowing:"#0d7a64",plotLineColorFalling:"#b42318",gridLineColor:"rgba(102,112,133,0.12)",scaleFontColor:"#667085",
    belowLineFillColorGrowing:"rgba(13,122,100,0.12)",belowLineFillColorFalling:"rgba(180,35,24,0.10)",belowLineFillColorGrowingBottom:"rgba(13,122,100,0)",belowLineFillColorFallingBottom:"rgba(180,35,24,0)",symbolActiveColor:"rgba(13,122,100,0.10)",
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
    tvWidget(row,"mini-symbol-overview",{symbol:sym,width:"100%",height:170,dateRange:"12M",autosize:false,chartOnly:false,noTimeScale:true,trendLineColor:"rgba(13,122,100,1)",underLineColor:"rgba(13,122,100,0.12)",underLineBottomColor:"rgba(13,122,100,0)"});
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
  wireSim(el);
  el.querySelectorAll("[data-mov]").forEach(i=>i.onclick=()=>openMov(state.mov[i.dataset.mov]));
  el.querySelectorAll("[data-fijo]").forEach(i=>i.onclick=()=>openFijo(state.fijos[i.dataset.fijo]));
  el.querySelectorAll("[data-meta]").forEach(i=>i.onclick=()=>openMeta(state.metas[i.dataset.meta]));
  el.querySelectorAll("[data-filtro]").forEach(b=>b.onclick=()=>{filtroInicio=b.dataset.filtro;render()});
  el.querySelectorAll("[data-qtipo]").forEach(b=>b.onclick=()=>{q.tipo=b.dataset.qtipo;q.cat="";render()});
  el.querySelectorAll("[data-qcat]").forEach(b=>b.onclick=()=>{q.cat=b.dataset.qcat;render()});
  el.querySelectorAll("[data-buscarcat]").forEach(b=>b.onclick=()=>{q={texto:"",cat:b.dataset.buscarcat,tipo:"gasto"};setView("buscar")});
  const qt=el.querySelector("#qtext");if(qt)qt.oninput=()=>{q.texto=qt.value;render()};
  el.querySelectorAll("[data-act]").forEach(b=>b.onclick=()=>({presupuesto:openBudget,limites:openLimits,categorias:openCats,exportar:openExport,importar:openImport,nombre:openNombre,clave:sendReset,privacidad:()=>{location.href="privacidad.html"},borrar:openBorrar,salir:()=>{if(confirmSalir()){_auth.signOut()}},
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

function openMov(g){
  const editing=!!g;
  g=g||{tipo:"gasto",cat:catsG()[0].id,fecha:monthKey(cur)===monthKey(new Date())?todayStr():`${monthKey(cur)}-01`};
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
      <div class="btns">
        ${editing?`<button type="button" class="btn danger" id="del">Borrar</button>`:`<button type="button" class="btn" id="cancel">Cancelar</button>`}
        <button class="btn primary" type="submit">Guardar</button>
      </div><div class="note" id="err"></div>
    </form>`);
  wireTipoCats(st);
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
      saveMov(m);saveFijo(f);
    }else{
      saveMov({...g,...base,id:g.id||uid("g"),fecha,creado:g.creado||Date.now()});
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

initStore();
if("serviceWorker" in navigator&&location.protocol==="https:")navigator.serviceWorker.register("sw.js").catch(()=>{});
