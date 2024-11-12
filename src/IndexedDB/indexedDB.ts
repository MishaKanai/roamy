export const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("dropbox-file-cache", 1);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files", { keyPath: "filename" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
};

export const storeFileInDB = async (
  filename: string,
  data: string
): Promise<void> => {
  const db = await openDatabase();
  const transaction = db.transaction("files", "readwrite");
  const store = transaction.objectStore("files");

  store.put({
    filename,
    data,
    timestamp: Date.now(),
  });
  transaction.oncomplete = () => db.close();
};

export const getFileFromDB = async (
  filename: string
): Promise<{ data: string } | null> => {
  const db = await openDatabase();
  const transaction = db.transaction("files", "readonly");
  const store = transaction.objectStore("files");

  return new Promise((resolve) => {
    const request = store.get(filename);
    request.onsuccess = () => {
      const result = request.result;
      if (result) {
        resolve({ data: result.data });
      } else {
        resolve(null);
      }
      db.close();
    };
    request.onerror = () => {
      resolve(null);
      db.close();
    };
  });
};
