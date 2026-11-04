// ─── Shared mock data ──────────────────────────────────────────────────────────

const MOCK_SESSION = {
  fullName: 'ישראל ישראלי',
  email: 'test@example.com',
  phone: '0501234567',
  age: 28,
  city: 'תל אביב',
  hobby: 'ריצה',
  hobbyDescription: 'אוהב לרוץ בפארק הירקון',
  romantic: false,
  hobbyImageUrl: '',
  profilePhotoURL: '',
  latitude: 32.0853,
  longitude: 34.7818,
};

const MOCK_FEED_USERS = [
  {
    fullName: 'דנה כהן',
    email: 'dana@example.com',
    phone: '0521234567',
    age: 25,
    city: 'תל אביב',
    hobby: 'ריצה',
    hobbyDescription: 'רצה מרתון ירושלים בשנה שעברה',
    romantic: true,
    hobbyImageUrl: '',
    profilePhotoURL: '',
    latitude: 32.0853,
    longitude: 34.7818,
  },
  {
    fullName: 'יובל לוי',
    email: 'yuval@example.com',
    phone: '0531234567',
    age: 30,
    city: 'ראשון לציון',
    hobby: 'גיטרה',
    hobbyDescription: 'מנגן גיטרה קלאסית',
    romantic: false,
    hobbyImageUrl: '',
    profilePhotoURL: '',
    latitude: 31.9730,
    longitude: 34.7925,
  },
];

// ─── Firebase CDN mock setup ──────────────────────────────────────────────────
// Blocks real Firebase/EmailJS CDN scripts and injects lightweight mocks.
// Call this before page.goto().

