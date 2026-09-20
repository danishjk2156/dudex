/**
 * Supabase Data Service & Hybrid Storage Engine
 * Provides direct Supabase PostgreSQL integration with automatic IndexedDB offline caching
 * Follows Andrej Karpathy's clean, robust, self-contained architecture
 */
import { supabase, isSupabaseConfigured } from './supabaseClient';
import * as localDb from './db';

// Map client store names to Supabase table names
const TABLE_MAP = {
  settings: 'settings',
  companies: 'companies',
  products: 'products',
  shops: 'shops',
  bills: 'bills',
  users: 'users',
};

// Known Supabase column definitions (prevents PGRST204 errors on extra client state)
const TABLE_COLUMNS = {
  settings: [
    'id', 'business_name', 'address', 'area', 'city', 'phone', 'email',
    'owner_name', 'gstin', 'gst_rate', 'currency', 'paper_size', 'logo',
    'user_photo', 'next_bill_number', 'updated_at'
  ],
  companies: [
    'id', 'name', 'description', 'image', 'logo', 'status', 'color', 'created_at'
  ],
  products: [
    'id', 'name', 'company_id', 'unit', 'rate', 'gst_rate', 'status', 'created_at'
  ],
  shops: [
    'id', 'name', 'owner', 'phone', 'area', 'status', 'address', 'balance', 'outstanding_balance', 'created_at'
  ],
  bills: [
    'id', 'bill_number', 'shop_id', 'shop_name', 'shop_phone', 'customer_name', 'customer_phone',
    'date', 'date_raw', 'time', 'type', 'total_items', 'total_qty', 'current_amount',
    'total_amount', 'sub_total', 'taxable_amount', 'gst_rate',
    'gst_amount', 'cgst_amount', 'sgst_amount', 'previous_due', 'round_off',
    'final_amount', 'paid_amount', 'unpaid_amount', 'payment_status',
    'payment_method', 'items', 'is_print', 'created_at'
  ],
  users: [
    'id', 'phone', 'name', 'pin', 'photo', 'avatar_url', 'status', 'created_at', 'updated_at'
  ],
};

// Global cache for unsupported columns per table to avoid repeated failed queries
const unsupportedColumns = {
  settings: new Set(),
  companies: new Set(),
  products: new Set(),
  shops: new Set(),
  bills: new Set(),
  users: new Set(),
};

// Transform camelCase object to snake_case for PostgreSQL
function toSnakeCase(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    // Preserve items JSONB as-is
    if (key === 'items') {
      result.items = value;
      continue;
    }
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

// Transform snake_case PostgreSQL row to camelCase for React App
function toCamelCase(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'items') {
      result.items = value;
      continue;
    }
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  // Helpful aliases so UI components never miss properties
  if (result.shopName && !result.customerName) {
    result.customerName = result.shopName;
  }
  if (result.shopPhone && !result.customerPhone) {
    result.customerPhone = result.shopPhone;
  }
  if (!result.color && (result.name || result.id?.startsWith('cmp_'))) {
    result.color = '#4F46E5';
  }
  return result;
}

/**
 * Fetch all items for a store (Supabase with IndexedDB fallback/mirror)
 */
export async function getAllItems(storeName) {
  const tableName = TABLE_MAP[storeName] || storeName;

  if (isSupabaseConfigured && navigator.onLine) {
    try {
      let query = supabase.from(tableName).select('*');
      if (tableName === 'bills') {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (!error && data) {
        const camelData = data.map(toCamelCase);

        // Auto-seed: If Supabase table is empty on first connect, seed from local IndexedDB
        if (camelData.length === 0) {
          const localItems = await localDb.getAllItems(storeName);
          if (localItems && localItems.length > 0) {
            console.info(`[Supabase] Seeding ${storeName} with ${localItems.length} local items...`);
            for (const it of localItems) {
              await setItem(storeName, it);
            }
            return localItems;
          }
        }

        // Keep local IndexedDB updated as offline mirror
        try {
          for (const item of camelData) {
            await localDb.setItem(storeName, item);
          }
        } catch (cacheErr) {
          // non-fatal caching warning
        }

        return camelData;
      }
    } catch (err) {
      console.warn(`[Supabase] Failed to fetch ${tableName}, falling back to IndexedDB:`, err);
    }
  }

  // Fallback to local IndexedDB
  return localDb.getAllItems(storeName);
}

/**
 * Fetch single item by key
 */
export async function getItem(storeName, key) {
  const tableName = TABLE_MAP[storeName] || storeName;

  if (isSupabaseConfigured && navigator.onLine) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', key)
        .maybeSingle();

      if (!error && data) {
        return toCamelCase(data);
      }
    } catch (err) {
      console.warn(`[Supabase] Failed to get ${tableName}:${key}:`, err);
    }
  }

  return localDb.getItem(storeName, key);
}

