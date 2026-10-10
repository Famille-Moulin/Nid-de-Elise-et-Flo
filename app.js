import { store } from './store.js';

/* ───────────── Utilitaires ───────────── */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const parseNum = (s) => { const n = parseFloat(String(s ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
const fmtNum = (n) => String(n).replace('.', ',');
const MIN = 60000, HOUR = 3600000, DAY = 86400000;

const pad = (n) => String(n).padStart(2, '0');
const startOfDay = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const addDays = (ms, n) => { const d = new Date(ms); d.setDate(d.getDate() + n); return d.getTime(); };
const dayKey = (ms = Date.now()) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const toInput = (ms) => { const d = new Date(ms); return `${dayKey(ms)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fromInput = (s) => (s ? new Date(s).getTime() : Date.now());
const fmtTime = (ms) => new Date(ms).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const fmtDate = (ms) => new Date(ms).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
function fmtDay(ms) {
  const k = dayKey(ms);
  if (k === dayKey()) return "Aujourd'hui";
  if (k === dayKey(addDays(Date.now(), -1))) return 'Hier';
  if (k === dayKey(addDays(Date.now(), 1))) return 'Demain';
  return fmtDate(ms);
}
function dur(ms) {
  const m = Math.max(0, Math.round(ms / MIN));
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${pad(m % 60)}`;
}
function clock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return (h ? `${h}:${pad(m)}` : `${m}`) + ':' + pad(x);
}

/* ───────────── Réglages ───────────── */
const DEFAULTS = { babyName: '', kidName: '', dueDate: '', birthDate: '', feedHours: 3, goalStars: 20, reward: 'Une sortie au parc 🎈', p1: 'Papa', p2: 'Maman' };
const S = () => ({ ...DEFAULTS, ...(store.get('settings', 'main') || {}) });
const babyName = () => S().babyName || 'Bébé';
const kidName = () => S().kidName || 'Grand frère';
const me = () => localStorage.getItem('whoami') || '';

/* ───────────── Bébé ───────────── */
const TYPES = {
  tetee: { label: 'Tétée', icon: '🤱' },
  biberon: { label: 'Biberon', icon: '🍼' },
  couche: { label: 'Couche', icon: '🧷' },
  sommeil: { label: 'Dodo', icon: '🌙' },
  bain: { label: 'Bain', icon: '🛁' },
  sante: { label: 'Santé', icon: '🩺' },
  mesure: { label: 'Mesure', icon: '📏' },
  note: { label: 'Note', icon: '📝' },
};
const TIMED = new Set(['tetee', 'sommeil']);
const SIDES = { G: 'Gauche', D: 'Droit', GD: 'Les deux' };
const DIAPERS = { pipi: '💧 Pipi', caca: '💩 Caca', both: '💧💩 Les deux' };
const HEALTH = { 'Vitamine D': 'Vitamine D', 'Température': 'Température', 'Médicament': 'Médicament', 'Vaccin': 'Vaccin', 'Autre': 'Autre' };

const entries = () => store.list('baby').sort((a, b) => b.t - a.t);
const running = () => entries().filter((e) => TIMED.has(e.type) && !e.end);
const lastOf = (types) => entries().find((e) => types.includes(e.type));

function summary(e) {
  switch (e.type) {
    case 'tetee': return [SIDES[e.side], e.end ? dur(e.end - e.t) : ''].filter(Boolean).join(', ');
    case 'sommeil': return e.end ? dur(e.end - e.t) : '';
    case 'biberon': return [e.ml ? `${e.ml} ml` : '', e.milk === 'maternel' ? 'lait maternel' : e.milk === 'infantile' ? 'lait infantile' : ''].filter(Boolean).join(', ');
    case 'couche': return DIAPERS[e.kind] || '';
    case 'sante': return [e.kind, e.value].filter(Boolean).join(' : ');
    case 'mesure': return [e.weight ? `${fmtNum(e.weight)} kg` : '', e.height ? `${fmtNum(e.height)} cm` : '', e.head ? `PC ${fmtNum(e.head)} cm` : ''].filter(Boolean).join(', ');
    default: return '';
  }
}

function dayStats(day0) {
  const day1 = addDays(day0, 1);
  const list = entries().filter((e) => e.t >= day0 && e.t < day1);
  const of = (t) => list.filter((e) => e.type === t);
  return {
    list,
    meals: of('tetee').length + of('biberon').length,
    ml: of('biberon').reduce((s, e) => s + (+e.ml || 0), 0),
    pipi: of('couche').filter((e) => e.kind !== 'caca').length,
    caca: of('couche').filter((e) => e.kind !== 'pipi').length,
    sleep: of('sommeil').reduce((s, e) => s + ((e.end || Date.now()) - e.t), 0),
  };
}

function babyAge(birth) {
  const d = Math.floor((Date.now() - new Date(birth).getTime()) / DAY);
  if (d < 1) return 'née aujourd’hui';
  if (d < 14) return `${d} jour${d > 1 ? 's' : ''}`;
  if (d < 90) return `${Math.floor(d / 7)} semaines${d % 7 ? ` et ${d % 7} j` : ''}`;
  const b = new Date(birth), n = new Date();
  let m = (n.getFullYear() - b.getFullYear()) * 12 + n.getMonth() - b.getMonth();
  if (n.getDate() < b.getDate()) m--;
  return `${m} mois`;
}

/* ───────────── Grand frère ───────────── */
const kidStars = () => store.list('kidlog').length + store.list('kidstars').reduce((s, x) => s + (+x.delta || 0), 0);
const routines = () => store.list('routines').sort((a, b) => (a.order || 0) - (b.order || 0));
const routineDone = (rid, day = dayKey()) => !!store.get('kidlog', `${day}_${rid}`);

/* ───────────── Données de départ ───────────── */
const VALISE = [
  ['Maman', 'Chemises de nuit ou tenues confortables (×3)'], ['Maman', "Soutiens-gorge d'allaitement"], ['Maman', "Coussinets d'allaitement"],
  ['Maman', 'Serviettes maternité'], ['Maman', 'Culottes jetables ou en filet'], ['Maman', 'Trousse de toilette'],
  ['Maman', 'Chaussons et chaussettes chaudes'], ['Maman', 'Chargeur de téléphone (câble long)'], ['Maman', "Encas et bouteille d'eau"],
  ['Bébé', 'Bodies (×6)'], ['Bébé', 'Pyjamas (×6)'], ['Bébé', 'Bonnet et chaussettes'], ['Bébé', 'Gigoteuse'],
  ['Bébé', 'Langes (×3)'], ['Bébé', 'Tenue de sortie'], ['Bébé', 'Siège auto installé dans la voiture'],
  ['Bébé', 'Couches nouveau-né (vérifier si la maternité les fournit)'],
  ['Papiers', 'Carte Vitale et carte de mutuelle'], ['Papiers', "Pièces d'identité"], ['Papiers', 'Dossier de grossesse et échographies'],
  ['Papiers', 'Carte de groupe sanguin'], ['Papiers', 'Livret de famille ou reconnaissance anticipée'],
  ['Grand frère', 'Organiser sa garde pour le jour J (et la nuit)'], ['Grand frère', 'Petit cadeau « de la part de sa sœur »'],
  ['Grand frère', 'Son sac prêt : doudou, pyjama, brosse à dents'],
];
const ROUTINES = [
  ['matin', '🪥', 'Brosser les dents'], ['matin', '👕', "S'habiller tout seul"], ['matin', '🥣', 'Petit-déjeuner'], ['matin', '👟', 'Mettre ses chaussures'],
  ['soir', '🧸', 'Ranger ses jouets'], ['soir', '🛁', 'Le bain'], ['soir', '🪥', 'Brosser les dents'], ['soir', '📖', "L'histoire du soir"],
  ['soir', '💛', 'Un bisou à sa petite sœur'],
];
let seeded = false;
function maybeSeed() {
  if (seeded || !store.loaded || store.get('settings', 'main')) return;
  if (store.mode === 'cloud' && !store.user) return;
  seeded = true;
  const u = { 'settings/main': { ...DEFAULTS } };
  VALISE.forEach(([cat, text], i) => { u[`valise/v${pad(i)}`] = { cat, text, done: false, created: i }; });
  ROUTINES.forEach(([period, emoji, label], i) => { u[`routines/r${pad(i)}`] = { period, emoji, label, order: i }; });
  store.patch(u);
}

/* ───────────── État de l'interface ───────────── */
let tab = localStorage.getItem('tab') || 'home';
let famSeg = localStorage.getItem('famSeg') || 'courses';
let babyDay = startOfDay(Date.now());
let kidEdit = false;
let settingsDirty = false;
let whoAsked = false;

/* ───────────── Briques HTML ───────────── */
const field = (label, inner, hint = '') => `<div class="field"><div class="field-label">${label}${hint ? ` <span class="hint">${hint}</span>` : ''}</div>${inner}</div>`;
const chips = (name, opts, sel) => `<div class="chips">${Object.entries(opts).map(([v, l]) =>
  `<label class="chip"><input type="radio" name="${name}" value="${esc(v)}" ${v === sel ? 'checked' : ''}><span>${esc(l)}</span></label>`).join('')}</div>`;
const bar = (pct, cls = '') => `<div class="bar ${cls}"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>`;

function timersBanner() {
  return running().map((e) => `
    <section class="timer t-${e.type}">
      <div class="timer-top">
        <span class="timer-label">${TYPES[e.type].icon} ${e.type === 'tetee' ? 'Tétée en cours' : `${esc(babyName())} dort`}</span>
        <span class="timer-start">depuis ${fmtTime(e.t)}</span>
      </div>
      <div class="timer-clock" data-since="${e.t}">${clock(Date.now() - e.t)}</div>
      <div class="timer-actions">
        ${e.type === 'tetee' ? `<div class="sides">${Object.entries(SIDES).map(([v, l]) =>
          `<button class="side ${e.side === v ? 'on' : ''}" data-act="side" data-id="${e.id}" data-v="${v}">${l}</button>`).join('')}</div>` : '<div></div>'}
        <button class="btn stop" data-act="stop" data-id="${e.id}">Arrêter</button>
      </div>
    </section>`).join('');
}

function entryRow(e) {
  const T = TYPES[e.type] || { icon: '•', label: e.type };
  const run = TIMED.has(e.type) && !e.end;
  const sum = summary(e);
  return `<button class="row" data-act="edit-entry" data-id="${e.id}">
    <span class="row-time">${fmtTime(e.t)}</span>
    <span class="row-ico i-${e.type}">${T.icon}</span>
    <span class="row-main">
      <span class="row-title">${T.label}${run ? ' <span class="live">en cours</span>' : ''}</span>
      ${sum || e.note ? `<span class="row-sub">${esc(sum)}${sum && e.note ? ' — ' : ''}${e.note ? `<em>${esc(e.note)}</em>` : ''}</span>` : ''}
    </span>
    ${e.by ? `<span class="by" title="${esc(e.by)}">${esc(e.by.slice(0, 1))}</span>` : ''}
  </button>`;
}

function rdvRow(r) {
  const d = new Date(r.t);
  return `<button class="row" data-act="rdv-edit" data-id="${r.id}">
    <span class="datebox"><b>${d.getDate()}</b><span>${d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</span></span>
    <span class="row-main">
      <span class="row-title">${esc(r.title)}</span>
      <span class="row-sub">${fmtDay(r.t)} à ${fmtTime(r.t)}${r.place ? `, ${esc(r.place)}` : ''}</span>
    </span>
    ${r.who ? `<span class="tag">${esc(r.who)}</span>` : ''}
  </button>`;
}

function statsRow(st) {
  return `<div class="stats">
    <div><b>${st.meals}</b><span>repas</span></div>
    <div><b>${st.ml}</b><span>ml</span></div>
    <div><b>${st.pipi}</b><span>pipi</span></div>
    <div><b>${st.caca}</b><span>caca</span></div>
    <div><b>${st.sleep ? dur(st.sleep).replace(' min', ' m') : '0'}</b><span>dodo</span></div>
  </div>`;
}

function sparkline(points) {
  const W = 320, H = 90, P = 10;
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const sx = (x) => P + (x1 === x0 ? 0.5 : (x - x0) / (x1 - x0)) * (W - 2 * P);
  const sy = (y) => H - P - (y1 === y0 ? 0.5 : (y - y0) / (y1 - y0)) * (H - 2 * P);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" class="spark" role="img" aria-label="Courbe de poids">
    <path d="${d}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    ${points.map((p) => `<circle cx="${sx(p.x).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="4" fill="currentColor"/>`).join('')}
  </svg>`;
}

/* ───────────── Vues ───────────── */
function viewHome() {
  const s = S();
  const out = [timersBanner()];

  if (!s.birthDate) {
    const items = store.list('valise');
    const done = items.filter((i) => i.done).length;
    let big = '?', sub = 'Indique la date prévue dans les réglages';
    if (s.dueDate) {
      const days = Math.round((new Date(`${s.dueDate}T00:00`).getTime() - startOfDay(Date.now())) / DAY);
      if (days > 0) { big = `J-${days}`; sub = `avant l’arrivée de ${esc(babyName())}`; }
      else if (days === 0) { big = 'Jour J'; sub = 'C’est peut-être pour aujourd’hui !'; }
      else { big = `+${-days} j`; sub = 'Terme dépassé, elle prend son temps'; }
    }
    out.push(`<section class="hero">
      <div class="hero-big">${big}</div>
      <div class="hero-sub">${sub}</div>
      ${s.dueDate ? `<div class="hero-meta">Terme prévu le ${new Date(`${s.dueDate}T12:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</div>` : `<button class="btn ghost" data-act="go" data-tab="settings">Ajouter la date prévue</button>`}
      <button class="valise-link" data-act="go-valise">
        <span>🧳 Valise de maternité</span><span>${done}/${items.length}</span>
        ${bar(items.length ? (done / items.length) * 100 : 0, 'baby')}
      </button>
      <button class="btn primary block" data-act="born">Elle est née !</button>
    </section>`);
  } else {
    out.push(`<section class="hello"><h2>${esc(babyName())}</h2><span>${babyAge(s.birthDate)}</span></section>`);
  }

  out.push(`<div class="quick">
    ${['tetee', 'biberon', 'couche', 'sommeil'].map((t) => `<button class="q q-${t}" data-act="quick" data-type="${t}"><span class="q-ico">${TYPES[t].icon}</span>${TYPES[t].label}</button>`).join('')}
  </div>`);

  if (s.birthDate || entries().length) {
    const meal = lastOf(['tetee', 'biberon']);
    const diaper = lastOf(['couche']);
    const sleep = lastOf(['sommeil']);
    const next = meal ? meal.t + (+s.feedHours || 3) * HOUR : null;
    const late = next && next <= Date.now() + 10 * MIN;
    out.push(`<div class="last">
      <div class="last-item">
        <div class="last-label">Dernier repas</div>
        ${meal ? `<div class="last-big">il y a ${dur(Date.now() - meal.t)}</div>
          <div class="last-sub">${TYPES[meal.type].label}${summary(meal) ? `, ${esc(summary(meal))}` : ''}</div>
          <div class="last-next ${late ? 'late' : ''}">${late ? 'C’est bientôt l’heure' : `Prochain vers ${fmtTime(next)}`}</div>` : '<div class="last-sub">Rien de noté</div>'}
      </div>
      <div class="last-item">
        <div class="last-label">Dernière couche</div>
        ${diaper ? `<div class="last-big">il y a ${dur(Date.now() - diaper.t)}</div><div class="last-sub">${esc(summary(diaper))}</div>` : '<div class="last-sub">Rien de noté</div>'}
      </div>
      <div class="last-item">
        <div class="last-label">Sommeil</div>
        ${sleep && !sleep.end ? `<div class="last-big" data-since="${sleep.t}">${clock(Date.now() - sleep.t)}</div><div class="last-sub">dort en ce moment</div>`
          : sleep ? `<div class="last-big">${dur(Date.now() - sleep.end)}</div><div class="last-sub">éveillée depuis</div>` : '<div class="last-sub">Rien de noté</div>'}
      </div>
    </div>`);
    out.push(`<div class="sec-title">Aujourd’hui</div>${statsRow(dayStats(startOfDay(Date.now())))}`);
  }

  const up = store.list('rdv').filter((r) => r.t >= startOfDay(Date.now())).sort((a, b) => a.t - b.t).slice(0, 3);
  if (up.length) out.push(`<div class="sec-title">Prochains rendez-vous</div><div class="list">${up.map(rdvRow).join('')}</div>`);

  const rs = routines();
  const n = rs.filter((r) => routineDone(r.id)).length;
  out.push(`<button class="kid-mini" data-act="go" data-tab="kid">
    <span class="kid-mini-star">★ ${kidStars()}</span>
    <span class="kid-mini-body"><b>${esc(kidName())}</b><span>${n} sur ${rs.length} routines aujourd’hui</span>${bar(rs.length ? (n / rs.length) * 100 : 0, 'kid')}</span>
  </button>`);
  return out.join('');
}

function viewBaby() {
  const st = dayStats(babyDay);
  const isToday = dayKey(babyDay) === dayKey();
  const growth = store.list('baby').filter((e) => e.type === 'mesure').sort((a, b) => a.t - b.t);
  const weights = growth.filter((e) => e.weight).map((e) => ({ x: e.t, y: +e.weight }));
  return `${timersBanner()}
    <div class="addgrid">${Object.entries(TYPES).map(([k, t]) => `<button class="add" data-act="quick" data-type="${k}"><span>${t.icon}</span>${t.label}</button>`).join('')}</div>
    <div class="daynav">
      <button class="icon-btn" data-act="day" data-d="-1" aria-label="Jour précédent">‹</button>
      <div class="daynav-mid"><b>${fmtDay(babyDay)}</b>${!isToday ? `<button class="link" data-act="day" data-d="0">Revenir à aujourd’hui</button>` : ''}</div>
      <button class="icon-btn" data-act="day" data-d="1" ${isToday ? 'disabled' : ''} aria-label="Jour suivant">›</button>
    </div>
    ${statsRow(st)}
    <div class="list timeline">${st.list.length ? st.list.map(entryRow).join('') : `<p class="empty">Rien de noté ${isToday ? 'aujourd’hui' : 'ce jour-là'}. Utilise les boutons ci-dessus.</p>`}</div>
    <div class="sec-title">Croissance</div>
    <div class="growth">
      ${weights.length >= 2 ? sparkline(weights) : ''}
      ${growth.length ? `<div class="list">${growth.slice(-5).reverse().map((e) => `<button class="row" data-act="edit-entry" data-id="${e.id}">
          <span class="row-time">${new Date(e.t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
          <span class="row-main"><span class="row-title">${esc(summary(e))}</span>${e.note ? `<span class="row-sub"><em>${esc(e.note)}</em></span>` : ''}</span></button>`).join('')}</div>`
        : '<p class="empty">Ajoute le poids et la taille après chaque visite chez le pédiatre.</p>'}
      <button class="btn ghost block" data-act="quick" data-type="mesure">Ajouter une mesure</button>
    </div>`;
}

function viewKid() {
  const s = S();
  const stars = kidStars();
  const goal = +s.goalStars || 20;
  const rs = routines();
  const section = (period, title) => {
    const list = rs.filter((r) => r.period === period);
    const n = list.filter((r) => routineDone(r.id)).length;
    return `<div class="sec-title">${title} <span class="count">${n}/${list.length}</span></div>
      <div class="tiles">${list.map((r) => `<div class="tile ${routineDone(r.id) ? 'done' : ''} ${kidEdit ? 'editing' : ''}" role="button" tabindex="0" ${kidEdit ? '' : `data-act="kid-toggle" data-id="${r.id}"`}>
          <span class="tile-emo">${esc(r.emoji)}</span><span class="tile-label">${esc(r.label)}</span>
          ${kidEdit ? `<span class="tile-x" data-act="kid-del" data-id="${r.id}" role="button" aria-label="Supprimer">×</span>` : ''}
        </div>`).join('')}</div>
      ${list.length && n === list.length && !kidEdit ? `<p class="bravo">Bravo ${esc(kidName())} !</p>` : ''}`;
  };
  const hist = store.list('kidstars').sort((a, b) => b.at - a.at).slice(0, 5);
  return `<section class="stars">
      <div class="stars-count"><span class="star">★</span>${stars}</div>
      <div class="stars-goal">${stars >= goal ? 'Objectif atteint !' : `Encore ${goal - stars} pour : ${esc(s.reward)}`}</div>
      ${bar((stars / goal) * 100, 'kid')}
      <div class="stars-actions">
        <button class="btn" data-act="kid-bonus">+ Étoile bonus</button>
        ${stars >= goal ? `<button class="btn primary" data-act="kid-redeem">Donner la récompense</button>` : ''}
      </div>
    </section>
    ${section('matin', 'Le matin')}
    ${section('soir', 'Le soir')}
    ${kidEdit ? `<form class="addrow" data-form="kid-add">
        <input name="emoji" class="emoji-in" maxlength="4" placeholder="🙂" aria-label="Emoji">
        <input name="label" id="kid-add-label" placeholder="Nouvelle routine" required>
        <select name="period" aria-label="Moment"><option value="matin">Matin</option><option value="soir">Soir</option></select>
        <button class="btn primary">Ajouter</button>
      </form>` : ''}
    <button class="btn ghost block" data-act="kid-edit">${kidEdit ? 'Terminer' : 'Modifier les routines'}</button>
    ${hist.length ? `<div class="sec-title">Dernières étoiles bonus</div><div class="list">${hist.map((h) => `<div class="row static">
        <span class="row-time">${fmtDate(h.at)}</span>
        <span class="row-main"><span class="row-title">${esc(h.reason || 'Bonus')}</span></span>
        <span class="delta ${h.delta < 0 ? 'neg' : ''}">${h.delta > 0 ? '+' : ''}${h.delta} ★</span></div>`).join('')}</div>` : ''}`;
}

function itemRow(col, i) {
  return `<div class="item ${i.done ? 'done' : ''}">
    <button class="check" data-act="list-toggle" data-col="${col}" data-id="${i.id}" aria-label="${i.done ? 'Décocher' : 'Cocher'}"></button>
    <span class="item-text">${esc(i.text)}</span>
    ${col === 'taches' ? `<button class="who ${i.who ? 'set' : ''}" data-act="task-who" data-id="${i.id}">${esc(i.who || 'Qui ?')}</button>` : ''}
    <button class="del" data-act="list-del" data-col="${col}" data-id="${i.id}" aria-label="Supprimer">×</button>
  </div>`;
}

function listView(col) {
  const items = store.list(col);
  const ph = { courses: 'Ajouter un article', taches: 'Ajouter une tâche', valise: 'Ajouter un objet' }[col];
  const cats = ['Maman', 'Bébé', 'Papiers', 'Grand frère'];
  let html = `<form class="addrow" data-form="list-add" data-col="${col}">
    ${col === 'valise' ? `<select name="cat" aria-label="Catégorie">${cats.map((c) => `<option>${c}</option>`).join('')}</select>` : ''}
    <input name="text" id="add-${col}" placeholder="${ph}" autocomplete="off" required>
    <button class="btn primary" aria-label="Ajouter">+</button>
  </form>`;
  if (col === 'valise') {
    const done = items.filter((i) => i.done).length;
    html += `<div class="valise-total"><span>${done} sur ${items.length} prêts</span>${bar(items.length ? (done / items.length) * 100 : 0, 'baby')}</div>`;
    const allCats = cats.concat([...new Set(items.map((i) => i.cat || 'Autre'))].filter((c) => !cats.includes(c)));
    html += allCats.map((c) => {
      const its = items.filter((i) => (i.cat || 'Autre') === c).sort((a, b) => (a.created || 0) - (b.created || 0));
      if (!its.length) return '';
      return `<div class="sec-title">${c} <span class="count">${its.filter((i) => i.done).length}/${its.length}</span></div>
        <div class="list">${its.map((i) => itemRow(col, i)).join('')}</div>`;
    }).join('');
    return html;
  }
  const todo = items.filter((i) => !i.done).sort((a, b) => (b.created || 0) - (a.created || 0));
  const done = items.filter((i) => i.done).sort((a, b) => (b.created || 0) - (a.created || 0));
  html += todo.length ? `<div class="list">${todo.map((i) => itemRow(col, i)).join('')}</div>`
    : `<p class="empty">${col === 'courses' ? 'La liste est vide. Ajoute ce qui manque, l’autre téléphone le verra aussitôt.' : 'Aucune tâche en attente.'}</p>`;
  if (done.length) {
    html += `<div class="sec-title">Fait <span class="count">${done.length}</span><button class="link" data-act="list-clear" data-col="${col}">Tout effacer</button></div>
      <div class="list">${done.map((i) => itemRow(col, i)).join('')}</div>`;
  }
  return html;
}

function viewFamily() {
  const segs = { courses: 'Courses', taches: 'Tâches', rdv: 'Rendez-vous', valise: 'Valise' };
  const head = `<div class="seg">${Object.entries(segs).map(([k, l]) => `<button class="${famSeg === k ? 'on' : ''}" data-act="seg" data-v="${k}">${l}</button>`).join('')}</div>`;
  if (famSeg !== 'rdv') return head + listView(famSeg);
  const all = store.list('rdv').sort((a, b) => a.t - b.t);
  const today = startOfDay(Date.now());
  const up = all.filter((r) => r.t >= today);
  const past = all.filter((r) => r.t < today).reverse().slice(0, 5);
  return `${head}
    <button class="btn primary block" data-act="rdv-edit">Nouveau rendez-vous</button>
    ${up.length ? `<div class="list">${up.map(rdvRow).join('')}</div>` : '<p class="empty">Aucun rendez-vous à venir. Pense à la visite des 8 jours chez le pédiatre.</p>'}
    ${past.length ? `<div class="sec-title">Passés</div><div class="list faded">${past.map(rdvRow).join('')}</div>` : ''}`;
}

function viewSettings() {
  const s = S();
  const theme = localStorage.getItem('theme') || 'auto';
  const sync = store.mode === 'local'
    ? `<p>Mode local : les données restent sur ce téléphone. Pour partager avec ${esc(s.p2)}, active la synchro (README, étape 3).</p>`
    : `<p>${store.connected ? 'Synchronisé' : 'Hors ligne, les modifications partiront au retour du réseau'}${store.user ? `<br>Connecté avec ${esc(store.user.email)}` : ''}</p>
       ${store.user ? '<button class="btn ghost" data-act="logout">Se déconnecter</button>' : ''}`;
  return `<form data-form="settings" class="settings">
      <div class="sec-title">La famille</div>
      <div class="panel">
        ${field('Prénom de la petite sœur', `<input name="babyName" value="${esc(s.babyName)}" placeholder="Pas encore décidé ?">`)}
        ${field('Prénom du grand frère', `<input name="kidName" value="${esc(s.kidName)}">`)}
        <div class="two">
          ${field('Parent 1', `<input name="p1" value="${esc(s.p1)}">`)}
          ${field('Parent 2', `<input name="p2" value="${esc(s.p2)}">`)}
        </div>
        ${field('Date prévue d’accouchement', `<input type="date" name="dueDate" value="${esc(s.dueDate)}">`)}
        ${field('Date et heure de naissance', `<input type="datetime-local" name="birthDate" value="${esc(s.birthDate)}">`, 'laisser vide avant la naissance')}
      </div>
      <div class="sec-title">Repères</div>
      <div class="panel">
        ${field('Intervalle entre deux repas (heures)', `<input name="feedHours" inputmode="decimal" value="${fmtNum(s.feedHours)}">`, 'à ajuster selon le conseil de la sage-femme')}
        ${field('Étoiles pour une récompense', `<input name="goalStars" inputmode="numeric" value="${esc(s.goalStars)}">`)}
        ${field('Récompense', `<input name="reward" value="${esc(s.reward)}">`)}
      </div>
      <button class="btn primary block">Enregistrer les réglages</button>
    </form>
    <div class="sec-title">Ce téléphone</div>
    <div class="panel">
      ${field('Qui l’utilise ?', `<div class="chips">${[s.p1, s.p2].map((p) => `<button type="button" class="chip-btn ${me() === p ? 'on' : ''}" data-act="whoami" data-v="${esc(p)}">${esc(p)}</button>`).join('')}</div>`)}
      ${field('Apparence', `<div class="chips">${Object.entries({ auto: 'Automatique', light: 'Clair', dark: 'Sombre' }).map(([k, l]) => `<button type="button" class="chip-btn ${theme === k ? 'on' : ''}" data-act="set-theme" data-v="${k}">${l}</button>`).join('')}</div>`)}
    </div>
    <div class="sec-title">Synchronisation</div>
    <div class="panel">${sync}</div>
    <div class="sec-title">Sauvegarde</div>
    <div class="panel row-btns">
      <button class="btn ghost" data-act="export">Exporter</button>
      <button class="btn ghost" data-act="import">Importer</button>
      <input type="file" id="import-file" accept="application/json" hidden>
    </div>`;
}

const VIEWS = { home: viewHome, baby: viewBaby, kid: viewKid, family: viewFamily, settings: viewSettings };

/* ───────────── Rendu ───────────── */
function loginHtml() {
  return `<form class="login-box" id="login-form">
    <img src="./icon-192.png" alt="" class="login-logo">
    <h1>Notre Nid</h1>
    <p>Connecte-toi avec le compte créé dans Firebase.</p>
    <input type="email" name="email" placeholder="Adresse e-mail" autocomplete="username" required>
    <input type="password" name="password" placeholder="Mot de passe" autocomplete="current-password" required>
    <p class="login-err" id="login-err"></p>
    <button class="btn primary block">Se connecter</button>
  </form>`;
}

function render() {
  const login = $('#login');
  const app = $('#app');
  if (store.mode === 'cloud' && !store.authReady) {
    login.innerHTML = '<div class="login-box"><img src="./icon-192.png" alt="" class="login-logo"><p>Chargement…</p></div>';
    login.hidden = false; app.hidden = true; return;
  }
  if (store.mode === 'cloud' && !store.user && !store.offlineFallback) {
    if (!$('#login-form')) login.innerHTML = loginHtml();
    login.hidden = false; app.hidden = true; return;
  }
  login.hidden = true; app.hidden = false;
  maybeSeed();

  // en-tête
  const titles = { home: 'Notre Nid', baby: babyName(), kid: kidName(), family: 'Famille', settings: 'Réglages' };
  $('#title').textContent = titles[tab];
  const sync = $('#sync');
  if (store.mode === 'local') { sync.className = 'sync local'; sync.textContent = 'local'; }
  else if (store.connected) { sync.className = 'sync ok'; sync.textContent = 'synchro'; }
  else { sync.className = 'sync off'; sync.textContent = 'hors ligne'; }
  $('#theme-btn').textContent = { auto: '◐', light: '☀', dark: '☾' }[localStorage.getItem('theme') || 'auto'];
  $('#banner').innerHTML = store.error ? `<div class="banner">${esc(store.error)}</div>` : '';

  $$('#nav button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  $('#nav-kid').textContent = kidName();

  // contenu (on préserve la saisie en cours)
  if (tab === 'settings' && settingsDirty) return;
  const ae = document.activeElement;
  const keep = ae && ae.id && $('#main').contains(ae) ? { id: ae.id, v: ae.value, s: ae.selectionStart, e: ae.selectionEnd } : null;
  $('#main').innerHTML = VIEWS[tab]();
  if (keep) {
    const el = document.getElementById(keep.id);
    if (el) { el.value = keep.v; el.focus(); try { el.setSelectionRange(keep.s, keep.e); } catch { /* */ } }
  }

  if (!me() && !whoAsked && $('#sheet-wrap').hidden) {
    whoAsked = true;
    const s = S();
    openSheet(`<h2>Qui utilise ce téléphone ?</h2>
      <p class="sheet-p">Ça permet de savoir qui a noté quoi.</p>
      <div class="two">${[s.p1, s.p2].map((p) => `<button class="btn primary" data-act="whoami" data-v="${esc(p)}">${esc(p)}</button>`).join('')}</div>`);
  }
}

/* ───────────── Panneaux (sheets) ───────────── */
function openSheet(html, onSubmit) {
  const w = $('#sheet-wrap');
  const sh = $('.sheet', w);
  sh.innerHTML = `<div class="grab"></div>${html}`;
  w.hidden = false;
  requestAnimationFrame(() => w.classList.add('open'));
  const form = $('form', sh);
  if (form && onSubmit) form.addEventListener('submit', (ev) => { ev.preventDefault(); onSubmit(new FormData(form), ev.submitter?.value || 'save', form); });
}
function closeSheet() {
  const w = $('#sheet-wrap');
  w.classList.remove('open');
  setTimeout(() => { w.hidden = true; $('.sheet', w).innerHTML = ''; render(); }, 220);
}

function openEntry(type, id) {
  const e = id ? store.get('baby', id) : null;
  type = e ? e.type : type;
  const T = TYPES[type];
  const timed = TIMED.has(type);
  const t = e ? e.t : Date.now();
  let f = '';

  if (type === 'mesure') f += field('Date', `<input type="date" name="date" value="${dayKey(t)}">`);
  else f += field(timed ? 'Début' : 'Heure', `<input type="datetime-local" name="t" value="${toInput(t)}">`);

  if (type === 'tetee') {
    const last = lastOf(['tetee']);
    const sug = e?.side || (last?.side === 'G' ? 'D' : last?.side === 'D' ? 'G' : 'G');
    f += field('Côté', chips('side', SIDES, sug), !e && last?.side ? `la dernière fois : ${SIDES[last.side].toLowerCase()}` : '');
  }
  if (timed) {
    const m = e?.end ? Math.round((e.end - e.t) / MIN) : '';
    f += field('Durée en minutes', `<input name="dur" inputmode="numeric" value="${m}" placeholder="${e && !e.end ? 'en cours' : 'vide pour lancer le chrono'}">`);
  }
  if (type === 'biberon') {
    f += field('Quantité (ml)', `<input name="ml" inputmode="numeric" value="${e?.ml || ''}" placeholder="ex. 90">
      <div class="chips">${[30, 60, 90, 120, 150, 180].map((v) => `<button type="button" class="chip-btn" data-act="fill" data-name="ml" data-v="${v}">${v}</button>`).join('')}</div>`);
    f += field('Lait', chips('milk', { maternel: 'Maternel', infantile: 'Infantile' }, e?.milk || lastOf(['biberon'])?.milk || 'infantile'));
  }
  if (type === 'couche') f += field('Contenu', chips('kind', DIAPERS, e?.kind || 'pipi'));
  if (type === 'sante') {
    f += field('Type', chips('kind', HEALTH, e?.kind || 'Vitamine D'));
    f += field('Détail', `<input name="value" value="${esc(e?.value || '')}" placeholder="ex. 37,8 °C ou nom et dose du médicament">`);
  }
  if (type === 'mesure') {
    f += `<div class="two">${field('Poids (kg)', `<input name="weight" inputmode="decimal" value="${e?.weight ? fmtNum(e.weight) : ''}" placeholder="3,4">`)}
      ${field('Taille (cm)', `<input name="height" inputmode="decimal" value="${e?.height ? fmtNum(e.height) : ''}" placeholder="50">`)}</div>`;
    f += field('Périmètre crânien (cm)', `<input name="head" inputmode="decimal" value="${e?.head ? fmtNum(e.head) : ''}">`);
  }
  f += field('Note', `<textarea name="note" rows="2" placeholder="Facultatif">${esc(e?.note || '')}</textarea>`);

  const buttons = !e && timed
    ? `<button class="btn primary block" value="timer">Lancer le chrono</button><button class="btn ghost block" value="save">Enregistrer avec la durée</button>`
    : `<button class="btn primary block" value="save">Enregistrer</button>`;

  openSheet(`<form><h2>${T.icon} ${T.label}${e ? '' : ''}</h2>${f}<div class="sheet-actions">${buttons}
    ${e ? `<button type="button" class="btn danger block" data-act="del-entry" data-id="${e.id}">Supprimer</button>` : ''}</div></form>`,
  (fd, mode) => {
    const o = e ? { ...e } : { type, by: me(), created: Date.now() };
    o.t = type === 'mesure' ? new Date(`${fd.get('date')}T12:00`).getTime() : fromInput(fd.get('t'));
    if (timed) {
      const d = parseNum(fd.get('dur'));
      if (mode === 'timer') o.end = null;
      else if (d !== null) o.end = o.t + d * MIN;
      else if (!e) { o.end = null; mode = 'timer'; }
    }
    for (const k of ['side', 'milk', 'kind', 'value', 'note']) if (fd.has(k)) o[k] = String(fd.get(k)).trim();
    if (type === 'biberon') o.ml = parseNum(fd.get('ml'));
    if (type === 'mesure') { o.weight = parseNum(fd.get('weight')); o.height = parseNum(fd.get('height')); o.head = parseNum(fd.get('head')); }
    store.put('baby', e ? e.id : uid(), o);
    closeSheet();
    toast(mode === 'timer' ? 'Chrono lancé' : 'Enregistré');
  });
}

function openBorn() {
  const s = S();
  openSheet(`<form><h2>Bienvenue petite sœur !</h2>
    ${field('Prénom', `<input name="babyName" value="${esc(s.babyName)}" required>`)}
    ${field('Date et heure de naissance', `<input type="datetime-local" name="birth" value="${toInput(Date.now())}" required>`)}
    <div class="two">${field('Poids (kg)', '<input name="weight" inputmode="decimal" placeholder="3,2">')}${field('Taille (cm)', '<input name="height" inputmode="decimal" placeholder="49">')}</div>
    <div class="sheet-actions"><button class="btn primary block">Enregistrer la naissance</button></div></form>`,
  (fd) => {
    const birth = fd.get('birth');
    const u = { 'settings/main': { ...S(), babyName: String(fd.get('babyName')).trim(), birthDate: birth } };
    const w = parseNum(fd.get('weight')), h = parseNum(fd.get('height'));
    if (w || h) u[`baby/${uid()}`] = { type: 'mesure', t: fromInput(birth), weight: w, height: h, note: 'Naissance', by: me(), created: Date.now() };
    store.patch(u);
    closeSheet();
    celebrate();
  });
}

function openBonus() {
  const reasons = ['A aidé avec sa sœur', 'A été très gentil', 'A rangé tout seul', 'S’est endormi sans souci', 'A été courageux'];
  openSheet(`<form><h2>Étoile bonus pour ${esc(kidName())}</h2>
    ${field('Pourquoi ?', `<div class="chips">${reasons.map((r) => `<button type="button" class="chip-btn" data-act="fill" data-name="reason" data-v="${esc(r)}">${esc(r)}</button>`).join('')}</div>
      <input name="reason" placeholder="Ou écris la raison" required>`)}
    ${field('Combien ?', chips('n', { 1: '★', 2: '★★', 3: '★★★' }, '1'))}
    <div class="sheet-actions"><button class="btn primary block">Donner</button></div></form>`,
  (fd) => {
    store.put('kidstars', uid(), { delta: +fd.get('n') || 1, reason: String(fd.get('reason')).trim(), at: Date.now(), by: me() });
    closeSheet();
    celebrate('★');
  });
}

function openRdv(id) {
  const r = id ? store.get('rdv', id) : null;
  const s = S();
  const whos = [babyName(), kidName(), s.p2, 'Famille'];
  const titles = ['Pédiatre', 'Sage-femme', 'PMI', 'Vaccin', 'Médecin', 'École'];
  const def = new Date(); def.setDate(def.getDate() + 1); def.setHours(10, 0, 0, 0);
  openSheet(`<form><h2>${r ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}</h2>
    ${field('Quoi ?', `<input name="title" value="${esc(r?.title || '')}" required placeholder="ex. Pédiatre">
      <div class="chips">${titles.map((t) => `<button type="button" class="chip-btn" data-act="fill" data-name="title" data-v="${t}">${t}</button>`).join('')}</div>`)}
    ${field('Quand ?', `<input type="datetime-local" name="t" value="${toInput(r?.t || def.getTime())}" required>`)}
    ${field('Pour qui ?', chips('who', Object.fromEntries(whos.map((w) => [w, w])), r?.who || whos[0]))}
    ${field('Où ?', `<input name="place" value="${esc(r?.place || '')}" placeholder="Facultatif">`)}
    ${field('Note', `<textarea name="note" rows="2" placeholder="Questions à poser, papiers à prendre…">${esc(r?.note || '')}</textarea>`)}
    <div class="sheet-actions"><button class="btn primary block">Enregistrer</button>
    ${r ? `<button type="button" class="btn danger block" data-act="del-rdv" data-id="${r.id}">Supprimer</button>` : ''}</div></form>`,
  (fd) => {
    store.put('rdv', r ? r.id : uid(), {
      title: String(fd.get('title')).trim(), t: fromInput(fd.get('t')), who: fd.get('who'),
      place: String(fd.get('place')).trim(), note: String(fd.get('note')).trim(), by: me(), created: r?.created || Date.now(),
    });
    closeSheet();
    toast('Rendez-vous enregistré');
  });
}

/* ───────────── Effets ───────────── */
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2200);
}
function burst(rect, emojis = ['★'], n = 8, radius = 60) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.className = 'burst';
    s.textContent = emojis[i % emojis.length];
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
    const r = radius * (0.6 + Math.random() * 0.6);
    s.style.left = `${rect.left + rect.width / 2}px`;
    s.style.top = `${rect.top + rect.height / 2}px`;
    s.style.setProperty('--dx', `${Math.cos(a) * r}px`);
    s.style.setProperty('--dy', `${Math.sin(a) * r}px`);
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 1000);
  }
}
const celebrate = (e) => burst({ left: innerWidth / 2, top: innerHeight / 2.5, width: 0, height: 0 }, e ? [e] : ['★', '🎉', '💛', '🎀'], 24, 160);

/* ───────────── Thème ───────────── */
function applyTheme() {
  const t = localStorage.getItem('theme') || 'auto';
  if (t === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
}
function setTheme(v) { localStorage.setItem('theme', v); applyTheme(); render(); }

/* ───────────── Actions ───────────── */
const ACT = {
  nav: (d) => { tab = d.tab; localStorage.setItem('tab', tab); settingsDirty = false; kidEdit = false; render(); window.scrollTo(0, 0); },
  go: (d) => ACT.nav({ tab: d.tab }),
  'go-valise': () => { famSeg = 'valise'; localStorage.setItem('famSeg', famSeg); ACT.nav({ tab: 'family' }); },
  quick: (d) => openEntry(d.type),
  'edit-entry': (d) => openEntry(null, d.id),
  'del-entry': (d) => { if (confirm('Supprimer cette entrée ?')) { store.del('baby', d.id); closeSheet(); toast('Supprimé'); } },
  stop: (d) => {
    const e = store.get('baby', d.id);
    if (!e) return;
    store.put('baby', d.id, { ...e, end: Date.now() });
    toast(`${TYPES[e.type].label} : ${dur(Date.now() - e.t)}`);
  },
  side: (d) => { const e = store.get('baby', d.id); if (e) store.put('baby', d.id, { ...e, side: d.v }); },
  day: (d) => { babyDay = +d.d === 0 ? startOfDay(Date.now()) : startOfDay(addDays(babyDay, +d.d)); render(); },
  born: () => openBorn(),
  'kid-toggle': (d, el) => {
    const id = `${dayKey()}_${d.id}`;
    if (store.get('kidlog', id)) store.del('kidlog', id);
    else { const rect = el.getBoundingClientRect(); store.put('kidlog', id, { date: dayKey(), rid: d.id, at: Date.now(), by: me() }); burst(rect); }
  },
  'kid-del': (d) => { if (confirm('Supprimer cette routine ?')) store.del('routines', d.id); },
  'kid-edit': () => { kidEdit = !kidEdit; render(); },
  'kid-bonus': () => openBonus(),
  'kid-redeem': () => {
    const s = S(), g = +s.goalStars || 20;
    if (kidStars() < g || !confirm(`Utiliser ${g} étoiles pour : ${s.reward} ?`)) return;
    store.put('kidstars', uid(), { delta: -g, reason: `Récompense : ${s.reward}`, at: Date.now(), by: me() });
    celebrate();
  },
  'list-toggle': (d) => { const i = store.get(d.col, d.id); if (i) store.put(d.col, d.id, { ...i, done: !i.done }); },
  'list-del': (d) => store.del(d.col, d.id),
  'list-clear': (d) => {
    const u = {};
    store.list(d.col).filter((i) => i.done).forEach((i) => { u[`${d.col}/${i.id}`] = null; });
    store.patch(u);
  },
  'task-who': (d) => {
    const s = S(), i = store.get('taches', d.id);
    if (!i) return;
    const cycle = ['', s.p1, s.p2, 'Les deux'];
    store.put('taches', d.id, { ...i, who: cycle[(cycle.indexOf(i.who || '') + 1) % cycle.length] });
  },
  seg: (d) => { famSeg = d.v; localStorage.setItem('famSeg', famSeg); render(); },
  'rdv-edit': (d) => openRdv(d.id),
  'del-rdv': (d) => { if (confirm('Supprimer ce rendez-vous ?')) { store.del('rdv', d.id); closeSheet(); } },
  'close-sheet': () => closeSheet(),
  fill: (d, el) => { const f = el.closest('form'); if (f?.elements[d.name]) f.elements[d.name].value = d.v; },
  theme: () => { const order = ['auto', 'dark', 'light']; setTheme(order[(order.indexOf(localStorage.getItem('theme') || 'auto') + 1) % 3]); },
  'set-theme': (d) => setTheme(d.v),
  whoami: (d) => { localStorage.setItem('whoami', d.v); if (!$('#sheet-wrap').hidden) closeSheet(); else render(); },
  logout: async () => { if (confirm('Se déconnecter de ce téléphone ?')) await store.logout(); },
  export: () => {
    const blob = new Blob([JSON.stringify(store.data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `notre-nid-${dayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
  import: () => $('#import-file')?.click(),
};

const FORMS = {
  settings: (f) => {
    const fd = new FormData(f);
    const o = { ...S() };
    for (const k of ['babyName', 'kidName', 'dueDate', 'birthDate', 'reward', 'p1', 'p2']) o[k] = String(fd.get(k) || '').trim();
    o.p1 = o.p1 || 'Papa'; o.p2 = o.p2 || 'Maman';
    o.feedHours = parseNum(fd.get('feedHours')) || 3;
    o.goalStars = parseInt(fd.get('goalStars'), 10) || 20;
    store.put('settings', 'main', o);
    settingsDirty = false;
    render();
    toast('Réglages enregistrés');
  },
  'list-add': (f) => {
    const fd = new FormData(f);
    const text = String(fd.get('text')).trim();
    if (!text) return;
    store.put(f.dataset.col, uid(), { text, done: false, cat: fd.get('cat') || undefined, created: Date.now(), by: me() });
    const input = f.elements.text; input.value = ''; input.focus();
  },
  'kid-add': (f) => {
    const fd = new FormData(f);
    const max = Math.max(0, ...routines().map((r) => r.order || 0));
    store.put('routines', uid(), { emoji: String(fd.get('emoji')).trim() || '⭐', label: String(fd.get('label')).trim(), period: fd.get('period'), order: max + 1 });
    f.reset();
  },
};

/* ───────────── Écouteurs ───────────── */
document.addEventListener('click', (ev) => {
  const a = ev.target.closest('[data-act]');
  if (!a || a.disabled) return;
  ACT[a.dataset.act]?.(a.dataset, a, ev);
});
document.addEventListener('keydown', (ev) => {
  if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('[role="button"][data-act]')) { ev.preventDefault(); ev.target.click(); }
  if (ev.key === 'Escape' && !$('#sheet-wrap').hidden) closeSheet();
});
document.addEventListener('submit', (ev) => {
  const f = ev.target;
  if (f.id === 'login-form') {
    ev.preventDefault();
    const fd = new FormData(f);
    const err = $('#login-err');
    err.textContent = '';
    store.login(fd.get('email'), fd.get('password')).catch((e) => {
      err.textContent = /invalid|wrong|not-found|credential/.test(e.code || '') ? 'E-mail ou mot de passe incorrect.'
        : /too-many/.test(e.code || '') ? 'Trop d’essais. Réessaie dans quelques minutes.' : e.message;
    });
    return;
  }
  if (f.dataset.form && FORMS[f.dataset.form]) { ev.preventDefault(); FORMS[f.dataset.form](f); }
});
document.addEventListener('input', (ev) => { if (ev.target.closest('form[data-form="settings"]')) settingsDirty = true; });
document.addEventListener('change', (ev) => {
  if (ev.target.id !== 'import-file') return;
  const file = ev.target.files[0];
  if (!file) return;
  file.text().then((txt) => {
    const data = JSON.parse(txt);
    if (confirm('Remplacer toutes les données actuelles par celles du fichier ?')) { store.replaceAll(data); toast('Données importées'); }
  }).catch(() => toast('Fichier illisible'));
});

// chronos et « il y a… »
setInterval(() => { $$('[data-since]').forEach((el) => { el.textContent = clock(Date.now() - +el.dataset.since); }); }, 1000);
setInterval(() => {
  const busy = !$('#sheet-wrap').hidden || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
  if (!busy && document.visibilityState === 'visible') render();
}, 30000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && $('#sheet-wrap').hidden) render(); });

/* ───────────── Démarrage ───────────── */
applyTheme();
store.on(render);
store.init();
render();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
