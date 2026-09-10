import React, { useState, useMemo, useEffect } from 'react';
import { ActiveNavTab, AssetItem, FilterState, UnitSummaryData, CertificationTargetSettings, PicOfficer, CategoryType } from './types';
import { INITIAL_UNIT_SUMMARIES, generateRealisticAssets, DEFAULT_TARGET_SETTINGS, DEFAULT_PIC_OFFICERS } from './data/mockData';
import { Header } from './components/Header';
import { UptSummaryTable } from './components/UptSummaryTable';
import { AssetFilterBar } from './components/AssetFilterBar';
import { AssetDetailTable } from './components/AssetDetailTable';
import { AssetDetailModal } from './components/AssetDetailModal';
import { AddAssetModal } from './components/AddAssetModal';
import { ExcelImportModal } from './components/ExcelImportModal';
import { EditAssetModal } from './components/EditAssetModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { ClearAllConfirmModal } from './components/ClearAllConfirmModal';
import { SupabaseModal } from './components/SupabaseModal';
import { CertificateViewerModal } from './components/CertificateViewerModal';
import { recalculateAllUnitSummaries, recalculateAllUltgSummaries } from './utils/excelUtils';
import { normalizeAssetToUpperCase, normalizeAssetsToUpperCase, compareAssetPropertiAsc } from './utils/textUtils';
import {
  fetchAssetsFromApi,
  saveAssetToApi,
  bulkSaveAssetsToApi,
  deleteMultipleAssetsFromApi,
  clearAllAssetsApi,
  seedSampleAssetsApi,
} from './utils/apiClient';
import {
  fetchTargetSettingsFromSupabase,
  saveTargetSettingsToSupabase,
  fetchPicOfficersFromSupabase,
  savePicOfficersToSupabase,
} from './services/supabaseClient';
import { UptDashboardView } from './components/UptDashboardView';
import { UltgDashboardView } from './components/UltgDashboardView';
import { GlobalReportView } from './components/GlobalReportView';
import { BpnReportView } from './components/BpnReportView';
import { AllAssetsMapView } from './components/AllAssetsMapView';
import { AdminMenuView } from './components/AdminMenuView';
import { GoogleDriveView } from './components/GoogleDriveView';
import {
  initGoogleDriveAuth,
  setDriveAccessToken,
  getDriveAccessToken,
} from './services/googleDriveService';
import { User } from 'firebase/auth';
import { ShieldCheck, Info, Check, RefreshCw, FileSpreadsheet, PlusCircle, RotateCcw, AlertCircle, Database } from 'lucide-react';

