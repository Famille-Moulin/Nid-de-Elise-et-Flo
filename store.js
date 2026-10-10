// Stockage des données : localStorage (mode local) ou Firebase Realtime Database (synchro).
import { firebaseConfig } from './config.js';

const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';
const LOCAL_KEY = 'nid-local-v1';
const CACHE_KEY = 'nid-cache-v1';

const stripId = (o) => { const { id, ...rest } = o; return rest; };
const clean = (o) => {
  const r = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null && v !== '' && !Number.isNaN(v)) r[k] = v;
  return r;
};

export const store = {
  mode: firebaseConfig ? 'cloud' : 'local',
  data: {},
  user: null,
  authReady: false,
  loaded: false,
  connected: false,
  offlineFallback: false,
  error: '',
  _subs: [],
  _fb: null,

  on(fn) { this._subs.push(fn); },
  emit() { for (const f of this._subs) f(); },

  list(col) { return Object.entries(this.data[col] || {}).map(([id, v]) => ({ ...v, id })); },
  get(col, id) { const v = this.data[col]?.[id]; return v ? { ...v, id } : null; },
  put(col, id, obj) { return this.patch({ [`${col}/${id}`]: obj }); },
  del(col, id) { return this.patch({ [`${col}/${id}`]: null }); },

  // updates : { "collection/id": objet | null }
  patch(updates) {
    const u = {};
    for (const [path, v] of Object.entries(updates)) {
      const [col, id] = path.split('/');
      const val = v === null ? null : clean(stripId(v));
      u[path] = val;
      this.data[col] = { ...(this.data[col] || {}) };
      if (val === null) delete this.data[col][id];
      else this.data[col][id] = val;
    }
    this._save();
    this.emit();
    if (this.mode === 'cloud' && this._fb) {
      const { D, db } = this._fb;
      return D.update(D.ref(db, 'family'), u).catch((e) => { this.error = 'Enregistrement refusé : ' + e.message; this.emit(); });
    }
  },

  replaceAll(data) {
    this.data = data || {};
    this._save();
    this.emit();
    if (this.mode === 'cloud' && this._fb) {
      const { D, db } = this._fb;
      return D.set(D.ref(db, 'family'), this.data);
    }
  },

  _save() {
    try { localStorage.setItem(this.mode === 'local' ? LOCAL_KEY : CACHE_KEY, JSON.stringify(this.data)); } catch { /* stockage plein */ }
  },

  async init() {
    try { this.data = JSON.parse(localStorage.getItem(this.mode === 'local' ? LOCAL_KEY : CACHE_KEY)) || {}; } catch { this.data = {}; }

    if (this.mode === 'local') {
      this.authReady = true;
      this.loaded = true;
      window.addEventListener('storage', (e) => {
        if (e.key !== LOCAL_KEY) return;
        try { this.data = JSON.parse(e.newValue) || {}; } catch { /* ignore */ }
        this.emit();
      });
      this.emit();
      return;
    }

    try {
      const [{ initializeApp }, A, D] = await Promise.all([
        import(FB + 'firebase-app.js'),
        import(FB + 'firebase-auth.js'),
        import(FB + 'firebase-database.js'),
      ]);
      const app = initializeApp(firebaseConfig);
      const auth = A.getAuth(app);
      const db = D.getDatabase(app);
      this._fb = { A, D, auth, db };

      D.onValue(D.ref(db, '.info/connected'), (s) => { this.connected = !!s.val(); this.emit(); });

      let unsub = null;
      A.onAuthStateChanged(auth, (user) => {
        this.user = user;
        this.authReady = true;
        this.error = '';
        if (unsub) { unsub(); unsub = null; }
        if (user) {
          unsub = D.onValue(
            D.ref(db, 'family'),
            (snap) => { this.data = snap.val() || {}; this.loaded = true; this._save(); this.emit(); },
            (err) => {
              this.error = String(err.code || err.message).includes('PERMISSION')
                ? "Ce compte n'a pas accès aux données. Vérifie que ton e-mail figure bien dans les règles Firebase (README, étape 3)."
                : err.message;
              this.emit();
            },
          );
        } else {
          this.loaded = false;
        }
        this.emit();
      });
    } catch (e) {
      this.offlineFallback = true;
      this.authReady = true;
      this.error = 'Pas de connexion : affichage des dernières données connues. Les modifications ne seront pas synchronisées.';
      this.emit();
    }
  },

  async login(email, password) {
    const { A, auth } = this._fb;
    await A.signInWithEmailAndPassword(auth, email.trim(), password);
  },

  async logout() {
    if (!this._fb) return;
    await this._fb.A.signOut(this._fb.auth);
    this.data = {};
    localStorage.removeItem(CACHE_KEY);
    this.emit();
  },
};
