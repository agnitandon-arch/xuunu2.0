const DB_NAME = "xuunu-device-feed";
const STORE_NAME = "feed";
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

export const saveDeviceFeedItems = async (key: string, items: unknown[]) => {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(items, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Failed to save feed"));
    });
  } catch (error) {
    console.warn("Device feed save failed:", error);
  }
};

export const getDeviceFeedItems = async (key: string) => {
  try {
    const db = await openDatabase();
    return await new Promise<unknown[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve((request.result as unknown[]) || []);
      request.onerror = () => reject(request.error || new Error("Failed to read feed"));
    });
  } catch (error) {
    console.warn("Device feed read failed:", error);
    return [];
  }
};
