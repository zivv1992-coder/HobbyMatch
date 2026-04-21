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

async function setupFirebaseMock(page, { users = [], likedEmails = [], likes = [] } = {}) {
  // Block Firebase SDK CDN — empty JS prevents overwriting our mock
  await page.route(/gstatic\.com\/firebasejs/, route =>
    route.fulfill({ contentType: 'text/javascript', body: '// firebase mocked' })
  );
  // Block EmailJS CDN
  await page.route(/cdn\.jsdelivr\.net.*emailjs/, route =>
    route.fulfill({ contentType: 'text/javascript', body: '// emailjs mocked' })
  );

  // Inject window.firebase + window.emailjs before any page script runs
  await page.addInitScript(({ users, likedEmails, likes }) => {
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
    const makeCollection = (collectionName, filterFn = null) => {
      const getAll = () => {
        let data;
        if (collectionName === 'users') data = users;
        else if (collectionName === 'likes') data = likes;
        else data = [];
        return filterFn ? data.filter(filterFn) : data;
      };

      const self = {
        where: (field, op, val) => makeCollection(collectionName, d => {
          if (op === '==') return d[field] === val;
          return true;
        }),
        orderBy: () => self,
        limit: () => self,
        get: () => {
          const docs = getAll();
          return Promise.resolve({
            docs: docs.map(d => ({
              ...wrapDoc(d),
              data: () => d,
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
          return {
            get: () => Promise.resolve(wrapDoc(found || null)),
            set: () => Promise.resolve(),
            update: () => Promise.resolve(),
            delete: () => Promise.resolve(),
          };
        },
        add: () => Promise.resolve({ id: 'new-mock-id' }),
      };
      return self;
    };

    const mockDb = {
      collection: (name) => makeCollection(name),
    };

    // firebase.firestore must be a function AND have static FieldValue
    const firestoreFn = Object.assign(() => mockDb, {
      FieldValue: { serverTimestamp: () => new Date() },
    });

    window.firebase = {
      initializeApp: () => {},
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
  }, { users, likedEmails, likes });
}

// ─── Set localStorage session before page load ────────────────────────────────
async function injectSession(page, user = MOCK_SESSION) {
  await page.addInitScript((u) => {
    localStorage.setItem('hobbyMatchUser', JSON.stringify(u));
  }, user);
}

module.exports = { MOCK_SESSION, MOCK_FEED_USERS, setupFirebaseMock, injectSession };
