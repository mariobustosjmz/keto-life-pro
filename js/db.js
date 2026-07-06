const DB_NAME = 'ketoLifeDB';
const DB_VERSION = 1;

const STORE_SCHEMAS = {
  settings: { keyPath: 'key' },
  weight: { keyPath: 'id', autoIncrement: true },
  meals: { keyPath: 'id', autoIncrement: true },
  habits: { keyPath: 'id', autoIncrement: true },
  evidence: { keyPath: 'id', autoIncrement: true },
  water: { keyPath: 'id', autoIncrement: true }
};

const STORE_NAMES = Object.keys(STORE_SCHEMAS);

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      for (const storeName of STORE_NAMES) {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, STORE_SCHEMAS[storeName]);
        }
      }
    };
  });
  return dbPromise;
}

function getStore(name, mode = 'readonly') {
  return openDB().then(db => db.transaction(name, mode).objectStore(name));
}

const db = {
  async get(store, key) {
    const objectStore = await getStore(store, 'readonly');
    return new Promise((resolve, reject) => {
      const request = objectStore.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getAll(store) {
    const objectStore = await getStore(store, 'readonly');
    return new Promise((resolve, reject) => {
      const request = objectStore.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async keys(store) {
    const objectStore = await getStore(store, 'readonly');
    return new Promise((resolve, reject) => {
      const request = objectStore.getAllKeys();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async set(key, value) {
    const objectStore = await getStore('settings', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = objectStore.put({ key, value });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async add(store, item) {
    const objectStore = await getStore(store, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = objectStore.add(item);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async put(store, item) {
    const objectStore = await getStore(store, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = objectStore.put(item);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async delete(store, id) {
    const objectStore = await getStore(store, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = objectStore.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async clear(store) {
    const objectStore = await getStore(store, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = objectStore.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};

window.db = db;

/*
Console test snippet for IndexedDB layer:

(async () => {
  await db.set('lang', { code: 'es' });
  const settings = await db.get('settings', 'lang');
  console.log('settings:', settings);
  const mealId = await db.add('meals', { name: 'Huevos revueltos', carbs: 2, protein: 12, fat: 10, netCarbs: 2, calories: 158, time: '10:30', date: new Date().toISOString() });
  console.log('added meal id:', mealId);
  const meals = await db.getAll('meals');
  console.log('meals:', meals);
  await db.delete('meals', mealId);
  console.log('meal deleted');
  const keys = await db.keys('meals');
  console.log('meal keys:', keys);
})();
*/
