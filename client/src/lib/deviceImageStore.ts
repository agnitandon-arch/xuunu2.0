const DB_NAME = "xuunu-device-images";
const STORE_NAME = "images";
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

export const saveDeviceImage = async (key: string, dataUrl: string | null) => {
  if (!dataUrl || !dataUrl.startsWith("data:")) return;
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(dataUrl, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Failed to save image"));
    });
  } catch (error) {
    console.warn("Device image save failed:", error);
  }
};

export const getDeviceImage = async (key: string) => {
  try {
    const db = await openDatabase();
    return await new Promise<string | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve((request.result as string) || null);
      request.onerror = () => reject(request.error || new Error("Failed to read image"));
    });
  } catch (error) {
    console.warn("Device image read failed:", error);
    return null;
  }
};
