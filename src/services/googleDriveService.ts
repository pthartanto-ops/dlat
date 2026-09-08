import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { DriveFileItem, DriveUserInfo, AssetItem, CertificationTargetSettings } from '../types';

export const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.activity',
  'https://www.googleapis.com/auth/drive.activity.readonly',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.apps.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.install',
  'https://www.googleapis.com/auth/drive.meet.readonly',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.scripts',
];

// Configure GoogleAuthProvider with Google Drive scopes
const googleDriveProvider = new GoogleAuthProvider();
GOOGLE_DRIVE_SCOPES.forEach((scope) => {
  googleDriveProvider.addScope(scope);
});
// Request offline access prompt to ensure permissions are granted
googleDriveProvider.setCustomParameters({
  prompt: 'consent',
});

// Flag to track sign-in state
let isSigningIn = false;
// In-memory token caching per SKILL.md guidelines (do NOT store in localStorage or sessionStorage)
let cachedAccessToken: string | null = null;

/**
 * Initialize Google Drive auth listener
 */
export const initGoogleDriveAuth = (
  onSuccess?: (user: User, token: string) => void,
  onFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onSuccess) onSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onFailure) onFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onFailure) onFailure();
    }
  });
};

/**
 * Perform sign-in with Google Drive scopes
 */
export const signInWithGoogleDrive = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleDriveProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan Access Token Google Drive dari Firebase Auth');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Drive sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Get current in-memory access token
 */
export const getDriveAccessToken = (): string | null => {
  return cachedAccessToken;
};

/**
 * Set cached access token in memory
 */
export const setDriveAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

/**
 * Disconnect/Sign out from Google Drive
 */
export const signOutGoogleDrive = async () => {
  try {
    await auth.signOut();
  } finally {
    cachedAccessToken = null;
  }
};

/**
 * Fetch Google Drive user details and storage quota
 */
export const fetchDriveAbout = async (accessToken: string): Promise<DriveUserInfo | null> => {
  if (accessToken.startsWith('demo-')) {
    return {
      displayName: 'Demo Akun PLN UPT Madiun',
      emailAddress: 'demo.pertanahan@pln.co.id',
      limit: '161061273600', // 150 GB
      usage: '45097156608', // 42 GB
      usageInDrive: '45097156608',
      usageInDriveTrash: '1073741824',
    };
  }

  try {
    const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user,storageQuota', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Google Drive API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return {
      displayName: data.user?.displayName,
      emailAddress: data.user?.emailAddress,
      photoLink: data.user?.photoLink,
      limit: data.storageQuota?.limit,
      usage: data.storageQuota?.usage,
      usageInDrive: data.storageQuota?.usageInDrive,
      usageInDriveTrash: data.storageQuota?.usageInDriveTrash,
    };
  } catch (error) {
    console.error('Failed to fetch Drive about information:', error);
    return null;
  }
};

const DEFAULT_APP_FOLDER_NAME = 'SIMAS-TANAH PLN UPT Madiun';

/**
 * Find or create the dedicated app folder in Google Drive
 */
