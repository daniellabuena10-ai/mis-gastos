// Envía las notificaciones push diarias de Ahorra+.
// Se ejecuta con GitHub Actions (ver .github/workflows/avisos.yml).
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
if (!sa.project_id) { console.error("Falta el secreto FIREBASE_SERVICE_ACCOUNT"); process.exit(1); }
initializeApp({ credential: cert(sa) });
const db = getFirestore();
const fcm = getMessaging();
const APP_URL = process.env.APP_URL || "https://daniellabuena10-ai.github.io/mis-gastos/";
const DRY = process.env.DRY_RUN === "1";

// Fecha de hoy en Madrid
const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" })
  .formatToParts(new Date()).map(p => [p.type, p.value]));
const Y = +parts.year, M = +parts.month, D = +parts.day, WD = parts.weekday; // Mon, Tue...
const pad = n => String(n).padStart(2, "0");
const mk = `${Y}-${pad(M)}`;
const dim = new Date(Y, M, 0).getDate();
const tomorrow = D + 1 <= dim ? D + 1 : null; // solo dentro del mes
const eur = n => (Math.round(n * 100) / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
const sum = a => a.reduce((s, m) => s + (+m.importe || 0), 0);

const pushDocs = (await db.collectionGroup("config").get()).docs.filter(d => d.id === "push");
console.log(`Usuarios con notificaciones: ${pushDocs.length}`);
let sent = 0;

for (const pd of pushDocs) {
  const user = pd.ref.parent.parent; if (!user) continue;
  const p = pd.data(); const tokens = (p.tokens || []).filter(Boolean); if (!tokens.length) continue;
  const prefs = { fijos: true, presupuesto: true, semanal: true, ...(p.prefs || {}) };
  const flags = p.sent || {};
  const msgs = []; const newFlags = {};

  const [ajS, fijosS, movS] = await Promise.all([
    user.collection("config").doc("ajustes").get(),
    user.collection("fijos").get(),
    user.collection("gastos").where("fecha", ">=", `${Y}-${pad(M)}-01`).get(),
  ]);
  const aj = ajS.exists ? ajS.data() : {};
  const movs = movS.docs.map(d => ({ id: d.id, ...d.data() })).filter(m => (m.fecha || "").startsWith(mk));
  const gastos = movs.filter(m => m.tipo !== "ingreso");
  const G = sum(gastos);

  // 1) Pagos y cobros de mañana
  if (prefs.fijos && tomorrow) {
    for (const fd of fijosS.docs) {
      const f = fd.data(); if (f.activo === false) continue;
      const dia = Math.min(+f.dia || 1, dim); if (dia !== tomorrow) continue;
      if ((f.omitidos || []).includes(mk)) continue;
      const nombre = f.nota || (f.tipo === "ingreso" ? "un ingreso" : "un pago");
      msgs.push(f.tipo === "ingreso"
        ? { title: "Mañana cobras 💶", body: `${nombre}: ${eur(f.importe)}` }
        : { title: "Pago mañana", body: `${nombre}: ${eur(f.importe)}. Asegúrate de tener saldo.` });
    }
  }
  // 2) Presupuesto
  const pres = +aj.presupuesto || 0;
  if (prefs.presupuesto && pres > 0) {
    const r = G / pres;
    if (r >= 1 && !flags[`pres100-${mk}`]) { msgs.push({ title: "Has superado tu presupuesto", body: `Llevas ${eur(G)} de ${eur(pres)} este mes.` }); newFlags[`pres100-${mk}`] = true; }
    else if (r >= 0.8 && r < 1 && !flags[`pres80-${mk}`]) { msgs.push({ title: `Has usado el ${Math.round(r * 100)} % del presupuesto`, body: `Te quedan ${eur(pres - G)} hasta fin de mes.` }); newFlags[`pres80-${mk}`] = true; }
  }
  // 3) Límites por categoría
  if (prefs.presupuesto) {
    const cats = [...(aj.cats || [])];
    for (const [cid, lim] of Object.entries(aj.porCat || {})) {
      if (!(lim > 0)) continue;
      const v = sum(gastos.filter(m => m.cat === cid)); const name = (cats.find(c => c.id === cid) || {}).n || cid.charAt(0).toUpperCase() + cid.slice(1);
      if (v > lim && !flags[`cat-${cid}-${mk}`]) { msgs.push({ title: `${name}: límite superado`, body: `${eur(v)} de ${eur(lim)} este mes.` }); newFlags[`cat-${cid}-${mk}`] = true; }
    }
  }
  // 4) Resumen semanal (lunes)
  if (prefs.semanal && WD === "Mon" && !flags[`sem-${Y}-${pad(M)}-${pad(D)}`]) {
    const from = new Date(Date.UTC(Y, M - 1, D - 7)), to = new Date(Date.UTC(Y, M - 1, D - 1));
    const f0 = from.toISOString().slice(0, 10), f1 = to.toISOString().slice(0, 10);
    const wk = (await user.collection("gastos").where("fecha", ">=", f0).where("fecha", "<=", f1).get()).docs.map(d => d.data()).filter(m => m.tipo !== "ingreso");
    if (wk.length) { msgs.push({ title: "Tu semana en Ahorra+", body: `Gastaste ${eur(sum(wk))} en ${wk.length} movimiento${wk.length === 1 ? "" : "s"} la semana pasada.` }); }
    newFlags[`sem-${Y}-${pad(M)}-${pad(D)}`] = true;
  }

  if (!msgs.length) { if (Object.keys(newFlags).length) await pd.ref.set({ sent: { ...flags, ...newFlags } }, { merge: true }); continue; }
  // Máximo 3 avisos por persona y día
  const bad = new Set();
  for (const [i, n] of msgs.slice(0, 3).entries()) {
    if (DRY) { console.log(user.id, n); continue; }
    const res = await fcm.sendEachForMulticast({ tokens, webpush: { notification: { title: n.title, body: n.body, icon: APP_URL + "icon-192.png" }, fcmOptions: { link: APP_URL } }, data: { tag: `ahorra-${i}`, url: APP_URL } });
    res.responses.forEach((r, k) => { if (!r.success && /registration-token-not-registered|invalid-argument|invalid-registration-token/.test(r.error?.code || "")) bad.add(tokens[k]); });
    sent += res.successCount;
  }
  const upd = { sent: { ...flags, ...newFlags }, lastRun: Date.now() };
  if (bad.size) upd.tokens = FieldValue.arrayRemove(...bad);
  if (!DRY) await pd.ref.set(upd, { merge: true });
}
console.log(`Notificaciones enviadas: ${sent}`);
