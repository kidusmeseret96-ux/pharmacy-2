import type {
  ClinicSettings,
  Drug,
  DrugKind,
  OfflineQueuedPunch,
  OfflineQueuedSale,
  ParkedCart,
} from '../types/pharmacy.ts';

const DB_NAME = 'apotheca_rx_offline_v1';
const DB_VERSION = 1;
const STORE_KV = 'kv';
const STORE_SALES = 'pending_sales';
const STORE_PUNCHES = 'pending_punches';
const STORE_PARKED = 'parked_carts';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB'));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_KV)) {
        db.createObjectStore(STORE_KV);
      }
      if (!db.objectStoreNames.contains(STORE_SALES)) {
        db.createObjectStore(STORE_SALES, { keyPath: 'clientSyncId' });
      }
      if (!db.objectStoreNames.contains(STORE_PUNCHES)) {
        db.createObjectStore(STORE_PUNCHES, { keyPath: 'clientSyncId' });
      }
      if (!db.objectStoreNames.contains(STORE_PARKED)) {
        db.createObjectStore(STORE_PARKED, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

async function idbGet<T>(storeName: string, key: string): Promise<T | undefined> {
  try {
    const db = await openDb();
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return undefined;
  }
}

async function idbPut(storeName: string, value: unknown, key?: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = key !== undefined ? store.put(value, key) : store.put(value);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Graceful no-op if IDB disabled
  }
}

async function idbGetAll<T>(storeName: string): Promise<T[]> {
  try {
    const db = await openDb();
    return await new Promise<T[]>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve((req.result as T[]) ?? []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

async function idbDelete(storeName: string, key: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const req = tx.objectStore(storeName).delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Graceful no-op
  }
}

export const offlineStore = {
  async saveCatalogSnapshot(snapshot: {
    drugs: Drug[];
    drugKinds: DrugKind[];
    settings: ClinicSettings;
  }): Promise<void> {
    await idbPut(STORE_KV, snapshot, 'catalog_snapshot');
  },

  async loadCatalogSnapshot(): Promise<{
    drugs: Drug[];
    drugKinds: DrugKind[];
    settings: ClinicSettings;
  } | null> {
    return (await idbGet(STORE_KV, 'catalog_snapshot')) ?? null;
  },

  async enqueueSale(sale: OfflineQueuedSale): Promise<void> {
    await idbPut(STORE_SALES, sale);
  },

  async getQueuedSales(): Promise<OfflineQueuedSale[]> {
    const items = await idbGetAll<OfflineQueuedSale>(STORE_SALES);
    return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  async removeQueuedSale(clientSyncId: string): Promise<void> {
    await idbDelete(STORE_SALES, clientSyncId);
  },

  async enqueuePunch(punch: OfflineQueuedPunch): Promise<void> {
    await idbPut(STORE_PUNCHES, punch);
  },

  async getQueuedPunches(): Promise<OfflineQueuedPunch[]> {
    const items = await idbGetAll<OfflineQueuedPunch>(STORE_PUNCHES);
    return items.sort((a, b) => a.offlineCreatedAt.localeCompare(b.offlineCreatedAt));
  },

  async removeQueuedPunch(clientSyncId: string): Promise<void> {
    await idbDelete(STORE_PUNCHES, clientSyncId);
  },

  async saveParkedCart(cart: ParkedCart): Promise<void> {
    await idbPut(STORE_PARKED, cart);
  },

  async getParkedCarts(): Promise<ParkedCart[]> {
    const carts = await idbGetAll<ParkedCart>(STORE_PARKED);
    return carts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async removeParkedCart(id: string): Promise<void> {
    await idbDelete(STORE_PARKED, id);
  },
};