export const getOrCreateAppFolder = async (
  accessToken: string,
  folderName: string = DEFAULT_APP_FOLDER_NAME
): Promise<string> => {
  if (accessToken.startsWith('demo-')) {
    return 'demo-folder-simas-tanah-upt-madiun';
  }

  try {
    // 1. Check if folder already exists
    const safeName = folderName.replace(/'/g, "\\'");
    const query = `name = '${safeName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
      }
    }

    // 2. Create folder if not found
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        description: 'Folder penyimpanan dokumen sertifikasi & backup aset tanah SIMAS-TANAH PLN UPT Madiun',
      }),
    });

    if (!createRes.ok) {
      throw new Error('Gagal membuat folder di Google Drive');
    }

    const newFolder = await createRes.json();
    return newFolder.id;
  } catch (error) {
    console.error('Error finding/creating app folder in Google Drive:', error);
    throw error;
  }
};

/**
 * List files in Google Drive folder or matching search
 */
export const listDriveFiles = async (
  accessToken: string,
  folderId?: string,
  searchQuery?: string
): Promise<DriveFileItem[]> => {
  if (accessToken.startsWith('demo-')) {
    const demoFiles: DriveFileItem[] = [
      {
        id: 'demo-f-1',
        name: 'BACKUP_SIMAS_TANAH_UPT_MADIUN_2024.json',
        mimeType: 'application/json',
        size: '284500',
        modifiedTime: new Date(Date.now() - 3600000 * 2).toISOString(),
        webViewLink: 'https://drive.google.com',
        description: 'Salinan cadangan database SIMAS-TANAH 323 persil',
      },
      {
        id: 'demo-f-2',
        name: 'PETA_BIDANG_GI_MANISREJO_MADIUN.pdf',
        mimeType: 'application/pdf',
        size: '4820000',
        modifiedTime: new Date(Date.now() - 86400000 * 3).toISOString(),
        webViewLink: 'https://drive.google.com',
        description: 'Peta bidang tanah dan batas kadastral GI Manisrejo',
      },
      {
        id: 'demo-f-3',
        name: 'SERTIFIKAT_HP_TOWER_34_SUTT_MADIUN.pdf',
        mimeType: 'application/pdf',
        size: '2150000',
        modifiedTime: new Date(Date.now() - 86400000 * 7).toISOString(),
        webViewLink: 'https://drive.google.com',
        description: 'Scan Sertifikat Hak Pakai BPN Kab. Madiun',
      },
      {
        id: 'demo-f-4',
        name: 'DOKUMEN_ALAS_HAK_SPH_LENGKAP_2024.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: '1250000',
        modifiedTime: new Date(Date.now() - 86400000 * 14).toISOString(),
        webViewLink: 'https://drive.google.com',
        description: 'Rekapitulasi berkas SPH dan persil tanah UPT',
      },
    ];
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return demoFiles.filter(
        (f) => f.name.toLowerCase().includes(q) || (f.description && f.description.toLowerCase().includes(q))
      );
    }
    return demoFiles;
  }

  try {
    const qParts: string[] = ['trashed = false'];

    if (folderId) {
      qParts.push(`'${folderId}' in parents`);
    }

    if (searchQuery && searchQuery.trim()) {
      const safeQuery = searchQuery.trim().replace(/'/g, "\\'");
      qParts.push(`(name contains '${safeQuery}' or fullText contains '${safeQuery}')`);
    }

    const finalQuery = qParts.join(' and ');
    const fields = 'files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,iconLink,thumbnailLink,description)';
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      finalQuery
    )}&fields=${encodeURIComponent(fields)}&orderBy=modifiedTime desc&pageSize=100`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gagal mengambil daftar file Drive (${res.status})`);
    }

    const data = await res.json();
    return (data.files || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      size: f.size,
      modifiedTime: f.modifiedTime,
      webViewLink: f.webViewLink,
      webContentLink: f.webContentLink,
      iconLink: f.iconLink,
      thumbnailLink: f.thumbnailLink,
      description: f.description,
    }));
  } catch (error) {
    console.error('Error listing Drive files:', error);
    throw error;
  }
};

/**
 * Upload a file directly to Google Drive
 */
export const uploadFileToDrive = async (
  accessToken: string,
  file: File,
  folderId?: string,
  description?: string
): Promise<DriveFileItem> => {
  try {
    const metadata: Record<string, any> = {
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
    };

    if (folderId) {
      metadata.parents = [folderId];
    }
    if (description) {
      metadata.description = description;
    }

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const reader = new FileReader();
    const fileDataPromise = new Promise<ArrayBuffer>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });

    const fileBuffer = await fileDataPromise;
    const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
      metadata
    )}\r\n`;

    const preambleBytes = new TextEncoder().encode(metadataPart);
    const mediaHeader = `Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`;
    const mediaHeaderBytes = new TextEncoder().encode(delimiter + mediaHeader);
    const closingBytes = new TextEncoder().encode(closeDelimiter);

    const totalLength =
      preambleBytes.byteLength + mediaHeaderBytes.byteLength + fileBuffer.byteLength + closingBytes.byteLength;
    const combinedBuffer = new Uint8Array(totalLength);

    let offset = 0;
    combinedBuffer.set(preambleBytes, offset);
    offset += preambleBytes.byteLength;
    combinedBuffer.set(mediaHeaderBytes, offset);
    offset += mediaHeaderBytes.byteLength;
    combinedBuffer.set(new Uint8Array(fileBuffer), offset);
    offset += fileBuffer.byteLength;
    combinedBuffer.set(closingBytes, offset);

    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink,webContentLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: combinedBuffer,
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gagal mengunggah file ke Google Drive (${res.status})`);
    }

    const result = await res.json();
    return {
      id: result.id,
      name: result.name,
      mimeType: result.mimeType,
      size: result.size,
      modifiedTime: result.modifiedTime,
      webViewLink: result.webViewLink,
      webContentLink: result.webContentLink,
      description,
    };
  } catch (error) {
    console.error('Error uploading file to Drive:', error);
    throw error;
  }
};

/**
 * Upload JSON / Excel Backup to Google Drive
 */
export const backupAssetsToGoogleDrive = async (
  accessToken: string,
  assets: AssetItem[],
  targetSettings: CertificationTargetSettings
): Promise<DriveFileItem> => {
  const folderId = await getOrCreateAppFolder(accessToken);
  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `BACKUP_SIMAS_TANAH_UPT_MADIUN_${dateStr}.json`;

  const payload = {
    exportedAt: now.toISOString(),
    application: 'SIMAS-TANAH UPT Madiun',
    totalAssets: assets.length,
    targetSettings,
    data: assets,
  };

  const jsonBlob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const file = new File([jsonBlob], fileName, { type: 'application/json' });

  return uploadFileToDrive(
    accessToken,
    file,
    folderId,
    `Backup otomatis data ${assets.length} persil aset tanah SIMAS-TANAH PLN UPT Madiun pada ${now.toLocaleString('id-ID')}`
  );
};

/**
 * Delete a file in Google Drive
 * Note: Must be preceded by user confirmation dialog per SKILL.md rules!
 */
export const deleteFileFromDrive = async (accessToken: string, fileId: string): Promise<boolean> => {
  if (accessToken.startsWith('demo-')) {
    return true;
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gagal menghapus file dari Google Drive (${res.status})`);
  }

  return true;
};

/**
 * Read content of a JSON or text file from Google Drive
 */
export const readDriveFileText = async (accessToken: string, fileId: string): Promise<string> => {
  if (accessToken.startsWith('demo-')) {
    return JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      application: 'SIMAS-TANAH UPT Madiun (Demo Backup)',
      totalAssets: 1,
      data: [
        {
          id: 'DEMO-RESTORED-1',
          namaUnit: 'GI MANISREJO (RESTORED DEMO)',
          kategori: 'GARDU INDUK',
          kabupaten: 'KOTA MADIUN',
          kantahBpn: 'KANTAH KOTA MADIUN',
          tahapanBpn: 16,
          statusSertifikat: 'TERBIT',
          nomorSertifikat: 'HP 0012/MANISREJO',
          luas: 2500,
          tahun: 2024,
        },
      ],
    });
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Gagal membaca konten file dari Google Drive (${res.status})`);
  }

  return res.text();
};