// authEmail: the signed-in Firebase Auth user. Left out → follows the saved session; null → not signed in.
async function setupFirebaseMock(page, { users = [], likedEmails = [], likes = [], requests = [], events = [], contacts = {}, chats = {}, authEmail = '__session__' } = {}) {
  // Block Firebase SDK CDN — empty JS prevents overwriting our mock
  await page.route(/gstatic\.com\/firebasejs/, route =>
    route.fulfill({ contentType: 'text/javascript', body: '// firebase mocked' })
  );
  // Block EmailJS CDN
  await page.route(/cdn\.jsdelivr\.net.*emailjs/, route =>
    route.fulfill({ contentType: 'text/javascript', body: '// emailjs mocked' })
  );

  // Inject window.firebase + window.emailjs before any page script runs
  await page.addInitScript(({ users, likedEmails, likes, requests, events, contacts, chats, authEmail }) => {
    window.__writes = [];   // what the app wrote: { op, path, data }
    const record = (op, path, data) => { window.__writes.push({ op, path, data }); return Promise.resolve(); };
    const san = e => (e || '').replace(/@/g, '_at_').replace(/\./g, '_dot_');
    // EmailJS stub
    window.emailjs = {
      init: () => {},
      send: () => Promise.resolve({ status: 200, text: 'OK' }),
    };

    // Minimal Firestore document wrapper
    const wrapDoc = (data) => ({
      exists: data !== null && data !== undefined,
      data: () => data || {},
      id: data ? (data.email || data.id || 'mock-id') : 'mock-id',
    });

    // Build collection mock — aware of which collection is being queried
    const makeCollection = (collectionName, filterFn = null, parentPath = '') => {
      const path = parentPath ? `${parentPath}/${collectionName}` : collectionName;
      const getAll = () => {
        let data;
        if (collectionName === 'users') data = users;
        else if (collectionName === 'likes') data = likes;
        else if (collectionName === 'message_requests') data = requests;
        else if (collectionName === 'events') data = events;
        else data = [];
        return filterFn ? data.filter(filterFn) : data;
      };

      const self = {
        where: (field, op, val) => makeCollection(collectionName, d => {
          if (op === '==') return d[field] === val;
          return true;
        }, parentPath),
        orderBy: () => self,
        onSnapshot: (cb) => {
          const msgs = collectionName === 'messages' ? (chats[parentPath.split('/').pop()] || []) : [];
          cb({ docs: msgs.map(m => ({ data: () => m })), empty: !msgs.length, size: msgs.length });
          return () => {};
        },
        limit: () => self,
        get: () => {
          const docs = getAll();
          return Promise.resolve({
            docs: docs.map(d => ({
              ...wrapDoc(d),
              data: () => d,
              ref: self.doc(d.id || san(d.email)),
            })),
            empty: docs.length === 0,
            size: docs.length,
          });
        },
        doc: (id) => {
          const allData = [...users, ...likes];
          const found = allData.find(d => {
            const sanEmail = (d.email || '').replace(/@/g, '_at_').replace(/\./g, '_dot_');
            return sanEmail === id || d.id === id || d.email === id;
          });
          const data = collectionName === 'private' ? contacts[parentPath.split('/').pop()] : found;
          const docPath = `${path}/${id}`;
          return {
            path: docPath,
            get: () => Promise.resolve(wrapDoc(data || null)),
            set: (d) => record('set', docPath, d),
            update: (d) => record('update', docPath, d),
            delete: () => record('delete', docPath),
            collection: (sub) => makeCollection(sub, null, docPath),
          };
        },
        add: () => Promise.resolve({ id: 'new-mock-id' }),
      };
      return self;
    };

    const mockDb = {
      collection: (name) => makeCollection(name),
      batch: () => {
        const ops = [];
        return {
          set: (ref, d) => ops.push(['set', ref.path, d]),
          update: (ref, d) => ops.push(['update', ref.path, d]),
          delete: (ref) => ops.push(['delete', ref.path]),
          commit: () => { ops.forEach(o => record(...o)); return Promise.resolve(); },
        };
      },
    };

    // firebase.firestore must be a function AND have static FieldValue
    const firestoreFn = Object.assign(() => mockDb, {
      FieldValue: { serverTimestamp: () => new Date(), delete: () => '__delete__' },
    });

    // Firebase Auth stub
    const sessionEmail = () => {
      try { return JSON.parse(localStorage.getItem('hobbyMatchUser'))?.email || null; } catch { return null; }
    };
    let signedIn;
    const currentEmail = () => {
      if (signedIn !== undefined) return signedIn;
      return authEmail === '__session__' ? sessionEmail() : authEmail;
    };
    const authObj = {
      get currentUser() { const e = currentEmail(); return e ? { email: e } : null; },
      onAuthStateChanged(cb) { setTimeout(() => cb(authObj.currentUser), 0); return () => {}; },
      signOut() { signedIn = null; window.__signedOut = true; return Promise.resolve(); },
      isSignInWithEmailLink: href => href.includes('oobCode='),
      sendSignInLinkToEmail(email, settings) { window.__linkSent = { email, url: settings.url }; return Promise.resolve(); },
      signInWithEmailLink(email) { signedIn = email; return Promise.resolve({ user: { email } }); },
      signInWithPopup() { signedIn = 'google@example.com'; return Promise.resolve({ user: { email: signedIn, displayName: 'גוגל משתמש' } }); },
    };
    const authFn = Object.assign(() => authObj, { GoogleAuthProvider: function () {} });

    window.firebase = {
      initializeApp: () => {},
      auth: authFn,
      firestore: firestoreFn,
      storage: () => ({
        ref: () => ({
          put: () => Promise.resolve({
            ref: { getDownloadURL: () => Promise.resolve('') },
          }),
          getDownloadURL: () => Promise.resolve(''),
          child() { return this; },
        }),
      }),
    };
  }, { users, likedEmails, likes, requests, events, contacts, chats, authEmail });
}

// ─── Set localStorage session before page load ────────────────────────────────
async function injectSession(page, user = MOCK_SESSION) {
  await page.addInitScript((u) => {
    localStorage.setItem('hobbyMatchUser', JSON.stringify(u));
  }, user);
}

module.exports = { MOCK_SESSION, MOCK_FEED_USERS, setupFirebaseMock, injectSession };