/**
 * Insert or Update an item in Supabase (and mirror locally)
 */
export async function setItem(storeName, item) {
  const tableName = TABLE_MAP[storeName] || storeName;

  // Always update local IndexedDB first for instant UI response
  await localDb.setItem(storeName, item);

  if (isSupabaseConfigured && navigator.onLine) {
    try {
      const snakeRow = toSnakeCase(item);

      // Normalize common cross-field aliases
      if (tableName === 'bills') {
        if (!snakeRow.shop_name && snakeRow.customer_name) {
          snakeRow.shop_name = snakeRow.customer_name;
        }
        if (!snakeRow.shop_phone && snakeRow.customer_phone) {
          snakeRow.shop_phone = snakeRow.customer_phone;
        }
      }

      // Filter to known or permitted columns
      let payload = { ...snakeRow };
      const allowed = TABLE_COLUMNS[tableName];
      if (allowed) {
        payload = Object.fromEntries(
          Object.entries(payload).filter(([k]) => allowed.includes(k))
        );
      }



      // Remove any previously identified unsupported columns for this table
      if (unsupportedColumns[tableName]) {
        for (const col of unsupportedColumns[tableName]) {
          delete payload[col];
        }
      }

      // Nullify shop_id for walk-in or invalid shops to prevent foreign key violations
      if (tableName === 'bills') {
        if (!payload.shop_id || payload.shop_id === 'walkin' || typeof payload.shop_id !== 'string' || !payload.shop_id.trim()) {
          payload.shop_id = null;
        }
      }

      // Initial upsert attempt
      let { error } = await supabase
        .from(tableName)
        .upsert(payload, { onConflict: 'id' });

      // If Supabase schema lacks optional columns or hits schema cache issues, drop that column and auto-retry!
      let retries = 0;
      while (error && retries < 20) {
        // 1. Missing column in schema cache or table
        const missingColMatch =
          error.message?.match(/Could not find the '([^']+)' column/i) ||
          error.message?.match(/column "([^"]+)" of relation "[^"]+" does not exist/i) ||
          error.message?.match(/column "([^"]+)" does not exist/i);

        if (missingColMatch && missingColMatch[1]) {
          const missingCol = missingColMatch[1];
          if (unsupportedColumns[tableName]) {
            unsupportedColumns[tableName].add(missingCol);
          }
          delete payload[missingCol];
          const retryRes = await supabase
            .from(tableName)
            .upsert(payload, { onConflict: 'id' });
          error = retryRes.error;
          retries++;
          continue;
        }

        // 2. Foreign key constraint violation (e.g., bills_shop_id_fkey when shop isn't in DB yet)
        if (
          tableName === 'bills' &&
          payload.shop_id &&
          (error.code === '23503' || error.message?.includes('foreign key constraint') || error.message?.includes('shop_id'))
        ) {
          console.warn(`[Supabase] Foreign key violation for shop_id "${payload.shop_id}". Nullifying and retrying...`);
          payload.shop_id = null;
          const retryRes = await supabase
            .from(tableName)
            .upsert(payload, { onConflict: 'id' });
          error = retryRes.error;
          retries++;
          continue;
        }

        break;
      }

      if (error) {
        console.error(`[Supabase] Error persisting ${tableName}:`, error.message);
        throw new Error(`[Supabase ${tableName}] ` + error.message);
      }
    } catch (err) {
      console.warn(`[Supabase] Network/persistence error on ${tableName}:`, err);
      // Re-throw so caller/toast can detect or warn if appropriate
      throw err;
    }
  }

  return item;
}

/**
 * Delete an item by ID
 */
export async function deleteItem(storeName, key) {
  const tableName = TABLE_MAP[storeName] || storeName;

  // Delete from local mirror
  await localDb.deleteItem(storeName, key);

  if (isSupabaseConfigured && navigator.onLine) {
    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', key);

      if (error) {
        console.error(`[Supabase] Error deleting ${tableName}:${key}:`, error.message);
      }
    } catch (err) {
      console.warn(`[Supabase] Network error deleting ${tableName}:`, err);
    }
  }

  return true;
}

/**
 * Get Next Bill Number
 */
export async function getNextBillNumber() {
  if (isSupabaseConfigured && navigator.onLine) {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('bill_number')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        const lastNum = parseInt(data[0].bill_number, 10);
        if (!isNaN(lastNum)) {
          return lastNum + 1;
        }
      }
    } catch (err) {
      console.warn('[Supabase] getNextBillNumber fallback:', err);
    }
  }

  return localDb.getNextBillNumber();
}

