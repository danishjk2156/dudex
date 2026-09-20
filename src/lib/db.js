/**
 * IndexedDB storage engine for Universal Business Billing
 * Follows Andrej Karpathy's minimal, reliable, self-contained architecture
 */

const DB_NAME = 'UniversalBillingDB';
const DB_VERSION = 3;

const DEFAULT_USERS = [
  {
    id: 'user_admin',
    name: 'Venkatesh',
    phone: '9840865510',
    pin: '',
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_SETTINGS = {
  id: 'business_profile',
  businessName: 'G. V. MILK AGENCY',
  address: 'SOLAN NAGAR',
  area: 'SOLAN NAGAR',
  city: 'CHENNAI - 600109',
  phone: '9840865510',
  gstin: '',
  currency: '₹',
  logo: '',
  paperSize: '58mm',
  nextBillNumber: 1,
};

const DEFAULT_SHOPS = [
  {
    id: 'shop_1',
    name: 'ABC Stores',
    owner: 'Kumar',
    phone: '9840123456',
    area: 'Solan Nagar',
    status: 'ACTIVE',
    address: '12, Main Road, Solan Nagar',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'shop_2',
    name: 'Anbu Shop',
    owner: 'Anbu selvam',
    phone: '9836762329',
    area: 'avadi',
    status: 'ACTIVE',
    address: '45, Market St, Avadi',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'shop_3',
    name: 'G. V. Milk Agency',
    owner: 'Venkatesh',
    phone: '9840865510',
    area: 'Solan Nagar',
    status: 'ACTIVE',
    address: 'Solan Nagar, Chennai',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'shop_4',
    name: 'Lakshmi Supermarket',
    owner: 'Lakshmi',
    phone: '9840234567',
    area: 'Velachery',
    status: 'ACTIVE',
    address: '78, 100 Feet Rd, Velachery',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'shop_5',
    name: 'Metro Groceries',
    owner: 'Murugan',
    phone: '9840345678',
    area: 'Adyar',
    status: 'ACTIVE',
    address: '22, LB Road, Adyar',
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_COMPANIES = [
  { id: 'cmp_aavin', name: 'Aavin', description: 'Fresh milk & dairy products', color: '#3B82F6', createdAt: new Date().toISOString() },
  { id: 'cmp_heritage', name: 'Heritage', description: 'Dairy, Curd & Beverages', color: '#10B981', createdAt: new Date().toISOString() },
  { id: 'cmp_hatsun', name: 'Hatsun', description: 'Agro products & milk', color: '#F59E0B', createdAt: new Date().toISOString() },
  { id: 'cmp_milkymist', name: 'Milky Mist', description: 'Paneer, Butter, Curd & Cheese', color: '#EC4899', createdAt: new Date().toISOString() },
];

const DEFAULT_PRODUCTS = [
  { id: 'prod_1', companyId: 'cmp_aavin', name: 'Aavin Blue', rate: 20, unit: 'Packet', gstRate: 0, status: 'active', createdAt: new Date().toISOString() },
  { id: 'prod_2', companyId: 'cmp_aavin', name: 'Aavin Green', rate: 22, unit: 'Packet', gstRate: 0, status: 'active', createdAt: new Date().toISOString() },
  { id: 'prod_3', companyId: 'cmp_aavin', name: 'Aavin Orange', rate: 30, unit: 'Packet', gstRate: 0, status: 'active', createdAt: new Date().toISOString() },
  { id: 'prod_4', companyId: 'cmp_heritage', name: 'Heritage Curd', rate: 9, unit: 'Packet', gstRate: 5, status: 'active', createdAt: new Date().toISOString() },
  { id: 'prod_5', companyId: 'cmp_heritage', name: 'Heritage TM', rate: 24, unit: 'Packet', gstRate: 0, status: 'active', createdAt: new Date().toISOString() },
  { id: 'prod_6', companyId: 'cmp_hatsun', name: 'Supergold', rate: 33, unit: 'Packet', gstRate: 0, status: 'active', createdAt: new Date().toISOString() },
  { id: 'prod_7', companyId: 'cmp_milkymist', name: 'Milky Mist Paneer 200g', rate: 95, unit: 'Piece', gstRate: 5, status: 'active', createdAt: new Date().toISOString() },
  { id: 'prod_8', companyId: 'cmp_milkymist', name: 'Milky Mist Curd 500g', rate: 45, unit: 'Pouch', gstRate: 5, status: 'active', createdAt: new Date().toISOString() },
];

let dbInstance = null;

export function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Settings Store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }

      // Shops Store
      if (!db.objectStoreNames.contains('shops')) {
        const shopStore = db.createObjectStore('shops', { keyPath: 'id' });
        shopStore.createIndex('name', 'name', { unique: false });
        shopStore.createIndex('area', 'area', { unique: false });
        shopStore.createIndex('status', 'status', { unique: false });
      }

      // Companies / Brands Store
      if (!db.objectStoreNames.contains('companies')) {
        const companyStore = db.createObjectStore('companies', { keyPath: 'id' });
        companyStore.createIndex('name', 'name', { unique: false });
      }

      // Products Store
      if (!db.objectStoreNames.contains('products')) {
        const productStore = db.createObjectStore('products', { keyPath: 'id' });
        productStore.createIndex('companyId', 'companyId', { unique: false });
        productStore.createIndex('status', 'status', { unique: false });
      }

      // Bills Store
      if (!db.objectStoreNames.contains('bills')) {
        const billStore = db.createObjectStore('bills', { keyPath: 'id' });
        billStore.createIndex('billNumber', 'billNumber', { unique: false });
        billStore.createIndex('date', 'date', { unique: false });
        billStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Users Store (for Name & Phone number authentication)
      if (!db.objectStoreNames.contains('users')) {
        const userStore = db.createObjectStore('users', { keyPath: 'id' });
        userStore.createIndex('phone', 'phone', { unique: true });
        userStore.createIndex('name', 'name', { unique: false });
      }
    };

    request.onblocked = () => {
      console.warn('IndexedDB upgrade blocked by another tab or connection.');
    };

    request.onsuccess = async (event) => {
      dbInstance = event.target.result;
      try {
        await seedInitialData(dbInstance);
      } catch (err) {
        console.warn('seedInitialData warning:', err);
      }
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('IndexedDB Error:', event.target.error);
      reject(event.target.error);
    };
  });
}

