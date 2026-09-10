/**
 * Layanan Penyimpanan Dokumen Sertifikat Aset
 * Menggunakan IndexedDB untuk menangani berkas PDF dan Gambar (hingga puluhan MB)
 * secara aman dan efisien di peramban, dengan metadata yang tersinkronisasi ke AssetItem.
 */

const DB_NAME = 'pln_sertifikasi_documents_db';
const DB_VERSION = 1;
const STORE_NAME = 'certificate_files';

export interface StoredCertificateDoc {
  assetId: string;
  noSertifikat: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  dataUrl: string; // Base64 data URL atau link URL
  uploadedAt: string;
}

let dbInstance: IDBDatabase | null = null;

async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB tidak didukung pada lingkungan ini'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'assetId' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error || new Error('Gagal membuka database dokumen'));
    };
  });
}

/**
 * Menyimpan dokumen sertifikat ke IndexedDB
 */
export async function saveCertificateDocument(
  assetId: string,
  noSertifikat: string,
  file: File | { name: string; type: string; size: number; dataUrl: string }
): Promise<StoredCertificateDoc> {
  let dataUrl = '';
  let fileName = '';
  let fileType = '';
  let fileSize = 0;

  if (file instanceof File) {
    fileName = file.name;
    fileType = file.type || 'application/pdf';
    fileSize = file.size;
    dataUrl = await fileToDataUrl(file);
  } else {
    fileName = file.name;
    fileType = file.type;
    fileSize = file.size;
    dataUrl = file.dataUrl;
  }

  const record: StoredCertificateDoc = {
    assetId,
    noSertifikat,
    fileName,
    fileType,
    fileSize,
    dataUrl,
    uploadedAt: new Date().toISOString(),
  };

  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const putRequest = store.put(record);

      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    });
  } catch (err) {
    console.warn('Gagal menyimpan dokumen ke IndexedDB, mencoba fallback localStorage:', err);
    // Fallback simpan metadata ke localStorage (jika file kecil)
    try {
      if (dataUrl.length < 500000) {
        localStorage.setItem(`cert_doc_${assetId}`, JSON.stringify(record));
      }
    } catch {
      // Abaikan jika localStorage penuh
    }
  }

  return record;
}

/**
 * Mengambil dokumen sertifikat dari IndexedDB berdasarkan assetId
 */
export async function getCertificateDocument(assetId: string): Promise<StoredCertificateDoc | null> {
  try {
    const db = await getDB();
    return await new Promise<StoredCertificateDoc | null>((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(assetId);

      getRequest.onsuccess = () => {
        resolve(getRequest.result || null);
      };
      getRequest.onerror = () => {
        resolve(null);
      };
    });
  } catch {
    // Fallback localStorage
    try {
      const local = localStorage.getItem(`cert_doc_${assetId}`);
      if (local) return JSON.parse(local);
    } catch {
      return null;
    }
    return null;
  }
}

/**
 * Menghapus dokumen sertifikat dari IndexedDB
 */
export async function deleteCertificateDocument(assetId: string): Promise<void> {
  try {
    const db = await getDB();
    await new Promise<void>((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const delRequest = store.delete(assetId);
      delRequest.onsuccess = () => resolve();
      delRequest.onerror = () => resolve();
    });
  } catch {
    // ignore
  }

  try {
    localStorage.removeItem(`cert_doc_${assetId}`);
  } catch {
    // ignore
  }
}

/**
 * Helper mengonversi File menjadi Data URL Base64
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Format ukuran file (Bytes -> KB / MB)
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