const INITIAL_FILTER: FilterState = {
  search: '',
  upt: 'ALL',
  ultg: 'ALL',
  penghantar: 'ALL',
  desa: 'ALL',
  kecamatan: 'ALL',
  bpn: 'ALL',
  kategori: 'ALL',
  kendala: 'ALL',
  tahapan: 'ALL',
  alasHak: 'ALL',
  tahun: 'ALL',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('HOME');
  const [unitSummaries, setUnitSummaries] = useState<UnitSummaryData[]>(() => recalculateAllUnitSummaries([]));
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [selectedGlobalYear, setSelectedGlobalYear] = useState<string>('ALL');

  // Target Settings & PIC Master Data State
  const [targetSettings, setTargetSettings] = useState<CertificationTargetSettings>(() => {
    try {
      const saved = localStorage.getItem('pln_target_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse target settings:', e);
    }
    return DEFAULT_TARGET_SETTINGS;
  });

  const [picOfficers, setPicOfficers] = useState<PicOfficer[]>(() => {
    try {
      const saved = localStorage.getItem('pln_pic_officers');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse pic officers:', e);
    }
    return DEFAULT_PIC_OFFICERS;
  });

  const [filter, setFilter] = useState<FilterState>(INITIAL_FILTER);
  const [selectedUnitTable, setSelectedUnitTable] = useState<string>('TOTAL KESELURUHAN');
  const [selectedStageFilter, setSelectedStageFilter] = useState<number | null>(null);

  // Modals and selection
  const [selectedAssetDetail, setSelectedAssetDetail] = useState<AssetItem | null>(null);
  const [editingAsset, setEditingAsset] = useState<AssetItem | null>(null);
  const [certificateViewerAsset, setCertificateViewerAsset] = useState<AssetItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState<boolean>(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState<boolean>(false);
  const [itemsToDelete, setItemsToDelete] = useState<AssetItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Google Drive Authentication & Integration State (In-Memory Token Cache)
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);

  // Initialize Google Drive Auth Listener
  useEffect(() => {
    const unsubscribe = initGoogleDriveAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleAccessToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleAccessToken(null);
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleGoogleAuthSuccess = (user: User, token: string) => {
    setGoogleUser(user);
    setGoogleAccessToken(token);
    setDriveAccessToken(token);
    showToast(`Google Drive terhubung: ${user.email}`);
  };

  const handleGoogleSignOut = () => {
    setGoogleUser(null);
    setGoogleAccessToken(null);
    setDriveAccessToken(null);
    showToast('Koneksi Google Drive diputuskan.');
  };

  const handleRestoreFromDrive = async (restoredAssets: AssetItem[], newSettings?: CertificationTargetSettings) => {
    if (Array.isArray(restoredAssets) && restoredAssets.length > 0) {
      const sanitizedAssets = normalizeAssetsToUpperCase(restoredAssets);
      setAssets(sanitizedAssets);
      if (newSettings) {
        setTargetSettings(newSettings);
        try {
          localStorage.setItem('pln_target_settings', JSON.stringify(newSettings));
        } catch (e) {
          console.warn('Failed to persist target settings:', e);
        }
      }
      setUnitSummaries(recalculateAllUnitSummaries(sanitizedAssets, undefined, (newSettings || targetSettings).categoryTargets));
      showToast(`Sukses memulihkan ${sanitizedAssets.length} data persil dari Google Drive!`);
      try {
        await bulkSaveAssetsToApi(sanitizedAssets);
      } catch (e) {
        console.warn('Sync restored assets to API error:', e);
      }
    }
  };

  // Load assets & cloud target settings from database on startup
  useEffect(() => {
    let isSubscribed = true;
    setIsLoadingData(true);
    Promise.all([
      fetchAssetsFromApi(),
      fetchTargetSettingsFromSupabase(),
      fetchPicOfficersFromSupabase(),
    ])
      .then(([loadedAssets, remoteTargetSettings, remotePicOfficers]) => {
        if (!isSubscribed) return;
        const validList = normalizeAssetsToUpperCase(Array.isArray(loadedAssets) ? loadedAssets : []);
        setAssets(validList);

        let activeTargets = targetSettings;
        if (remoteTargetSettings) {
          const sumUpt = remoteTargetSettings.categoryTargets
            ? Object.values(remoteTargetSettings.categoryTargets).reduce((acc, curr) => acc + (Number(curr) || 0), 0)
            : (remoteTargetSettings.uptTarget || 0);
          activeTargets = {
            ...remoteTargetSettings,
            uptTarget: sumUpt,
          };
          setTargetSettings(activeTargets);
        }
        if (remotePicOfficers) {
          setPicOfficers(remotePicOfficers);
        }

        setUnitSummaries(recalculateAllUnitSummaries(validList, undefined, activeTargets.categoryTargets));
      })
      .catch((err) => {
        console.warn('Perhatian saat memuat aset/target:', err);
        if (isSubscribed) {
          setAssets([]);
          setUnitSummaries(recalculateAllUnitSummaries([], undefined, targetSettings.categoryTargets));
        }
      })
      .finally(() => {
        if (isSubscribed) setIsLoadingData(false);
      });
    return () => {
      isSubscribed = false;
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Reload all assets and target settings helper
  const reloadAllAssets = async () => {
    setIsLoadingData(true);
    try {
      const [loadedAssets, remoteTargetSettings, remotePicOfficers] = await Promise.all([
        fetchAssetsFromApi(),
        fetchTargetSettingsFromSupabase(),
        fetchPicOfficersFromSupabase(),
      ]);
      const validList = normalizeAssetsToUpperCase(Array.isArray(loadedAssets) ? loadedAssets : []);
      setAssets(validList);

      let activeTargets = targetSettings;
      if (remoteTargetSettings) {
        const sumUpt = remoteTargetSettings.categoryTargets
          ? Object.values(remoteTargetSettings.categoryTargets).reduce((acc, curr) => acc + (Number(curr) || 0), 0)
          : (remoteTargetSettings.uptTarget || 0);
        activeTargets = {
          ...remoteTargetSettings,
          uptTarget: sumUpt,
        };
        setTargetSettings(activeTargets);
      }
      if (remotePicOfficers) {
        setPicOfficers(remotePicOfficers);
      }

      setUnitSummaries(recalculateAllUnitSummaries(validList, undefined, activeTargets.categoryTargets));
    } catch (err) {
      console.warn('Perhatian saat memuat aset:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Clear all data handler
  const handleConfirmClearAll = async () => {
    try {
      await clearAllAssetsApi();
      setAssets([]);
      setUnitSummaries(recalculateAllUnitSummaries([], undefined, targetSettings.categoryTargets));
      setSelectedIds([]);
      setSelectedAssetDetail(null);
      setIsClearAllModalOpen(false);
      showToast('Seluruh data aset persil berhasil dibersihkan dari database.');
    } catch (err: any) {
      console.error('Failed to clear database:', err);
      showToast('Gagal membersihkan data dari database.');
    }
  };

  // Restore sample data handler
  const handleRestoreSampleData = async () => {
    try {
      setIsLoadingData(true);
      await seedSampleAssetsApi();
      const freshData = await fetchAssetsFromApi();
      setAssets(freshData);
      setUnitSummaries(recalculateAllUnitSummaries(freshData, undefined, targetSettings.categoryTargets));
      showToast(`Berhasil memuat ${freshData.length} data sampel PLN.`);
    } catch (err: any) {
      console.error('Failed to load sample assets:', err);
      showToast('Gagal memuat data sampel.');
    } finally {
      setIsLoadingData(false);
    }
  };

  // Derive unique dropdown options from assets
  const uniquePenghantar = useMemo(() => {
    return Array.from(new Set(assets.map((a) => a.penghantar))).sort();
  }, [assets]);

  const uniqueDesa = useMemo(() => {
    return Array.from(new Set(assets.map((a) => a.desa))).sort();
  }, [assets]);

  const uniqueKecamatan = useMemo(() => {
    return Array.from(new Set(assets.map((a) => a.kecamatan))).sort();
  }, [assets]);

  const uniqueBpn = useMemo(() => {
    return Array.from(new Set(assets.map((a) => a.bpn))).sort();
  }, [assets]);

  const uniqueKategori = useMemo(() => {
    const defaultCats: CategoryType[] = [
      'TOWER',
      'GARDU INDUK',
      'RUMAH DINAS',
      'TANAH KOSONG',
      'KANTOR',
      'EX. GARDU INDUK',
    ];
    const fromAssets = assets.map((a) => a.kategori).filter(Boolean) as CategoryType[];
    return Array.from(new Set([...defaultCats, ...fromAssets])).sort();
  }, [assets]);

  const uniqueKendala = useMemo(() => {
    const list = assets
      .map((a) => a.kendala)
      .filter((k) => k && !k.includes('Lancar') && !k.includes('Tersimpan'));
    return Array.from(new Set(list)).sort();
  }, [assets]);

  const uniqueTahun = useMemo(() => {
    const list = assets
      .map((a) => a.tahun)
      .filter((t): t is number => typeof t === 'number' && t > 0);
    return Array.from(new Set<number>(list)).sort((a: number, b: number) => b - a);
  }, [assets]);

  const availableYears = useMemo(() => {
    const set = new Set<number>([2021, 2022, 2023, 2024, 2025]);
    uniqueTahun.forEach((y) => set.add(y));
    return Array.from(set).sort((a: number, b: number) => b - a);
  }, [uniqueTahun]);

  const handleSelectGlobalYear = (yr: string) => {
    setSelectedGlobalYear(yr);
    setFilter((prev) => ({ ...prev, tahun: yr }));
    showToast(
      yr === 'ALL'
        ? 'Filter disetel: Menampilkan seluruh tahun'
        : yr === 'EMPTY'
        ? 'Filter disetel: Menampilkan data tanpa tahun'
        : `Filter disetel: Menampilkan data Tahun Anggaran ${yr}`
    );
  };

  // Handle changing filters
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilter((prev) => ({ ...prev, [key]: value }));
    if (key === 'tahun') {
      setSelectedGlobalYear(value);
    }
  };

  const handleResetFilters = () => {
    setFilter(INITIAL_FILTER);
    setSelectedGlobalYear('ALL');
    setSelectedStageFilter(null);
    setSelectedUnitTable('TOTAL KESELURUHAN');
    showToast('Filter telah direset ke tampilan default');
  };

  // Clicking a jenis aset row in Summary Table
  const handleSelectUnitRow = (categoryName: string) => {
    setSelectedUnitTable(categoryName);
    if (categoryName === 'TOTAL KESELURUHAN' || categoryName === 'TOTAL UPT MADIUN') {
      setFilter((prev) => ({ ...prev, kategori: 'ALL' }));
    } else {
      setFilter((prev) => ({ ...prev, kategori: categoryName }));
    }
    showToast(`Memfilter data detail persil untuk jenis aset: ${categoryName}`);
  };

  // Clicking a specific stage column in UPT Summary Table
  const handleSelectStageFilter = (stage: number | null) => {
    setSelectedStageFilter(stage);
    if (stage !== null) {
      showToast(`Memfilter persil pada Tahap BPN ke-${stage}`);
    } else {
      showToast('Filter tahapan dinonaktifkan');
    }
  };

  // Filtered Assets list
  const filteredAssets = useMemo(() => {
    return assets.filter((item) => {
      // Free search
      if (filter.search) {
        const query = filter.search.toLowerCase();
        const matchSearch =
          item.id.toLowerCase().includes(query) ||
          item.penghantar.toLowerCase().includes(query) ||
          item.asetLapangan.toLowerCase().includes(query) ||
          item.desa.toLowerCase().includes(query) ||
          item.kecamatan.toLowerCase().includes(query) ||
          item.bpn.toLowerCase().includes(query) ||
          item.persil.toLowerCase().includes(query) ||
          item.noSertifikat.toLowerCase().includes(query) ||
          item.nib.toLowerCase().includes(query) ||
          item.asset.toLowerCase().includes(query) ||
          item.kendala.toLowerCase().includes(query);

        if (!matchSearch) return false;
      }

      // Unit / ULTG
      if (filter.upt !== 'ALL' && item.upt !== filter.upt) return false;
      if (filter.ultg !== 'ALL' && item.ultg !== filter.ultg) return false;

      // Penghantar
      if (filter.penghantar !== 'ALL' && item.penghantar !== filter.penghantar) return false;

      // Desa & Kecamatan
      if (filter.desa !== 'ALL' && item.desa !== filter.desa) return false;
      if (filter.kecamatan !== 'ALL' && item.kecamatan !== filter.kecamatan) return false;

      // BPN
      if (filter.bpn !== 'ALL' && item.bpn !== filter.bpn) return false;

      // Kategori
      if (filter.kategori !== 'ALL' && item.kategori !== filter.kategori) return false;

      // Kendala
      if (filter.kendala === 'LANCAR') {
        if (!item.kendala.includes('Lancar') && !item.kendala.includes('Tersimpan')) return false;
      } else if (filter.kendala === 'KENDALA') {
        if (item.kendala.includes('Lancar') || item.kendala.includes('Tersimpan')) return false;
      } else if (filter.kendala !== 'ALL') {
        if (item.kendala !== filter.kendala) return false;
      }

      // Tahapan quick filter
      if (filter.tahapan === 'TERBIT') {
        if (item.statusDisplay !== 'TERBIT' && item.tahapan < 17) return false;
      } else if (filter.tahapan === 'PROSES') {
        if (item.statusDisplay === 'TERBIT' || item.tahapan >= 17) return false;
      }

      // Alas Hak
      if (filter.alasHak !== 'ALL' && item.alasHak !== filter.alasHak) return false;

      // Dynamic Year Filter
      if (filter.tahun && filter.tahun !== 'ALL') {
        if (filter.tahun === 'EMPTY') {
          if (item.tahun && item.tahun > 0) return false;
        } else if (String(item.tahun) !== filter.tahun) {
          return false;
        }
      }

      // Stage Click filter
      if (selectedStageFilter !== null) {
        if (item.tahapan !== selectedStageFilter) return false;
      }

      return true;
    }).sort(compareAssetPropertiAsc);
  }, [assets, filter, selectedStageFilter]);

  // Selection toggle
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredAssets.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAssets.map((a) => a.id));
    }
  };

  // Save target settings & recalculate summaries
  const handleSaveTargetSettings = (newSettings: CertificationTargetSettings) => {
    // Target UPT merupakan jumlah semua target berdasarkan kategori aset
    const totalUpt = Object.values(newSettings.categoryTargets || {}).reduce(
      (acc, curr) => acc + (Number(curr) || 0),
      0
    );
    const finalizedSettings: CertificationTargetSettings = {
      ...newSettings,
      uptTarget: totalUpt,
    };
    setTargetSettings(finalizedSettings);
    try {
      localStorage.setItem('pln_target_settings', JSON.stringify(finalizedSettings));
    } catch (e) {
      console.error(e);
    }
    saveTargetSettingsToSupabase(finalizedSettings).catch((err) => {
      console.warn('Gagal sinkron target ke Supabase:', err);
    });
    setUnitSummaries(recalculateAllUnitSummaries(assets, undefined, finalizedSettings.categoryTargets));
    showToast(`Target sertifikasi berhasil disimpan! Total target UPT (${totalUpt} persil) tersinkronisasi ke cloud database.`);
  };

  // Save PIC officers list
  const handleSavePicOfficers = (newOfficers: PicOfficer[]) => {
    setPicOfficers(newOfficers);
    try {
      localStorage.setItem('pln_pic_officers', JSON.stringify(newOfficers));
    } catch (e) {
      console.error(e);
    }
    savePicOfficersToSupabase(newOfficers).catch((err) => {
      console.warn('Gagal sinkron PIC ke Supabase:', err);
    });
    showToast('Daftar Petugas PIC Pokja Sertifikasi berhasil diperbarui & tersinkronisasi ke cloud!');
  };

  // Update single asset PIC
  const handleUpdateAssetPic = async (assetId: string, newPic: string) => {
    const existing = assets.find((a) => a.id === assetId);
    if (!existing) return;
    const updated = { ...existing, pic: newPic };
    try {
      await saveAssetToApi(updated);
      setAssets((prev) => prev.map((a) => (a.id === assetId ? updated : a)));
      showToast(`PIC untuk ${existing.asetLapangan} berhasil ditugaskan ke: ${newPic}`);
    } catch (err) {
      console.error('Gagal update PIC aset:', err);
      showToast('Gagal memperbarui PIC aset ke server.');
    }
  };

  // Bulk update asset PIC
  const handleBulkUpdateAssetPic = async (assetIds: string[], newPic: string) => {
    const updatedItems = assets
      .filter((a) => assetIds.includes(a.id))
      .map((a) => ({ ...a, pic: newPic }));

    if (updatedItems.length === 0) return;

    try {
      await bulkSaveAssetsToApi(updatedItems);
      const map = new Map(updatedItems.map((a) => [a.id, a]));
      setAssets((prev) => prev.map((a) => map.get(a.id) || a));
      showToast(`Berhasil menugaskan ${updatedItems.length} aset kepada PIC: ${newPic}`);
    } catch (err) {
      console.error('Gagal bulk update PIC:', err);
      showToast('Gagal memperbarui PIC massal ke server.');
    }
  };

  // Add new asset
  const handleAddNewAsset = (newAsset: AssetItem) => {
    const sanitizedAsset = normalizeAssetToUpperCase(newAsset);
    const nextList = [sanitizedAsset, ...assets];
    setAssets(nextList);
    setUnitSummaries(recalculateAllUnitSummaries(nextList, undefined, targetSettings.categoryTargets));
    showToast(`Aset baru ${sanitizedAsset.id} berhasil ditambahkan!`);
    // Sync to database
    saveAssetToApi(sanitizedAsset).catch((err) => {
      console.error('Failed to sync new asset to database:', err);
    });
  };

  // Bulk Import Excel assets
  const handleImportAssets = async (newAssets: AssetItem[], mode: 'append' | 'replace') => {
    const sanitizedNewAssets = normalizeAssetsToUpperCase(newAssets);
    let updatedAssets: AssetItem[] = [];
    if (mode === 'replace') {
      updatedAssets = sanitizedNewAssets;
    } else {
      updatedAssets = [...sanitizedNewAssets, ...assets];
    }
    setAssets(updatedAssets);
    setSelectedIds([]);
    setSelectedAssetDetail(null);

    // Update UPT Summaries
    setUnitSummaries(recalculateAllUnitSummaries(updatedAssets, undefined, targetSettings.categoryTargets));

    if (mode === 'replace') {
      if (sanitizedNewAssets.length === 0) {
        showToast('Database berhasil dikosongkan sesuai berkas Excel kosong.');
      } else {
        showToast(`Berhasil mengganti seluruh database dengan ${sanitizedNewAssets.length} aset dari Excel!`);
      }
      try {
        await clearAllAssetsApi();
        if (sanitizedNewAssets.length > 0) {
          await bulkSaveAssetsToApi(sanitizedNewAssets);
        }
      } catch (err) {
        console.error('Failed to replace assets in database:', err);
      }
    } else {
      showToast(`Berhasil mengimpor ${sanitizedNewAssets.length} aset tanah dari file Excel!`);
      if (sanitizedNewAssets.length > 0) {
        bulkSaveAssetsToApi(sanitizedNewAssets).catch((err) => {
          console.error('Failed to bulk sync assets to database:', err);
        });
      }
    }
  };

  // Update edited asset
  const handleSaveEditedAsset = (updatedAsset: AssetItem) => {
    const sanitizedAsset = normalizeAssetToUpperCase(updatedAsset);
    const updatedAssets = assets.map((a) => (a.id === sanitizedAsset.id ? sanitizedAsset : a));
    setAssets(updatedAssets);
    setUnitSummaries(recalculateAllUnitSummaries(updatedAssets, undefined, targetSettings.categoryTargets));
    if (selectedAssetDetail && selectedAssetDetail.id === sanitizedAsset.id) {
      setSelectedAssetDetail(sanitizedAsset);
    }
    if (certificateViewerAsset && certificateViewerAsset.id === sanitizedAsset.id) {
      setCertificateViewerAsset(sanitizedAsset);
    }
    showToast(`Data persil ${sanitizedAsset.id} (${sanitizedAsset.asetLapangan}) berhasil diperbarui!`);

    // Sync to database
    saveAssetToApi(sanitizedAsset).catch((err) => {
      console.error('Failed to sync updated asset to database:', err);
    });
  };

  // Delete handlers
  const handleRequestDeleteSingle = (asset: AssetItem) => {
    if (asset.statusDisplay === 'TERBIT' || asset.tahapan >= 17) {
      showToast(`Aset ${asset.asetLapangan} berstatus TERBIT dan terkunci (tidak dapat dihapus).`);
      return;
    }
    setItemsToDelete([asset]);
    setIsDeleteModalOpen(true);
  };

  const handleRequestDeleteMultiple = (targets: AssetItem[]) => {
    const deletable = targets.filter((a) => a.statusDisplay !== 'TERBIT' && a.tahapan < 17);
    const lockedCount = targets.length - deletable.length;

    if (deletable.length === 0) {
      showToast('Seluruh aset yang dipilih berstatus TERBIT dan terkunci (tidak dapat dihapus).');
      return;
    }

    if (lockedCount > 0) {
      showToast(`${lockedCount} aset berstatus TERBIT dilewati karena data telah terkunci.`);
    }

    setItemsToDelete(deletable);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = (idsToDelete: string[]) => {
    // Protect TERBIT assets from being deleted
    const protectedIds = idsToDelete.filter((id) => {
      const item = assets.find((a) => a.id === id);
      return item ? item.statusDisplay !== 'TERBIT' && item.tahapan < 17 : false;
    });

    if (protectedIds.length === 0) {
      showToast('Tidak ada data aset yang dapat dihapus (aset berstatus TERBIT dilindungi).');
      return;
    }

    const remainingAssets = assets.filter((a) => !protectedIds.includes(a.id));
    setAssets(remainingAssets);
    setUnitSummaries(recalculateAllUnitSummaries(remainingAssets, undefined, targetSettings.categoryTargets));
    setSelectedIds((prev) => prev.filter((id) => !protectedIds.includes(id)));
    if (selectedAssetDetail && protectedIds.includes(selectedAssetDetail.id)) {
      setSelectedAssetDetail(null);
    }
    showToast(`Berhasil menghapus ${protectedIds.length} data aset persil tanah.`);

    // Sync to database
    deleteMultipleAssetsFromApi(protectedIds).catch((err) => {
      console.error('Failed to sync deletion to database:', err);
    });
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'ID Persil',
      'Alas Hak',
      'Tahapan BPN',
      'UPT',
      'ULTG',
      'Penghantar / Jalur',
      'Aset Lapangan',
      'Desa',
      'Kecamatan',
      'Kantah BPN',
      'Luas (m2)',
      'No Persil',
      'No Sertifikat',
      'Asset SAP',
      'NIB',
      'Koordinat GPS',
      'PIC Pokja',
      'Total PNBP (Rp)',
      'Tanggal Terbit',
      'Tanggal Target',
      'Kategori',
      'Tahun',
      'Kendala Lapangan',
    ];

    const rows = filteredAssets.map((a) => [
      a.id,
      a.alasHak,
      a.statusDisplay,
      a.upt,
      a.ultg,
      `"${a.penghantar.replace(/"/g, '""')}"`,
      `"${a.asetLapangan.replace(/"/g, '""')}"`,
      a.desa,
      a.kecamatan,
      a.bpn,
      a.luas,
      a.persil,
      a.noSertifikat,
      a.asset,
      a.nib,
      `"${(a.koordinat || '').replace(/"/g, '""')}"`,
      `"${(a.pic || '').replace(/"/g, '""')}"`,
      a.totalPnbp,
      a.tanggalTerbit,
      a.tanggalTerbit && a.tanggalTerbit !== '-' ? a.tanggalAkhir : '-',
      a.kategori,
      a.tahun,
      `"${a.kendala.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Sertifikasi_Aset_PLN_UPT_Madiun_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Berhasil mengunduh ${filteredAssets.length} baris data CSV!`);
  };

  // Global counts for header badges
  const totalAssetsCount = assets.length;
  const totalTerbitCount = assets.filter((a) => a.tahapan >= 17 || a.statusDisplay === 'TERBIT').length;
  const totalProsesCount = totalAssetsCount - totalTerbitCount;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom-5">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Top Header and Corporate Navigation */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        totalAssets={totalAssetsCount}
        totalTerbit={totalTerbitCount}
        totalProses={totalProsesCount}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onExportCsv={handleExportCsv}
        onOpenClearModal={() => setIsClearAllModalOpen(true)}
        onSeedSample={handleRestoreSampleData}
        targetYear={targetSettings.tahunAnggaran}
        availableTargetYears={availableYears}
        onChangeTargetYear={(newYear: number) => {
          handleSaveTargetSettings({
            ...targetSettings,
            tahunAnggaran: newYear,
          });
        }}
        googleUser={googleUser}
        isGoogleDriveConnected={Boolean(googleUser && googleAccessToken)}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onRefresh={() => {
          setIsLoadingData(true);
          Promise.all([
            fetchAssetsFromApi(),
            fetchTargetSettingsFromSupabase(),
            fetchPicOfficersFromSupabase(),
          ])
            .then(([loaded, remoteTargets, remotePics]) => {
              const list = Array.isArray(loaded) ? loaded : [];
              setAssets(list);
              let activeTargets = targetSettings;
              if (remoteTargets) {
                const sumUpt = remoteTargets.categoryTargets
                  ? Object.values(remoteTargets.categoryTargets).reduce((acc, curr) => acc + (Number(curr) || 0), 0)
                  : (remoteTargets.uptTarget || 0);
                activeTargets = {
                  ...remoteTargets,
                  uptTarget: sumUpt,
                };
                setTargetSettings(activeTargets);
              }
              if (remotePics) {
                setPicOfficers(remotePics);
              }
              setUnitSummaries(recalculateAllUnitSummaries(list, undefined, activeTargets.categoryTargets));
              showToast('Data & target berhasil disinkronisasi ulang dengan database Supabase');
            })
            .catch((err) => {
              console.error(err);
              showToast('Gagal menyinkronkan data database.');
            })
            .finally(() => setIsLoadingData(false));
        }}
      />

      {/* Page Content Router */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {/* VIEW 1: HOME / MONITORING (Core User Request) */}
        {activeTab === 'HOME' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Empty State Card if database is cleared */}
            {assets.length === 0 && !isLoadingData && (
              <div className="bg-white border-2 border-dashed border-emerald-300 rounded-2xl p-8 text-center shadow-xs">
                <div className="max-w-md mx-auto space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                    <Database className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">
                    Database Aset Tanah Bersih
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Saat ini belum ada data persil yang tersimpan di database PostgreSQL Cloud SQL. Anda dapat langsung mengimpor data inventaris resmi dari file Excel, menambah persil manual, atau memuat data sampel.
                  </p>
                  <div className="pt-3 flex flex-wrap items-center justify-center gap-2.5">
                    <button
                      id="btn-empty-import-excel"
                      onClick={() => setIsImportModalOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-amber-300" />
                      Impor File Excel (.xlsx)
                    </button>
                    <button
                      id="btn-empty-add-asset"
                      onClick={() => setIsAddModalOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                    >
                      <PlusCircle className="w-4 h-4 text-emerald-300" />
                      Tambah Persil Manual
                    </button>
                    <button
                      id="btn-empty-seed-sample"
                      onClick={handleRestoreSampleData}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-colors shadow-xs"
                    >
                      <RotateCcw className="w-4 h-4 text-slate-500" />
                      Muat Data Sampel UPT Madiun
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 1. Ringkasan Tabel UPT (Dashboard Utama) */}
            <UptSummaryTable
              summaries={unitSummaries}
              selectedUnit={selectedUnitTable}
              onSelectUnit={handleSelectUnitRow}
              selectedStageFilter={selectedStageFilter}
              onSelectStageFilter={handleSelectStageFilter}
              targetYear={targetSettings.tahunAnggaran}
            />

            {/* 2. Filter Interaktif Detail Aset */}
            <AssetFilterBar
              filter={filter}
              onChangeFilter={handleFilterChange}
              onResetFilters={handleResetFilters}
              uniquePenghantar={uniquePenghantar}
              uniqueDesa={uniqueDesa}
              uniqueKecamatan={uniqueKecamatan}
              uniqueBpn={uniqueBpn}
              uniqueKategori={uniqueKategori}
              uniqueKendala={uniqueKendala}
              uniqueTahun={uniqueTahun}
              totalFiltered={filteredAssets.length}
              totalAll={assets.length}
            />

            {/* 3. Detail Tabel Aset & Paginasi */}
            <AssetDetailTable
              assets={filteredAssets}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
              onOpenDetailModal={(asset) => setSelectedAssetDetail(asset)}
              onOpenEditModal={(asset) => setEditingAsset(asset)}
              onDeleteAsset={handleRequestDeleteSingle}
              onDeleteMultiple={handleRequestDeleteMultiple}
              onOpenCertificateModal={(asset) => setCertificateViewerAsset(asset)}
            />
          </div>
        )}

        {/* VIEW 2: DASHBOARD UPT */}
        {activeTab === 'DASHBOARD_UPT' && (
          <div className="animate-in fade-in duration-200">
            <UptDashboardView
              summaries={unitSummaries}
              assets={assets}
              availableYears={availableYears}
              selectedYear={selectedGlobalYear}
              onSelectYear={handleSelectGlobalYear}
              targetYear={targetSettings.tahunAnggaran}
            />
          </div>
        )}

        {/* VIEW 3: DASHBOARD ULTG */}
        {activeTab === 'DASHBOARD_ULTG' && (
          <div className="animate-in fade-in duration-200">
            <UltgDashboardView
              summaries={recalculateAllUltgSummaries(assets, undefined, targetSettings.ultgTargets)}
              assets={assets}
              availableYears={availableYears}
              selectedYear={selectedGlobalYear}
              onSelectYear={handleSelectGlobalYear}
              targetYear={targetSettings.tahunAnggaran}
              onNavigateToDetail={(ultg) => {
                setActiveTab('HOME');
                handleSelectUnitRow(ultg);
              }}
            />
          </div>
        )}

        {/* VIEW 4: GLOBAL REPORT */}
        {activeTab === 'GLOBAL_REPORT' && (
          <div className="animate-in fade-in duration-200">
            <GlobalReportView
              summaries={unitSummaries}
              assets={assets}
              availableYears={availableYears}
              selectedYear={selectedGlobalYear}
              onSelectYear={handleSelectGlobalYear}
              onExportCsv={handleExportCsv}
            />
          </div>
        )}

        {/* VIEW 5: BPN REPORT */}
        {activeTab === 'BPN_REPORT' && (
          <div className="animate-in fade-in duration-200">
            <BpnReportView
              assets={assets}
              availableYears={availableYears}
              selectedYear={selectedGlobalYear}
              onSelectYear={handleSelectGlobalYear}
              onFilterByBpn={(bpn) => {
                setActiveTab('HOME');
                handleFilterChange('bpn', bpn);
                showToast(`Memfilter data tabel detail untuk ${bpn}`);
              }}
            />
          </div>
        )}

        {/* VIEW 6: PETA SEBARAN ASET (Interactive GIS Mapping) */}
        {activeTab === 'MAP_VIEW' && (
          <div className="animate-in fade-in duration-200">
            <AllAssetsMapView
              assets={assets}
              availableYears={availableYears}
              selectedYear={selectedGlobalYear}
              onSelectYear={handleSelectGlobalYear}
              onOpenDetailModal={(asset) => setSelectedAssetDetail(asset)}
              onOpenEditModal={(asset) => setEditingAsset(asset)}
            />
          </div>
        )}

        {/* VIEW 7: ADMIN TARGET & PIC SETTINGS */}
        {activeTab === 'ADMIN_SETTINGS' && (
          <div className="animate-in fade-in duration-200">
            <AdminMenuView
              assets={assets}
              targetSettings={targetSettings}
              picOfficers={picOfficers}
              onSaveTargetSettings={handleSaveTargetSettings}
              onSavePicOfficers={handleSavePicOfficers}
              onUpdateAssetPic={handleUpdateAssetPic}
              onBulkUpdateAssetPic={handleBulkUpdateAssetPic}
              onShowToast={showToast}
              onNavigateToAssetDetail={(asset) => {
                setSelectedAssetDetail(asset);
              }}
            />
          </div>
        )}

        {/* VIEW 8: GOOGLE DRIVE INTEGRATION */}
        {activeTab === 'GOOGLE_DRIVE' && (
          <div className="animate-in fade-in duration-200">
            <GoogleDriveView
              currentUser={googleUser}
              currentAccessToken={googleAccessToken}
              onAuthSuccess={handleGoogleAuthSuccess}
              onSignOut={handleGoogleSignOut}
              assets={assets}
              targetSettings={targetSettings}
              onRestoreAssets={handleRestoreFromDrive}
            />
          </div>
        )}
      </main>

      {/* Detail Modal */}
      <AssetDetailModal
        asset={selectedAssetDetail}
        onClose={() => setSelectedAssetDetail(null)}
        onOpenEdit={(asset) => setEditingAsset(asset)}
        onDelete={handleRequestDeleteSingle}
        onOpenCertificateModal={(asset) => setCertificateViewerAsset(asset)}
      />

      {/* Certificate Document Viewer & Attachment Modal */}
      <CertificateViewerModal
        isOpen={Boolean(certificateViewerAsset)}
        asset={certificateViewerAsset}
        onClose={() => setCertificateViewerAsset(null)}
        onSaveAsset={(updated) => {
          handleSaveEditedAsset(updated);
          setCertificateViewerAsset(updated);
        }}
        googleUser={googleUser}
        googleAccessToken={googleAccessToken}
        onGoogleAuthSuccess={handleGoogleAuthSuccess}
      />

      {/* Add Asset Modal */}
      <AddAssetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddAsset={handleAddNewAsset}
        picOfficers={picOfficers}
      />

      {/* Excel Bulk Import Modal */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportAssets={handleImportAssets}
      />

      {/* Edit Asset Modal */}
      <EditAssetModal
        isOpen={Boolean(editingAsset)}
        asset={editingAsset}
        onClose={() => setEditingAsset(null)}
        onSaveAsset={handleSaveEditedAsset}
        picOfficers={picOfficers}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        itemsToDelete={itemsToDelete}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirmDelete={handleConfirmDelete}
      />

      {/* Clear All Confirmation Modal */}
      <ClearAllConfirmModal
        isOpen={isClearAllModalOpen}
        totalAssets={assets.length}
        onClose={() => setIsClearAllModalOpen(false)}
        onConfirmClear={handleConfirmClearAll}
      />

      {/* Supabase Connection Status & Configuration Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onRefreshData={reloadAllAssets}
      />

      {/* Enterprise Footer */}
      <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-800 text-xs mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300 font-semibold">
              SIMAS-TANAH | PT PLN (PERSERO) UIT JBTB - UPT MADIUN
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 hidden sm:inline">
              Sistem Informasi Monitoring Aset & Pensertipikatan Tanah
            </span>
          </div>
          <div className="text-slate-500 text-[11px]">
            Terintegrasi dengan Loket Prioritas Kementerian ATR/BPN & Standar SAP ERP PLN
          </div>
        </div>
      </footer>
    </div>
  );
}