async function seedInitialData(db) {
  // Check if users exist
  const users = await getAllItems('users', db);
  if (users.length === 0) {
    for (const u of DEFAULT_USERS) {
      await setItem('users', u, db);
    }
  }

  // Check if settings exist
  const settings = await getItem('settings', 'business_profile', db);
  if (!settings) {
    await setItem('settings', DEFAULT_SETTINGS, db);
  }

  // Check if shops exist
  const shops = await getAllItems('shops', db);
  if (shops.length === 0) {
    for (const s of DEFAULT_SHOPS) {
      await setItem('shops', s, db);
    }
  }

  // Check if companies exist
  const companies = await getAllItems('companies', db);
  if (companies.length === 0) {
    for (const c of DEFAULT_COMPANIES) {
      await setItem('companies', c, db);
    }
  }

  // Check if products exist
  const products = await getAllItems('products', db);
  if (products.length === 0) {
    for (const p of DEFAULT_PRODUCTS) {
      await setItem('products', p, db);
    }
  }
}

// User Authentication Helpers with dual IndexedDB + LocalStorage sync
const LOCAL_USERS_CACHE_KEY = 'pos_users_registry_v1';

export function getCachedUsers() {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return DEFAULT_USERS;
}

export function setCachedUsers(users) {
  try {
    localStorage.setItem(LOCAL_USERS_CACHE_KEY, JSON.stringify(users));
  } catch (e) {}
}

