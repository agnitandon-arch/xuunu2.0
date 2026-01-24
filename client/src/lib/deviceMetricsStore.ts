const DB_NAME = "xuunu-device-metrics";
const STORE_NAME = "metrics";
const DB_VERSION = 1;

const openDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB"));
  });

export const saveDeviceMetric = async (key: string, value: unknown) => {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Failed to save metrics"));
    });
  } catch (error) {
    console.warn("Device metrics save failed:", error);
  }
};

export const getDeviceMetric = async <T = unknown>(key: string): Promise<T | null> => {
  try {
    const db = await openDatabase();
    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve((request.result as T) ?? null);
      request.onerror = () => reject(request.error || new Error("Failed to read metrics"));
    });
  } catch (error) {
    console.warn("Device metrics read failed:", error);
    return null;
  }
};