/**
 * User & Authentication operations
 */
export async function getUserByPhone(phone) {
  if (isSupabaseConfigured && navigator.onLine) {
    try {
      const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (!error && data) {
        const camelUser = toCamelCase(data);
        delete camelUser.role; // Ensure no role property
        // Cache to local IndexedDB for seamless offline operation
        try {
          await localDb.saveUser(camelUser);
        } catch (cacheErr) {
          // ignore cache warning
        }
        return camelUser;
      }
    } catch (err) {
      console.warn('[Supabase] getUserByPhone lookup fallback:', err);
    }
  }

  const localUser = await localDb.getUserByPhone(phone);
  if (localUser) {
    delete localUser.role;
  }
  return localUser;
}

export async function saveUser(userData) {
  const cleanPhone = String(userData.phone || '').replace(/\D/g, '').slice(-10);
  const user = {
    id: userData.id || `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: (userData.name || '').trim(),
    phone: cleanPhone,
    pin: userData.pin || '',
    photo: userData.photo || '',
    avatarUrl: userData.avatarUrl || '',
    status: userData.status || 'ACTIVE',
    createdAt: userData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Always save locally first
  const savedLocal = await localDb.saveUser(user);

  if (isSupabaseConfigured && navigator.onLine) {
    try {
      const snakeRow = toSnakeCase(user);
      // Strip role if present
      delete snakeRow.role;

      let payload = { ...snakeRow };
      const allowed = TABLE_COLUMNS.users;
      if (allowed) {
        payload = Object.fromEntries(
          Object.entries(payload).filter(([k]) => allowed.includes(k))
        );
      }

      const { error } = await supabase
        .from('users')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error('[Supabase] Error saving user account:', error.message);
      }
    } catch (err) {
      console.warn('[Supabase] Exception saving user account:', err);
    }
  }

  return savedLocal;
}

export function getCachedUsers() {
  return localDb.getCachedUsers();
}

/**
 * Upload static assets (Logos, Photos, Avatars) directly to Supabase S3 Storage Bucket
 * Bucket: 'pos-assets'
 * Returns: { success: true, url: publicUrl, path: storagePath }
 */
export async function uploadAsset(fileOrBlob, customPath = null, bucket = 'pos-assets') {
  if (!isSupabaseConfigured || !supabase || !navigator.onLine) {
    return { success: false, error: 'Supabase offline or not configured' };
  }

  try {
    const ext = fileOrBlob.name ? fileOrBlob.name.split('.').pop() : 'png';
    const filePath = customPath || `assets/${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${ext}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileOrBlob, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.warn('[Supabase Storage] Upload error:', error);
      return { success: false, error: error.message };
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      success: true,
      path: data.path,
      url: publicUrlData.publicUrl,
    };
  } catch (err) {
    console.warn('[Supabase Storage] Exception during upload:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Remove an asset from Supabase Storage
 */
export async function deleteAsset(filePath, bucket = 'pos-assets') {
  if (!isSupabaseConfigured || !supabase || !navigator.onLine) return false;
  try {
    const { error } = await supabase.storage.from(bucket).remove([filePath]);
    return !error;
  } catch (err) {
    console.warn('[Supabase Storage] Delete error:', err);
    return false;
  }
}

export function openDB() {
  return localDb.openDB();
}

/**
 * Push all local IndexedDB tables to Supabase Cloud
 */
export async function syncLocalDataToCloud() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured yet. Please configure your Project URL and Anon Key.');
  }

  const results = {
    settings: 0,
    companies: 0,
    products: 0,
    shops: 0,
    bills: 0,
    users: 0,
  };

  const stores = ['settings', 'companies', 'products', 'shops', 'bills', 'users'];
  for (const storeName of stores) {
    try {
      const items = await localDb.getAllItems(storeName);
      if (items && items.length > 0) {
        for (const item of items) {
          await setItem(storeName, item);
        }
        results[storeName] = items.length;
      }
    } catch (e) {
      console.error(`Error syncing ${storeName} to Supabase:`, e);
    }
  }

  return results;
}

/**
 * Realtime Subscriptions Handler
 * Listens for live changes made across other devices
 */
export function subscribeToRealtime(onTableChange) {
  if (!isSupabaseConfigured || !supabase) return () => {};

  const channel = supabase
    .channel('pos-realtime')
    .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
      if (onTableChange) {
        onTableChange(payload.table, payload.eventType, toCamelCase(payload.new || payload.old));
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export {
  getSupabaseCredentials,
  configureSupabase,
  testSupabaseConnection,
  isSupabaseConfigured,
} from './supabaseClient';