export async function getUserByPhone(phone, customDb) {
  const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
  if (!cleanPhone) return null;

  // 1. Fast check in local mirror cache first
  const cached = getCachedUsers();
  const foundInCache = cached.find((u) => {
    const uPhone = String(u.phone || '').replace(/\D/g, '').slice(-10);
    return uPhone === cleanPhone;
  });
  if (foundInCache) return foundInCache;

  // 2. Query IndexedDB
  try {
    const db = customDb || (await openDB());
    if (db.objectStoreNames.contains('users')) {
      return new Promise((resolve) => {
        try {
          const transaction = db.transaction(['users'], 'readonly');
          const store = transaction.objectStore('users');
          const allReq = store.getAll();
          allReq.onsuccess = () => {
            const match = (allReq.result || []).find((u) => {
              const uPhone = String(u.phone || '').replace(/\D/g, '').slice(-10);
              return uPhone === cleanPhone;
            });
            resolve(match || null);
          };
          allReq.onerror = () => resolve(null);
        } catch (e) {
          resolve(null);
        }
      });
    }
  } catch (err) {
    console.warn('getUserByPhone IndexedDB lookup:', err);
  }

  return null;
}

export async function saveUser(userData, customDb) {
  const cleanPhone = String(userData.phone || '').replace(/\D/g, '').slice(-10);
  const user = {
    id: userData.id || `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    name: (userData.name || '').trim(),
    phone: cleanPhone,
    pin: userData.pin || '',
    photo: userData.photo || '',
    avatarUrl: userData.avatarUrl || '',
    updatedAt: new Date().toISOString(),
    createdAt: userData.createdAt || new Date().toISOString(),
  };

  // 1. Update cache mirror
  const currentUsers = getCachedUsers().filter(
    (u) => String(u.phone || '').replace(/\D/g, '').slice(-10) !== cleanPhone
  );
  currentUsers.unshift(user);
  setCachedUsers(currentUsers);

  // 2. Persist to IndexedDB
  try {
    const db = customDb || (await openDB());
    if (db.objectStoreNames.contains('users')) {
      await setItem('users', user, db);
    }
  } catch (err) {
    console.warn('saveUser IndexedDB persist warning:', err);
  }

  return user;
}

// Generic Store Operations
export async function getAllItems(storeName, customDb) {
  const db = customDb || (await openDB());
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getItem(storeName, key, customDb) {
  const db = customDb || (await openDB());
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function setItem(storeName, item, customDb) {
  const db = customDb || (await openDB());
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(item);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteItem(storeName, key, customDb) {
  const db = customDb || (await openDB());
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

export async function clearStore(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

// Bill Sequence Management
export async function getNextBillNumber() {
  const db = await openDB();
  const settings = (await getItem('settings', 'business_profile', db)) || DEFAULT_SETTINGS;
  const currentNumber = settings.nextBillNumber || 1;
  
  // Increment for next time
  settings.nextBillNumber = currentNumber + 1;
  await setItem('settings', settings, db);
  
  return currentNumber;
}

// Backup and Restore
export async function exportAllData() {
  const db = await openDB();
  const settings = await getAllItems('settings', db);
  const shops = await getAllItems('shops', db);
  const companies = await getAllItems('companies', db);
  const products = await getAllItems('products', db);
  const bills = await getAllItems('bills', db);

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    data: {
      settings,
      shops,
      companies,
      products,
      bills,
    },
  };
}

export async function importData(jsonData) {
  if (!jsonData || !jsonData.data) throw new Error('Invalid backup file format');
  const db = await openDB();

  if (jsonData.data.settings) {
    for (const s of jsonData.data.settings) await setItem('settings', s, db);
  }
  if (jsonData.data.shops) {
    for (const sh of jsonData.data.shops) await setItem('shops', sh, db);
  }
  if (jsonData.data.companies) {
    for (const c of jsonData.data.companies) await setItem('companies', c, db);
  }
  if (jsonData.data.products) {
    for (const p of jsonData.data.products) await setItem('products', p, db);
  }
  if (jsonData.data.bills) {
    for (const b of jsonData.data.bills) await setItem('bills', b, db);
  }
  return true;
}
