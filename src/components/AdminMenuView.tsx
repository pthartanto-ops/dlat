import React, { useState, useMemo } from 'react';
import {
  AssetItem,
  CategoryType,
  CertificationTargetSettings,
  PicOfficer,
  UnitSummaryData,
} from '../types';
import {
  ShieldCheck,
  Target,
  Users,
  UserPlus,
  UserCheck,
  Edit2,
  Trash2,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Building,
  Layers,
  MapPin,
  Phone,
  Mail,
  Search,
  Filter,
  CheckSquare,
  Square,
  ArrowRight,
  Sparkles,
  Award,
  Calendar,
  Zap,
  Info,
} from 'lucide-react';

interface AdminMenuViewProps {
  assets: AssetItem[];
  targetSettings: CertificationTargetSettings;
  onSaveTargetSettings: (newSettings: CertificationTargetSettings) => void;
  picOfficers: PicOfficer[];
  onSavePicOfficers: (newOfficers: PicOfficer[]) => void;
  onUpdateAssetPic: (assetId: string, newPic: string) => Promise<void>;
  onBulkUpdateAssetPic: (assetIds: string[], newPic: string) => Promise<void>;
  onShowToast?: (msg: string) => void;
  onNavigateToAssetDetail?: (asset: AssetItem) => void;
}

type AdminSubTab = 'TARGETS' | 'PICS' | 'DISTRIBUTION';

export const AdminMenuView: React.FC<AdminMenuViewProps> = ({
  assets,
  targetSettings,
  onSaveTargetSettings,
  picOfficers,
  onSavePicOfficers,
  onUpdateAssetPic,
  onBulkUpdateAssetPic,
  onShowToast,
  onNavigateToAssetDetail,
}) => {
  const [subTab, setSubTab] = useState<AdminSubTab>('TARGETS');

  const triggerToast = (msg: string) => {
    if (typeof onShowToast === 'function') {
      onShowToast(msg);
    }
  };

  // Form states for Target Settings
  const [targetForm, setTargetForm] = useState<CertificationTargetSettings>(targetSettings);
  const [isSavingTargets, setIsSavingTargets] = useState(false);

  // Form states for PIC modal
  const [isPicModalOpen, setIsPicModalOpen] = useState(false);
  const [editingPic, setEditingPic] = useState<PicOfficer | null>(null);
  const [picFormData, setPicFormData] = useState<Omit<PicOfficer, 'id'>>({
    nama: '',
    nip: '',
    jabatan: 'Supervisor Pertanahan & ROW',
    unit: 'ULTG MADIUN',
    kontak: '',
    email: '',
    kantahFokus: '',
    status: 'AKTIF',
  });

  // State for PIC Distribution subtab
  const [searchPersil, setSearchPersil] = useState('');
  const [filterUltg, setFilterUltg] = useState('ALL');
  const [filterKategori, setFilterKategori] = useState('ALL');
  const [filterPicStatus, setFilterPicStatus] = useState<'ALL' | 'UNASSIGNED' | 'ASSIGNED'>('ALL');
  const [filterTahun, setFilterTahun] = useState<string>('ALL');
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [targetPicForBulk, setTargetPicForBulk] = useState<string>('');
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);

  // Derive dynamic list of years present in assets
  const dynamicYears = useMemo(() => {
    const yearSet = new Set<number>([2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030]);
    assets.forEach((a) => {
      if (a.tahun && a.tahun > 0) yearSet.add(a.tahun);
    });
    if (targetForm.tahunAnggaran) yearSet.add(targetForm.tahunAnggaran);
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [assets, targetForm.tahunAnggaran]);

  // Sync targetForm when targetSettings prop updates
  React.useEffect(() => {
    setTargetForm(targetSettings);
  }, [targetSettings]);

  // Calculations for real-time realization vs target
  const realisasiCategory = useMemo(() => {
    const categories: CategoryType[] = [
      'TOWER',
      'GARDU INDUK',
      'RUMAH DINAS',
      'TANAH KOSONG',
      'KANTOR',
      'EX. GARDU INDUK',
    ];
    const result: Record<CategoryType, { total: number; terbit: number }> = {
      TOWER: { total: 0, terbit: 0 },
      'GARDU INDUK': { total: 0, terbit: 0 },
      'RUMAH DINAS': { total: 0, terbit: 0 },
      'TANAH KOSONG': { total: 0, terbit: 0 },
      KANTOR: { total: 0, terbit: 0 },
      'EX. GARDU INDUK': { total: 0, terbit: 0 },
    };

    categories.forEach((cat) => {
      const catAssets = assets.filter((a) => {
        const k = (a.kategori || '').trim().toUpperCase();
        if (cat === 'TOWER') return k.includes('TOWER') || k.includes('TAPAK') || k.includes('SUTT') || k.includes('SUTET');
        if (cat === 'EX. GARDU INDUK') {
          return (
            k === 'EX. GARDU INDUK' ||
            k === 'EX GARDU INDUK' ||
            k.includes('EX. GI') ||
            k.includes('EX. GARDU') ||
            k.includes('EKS GI') ||
            k.includes('BEKAS GI') ||
            ((k.includes('EX') || k.includes('EKS') || k.includes('BEKAS')) && (k.includes('GARDU') || k.includes('GI')))
          );
        }
        if (cat === 'KANTOR') return k.includes('KANTOR') || k.includes('GEDUNG') || k.includes('OFFICE');
        if (cat === 'GARDU INDUK') {
          if (k.includes('EX') || k.includes('EKS') || k.includes('BEKAS')) return false;
          return k.includes('GARDU') || k.includes('GI') || k.includes('GITET');
        }
        if (cat === 'RUMAH DINAS') return k.includes('RUMAH') || k.includes('DINAS') || k.includes('MESS');
        if (cat === 'TANAH KOSONG') return k.includes('KOSONG') || k.includes('LAHAN');
        return k === cat;
      });
      const terbit = catAssets.filter((a) => a.tahapan >= 17 || a.statusDisplay === 'TERBIT').length;
      result[cat] = { total: catAssets.length, terbit };
    });

    return result;
  }, [assets]);

  const realisasiUltg = useMemo(() => {
    const units = ['ULTG MADIUN', 'ULTG KEDIRI', 'ULTG BABAT'];
    const result: Record<string, { total: number; terbit: number }> = {};
    units.forEach((u) => {
      const uAssets = assets.filter((a) => a.ultg === u);
      const terbit = uAssets.filter((a) => a.tahapan >= 17 || a.statusDisplay === 'TERBIT').length;
      result[u] = { total: uAssets.length, terbit };
    });
    return result;
  }, [assets]);

  const totalRealisasiTerbit = useMemo(() => {
    return assets.filter((a) => a.tahapan >= 17 || a.statusDisplay === 'TERBIT').length;
  }, [assets]);

  const totalRealisasiPersil = assets.length;

  // Workload count per PIC
  const picWorkloadMap = useMemo(() => {
    const map: Record<string, number> = {};
    picOfficers.forEach((p) => {
      map[p.id] = 0;
    });

    assets.forEach((a) => {
      if (!a.pic || a.pic.trim() === '') return;
      const found = picOfficers.find(
        (p) => a.pic === p.nama || a.pic?.includes(p.nama) || (p.nama && a.pic.includes(p.nama.split(' ')[1] || ''))
      );
      if (found) {
        map[found.id] = (map[found.id] || 0) + 1;
      }
    });

    return map;
  }, [assets, picOfficers]);

  // Filtered assets for distribution table
  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      if (filterUltg !== 'ALL' && a.ultg !== filterUltg) return false;
      if (filterKategori !== 'ALL' && a.kategori !== filterKategori) return false;
      if (filterPicStatus === 'UNASSIGNED' && a.pic && a.pic.trim() !== '' && a.pic !== 'Belum Ditugaskan') return false;
      if (filterPicStatus === 'ASSIGNED' && (!a.pic || a.pic.trim() === '' || a.pic === 'Belum Ditugaskan')) return false;
      if (filterTahun !== 'ALL') {
        if (filterTahun === 'EMPTY') {
          if (a.tahun && a.tahun > 0) return false;
        } else if (String(a.tahun) !== filterTahun) {
          return false;
        }
      }

      if (searchPersil.trim()) {
        const q = searchPersil.toLowerCase();
        const match =
          a.id.toLowerCase().includes(q) ||
          a.penghantar.toLowerCase().includes(q) ||
          a.asetLapangan.toLowerCase().includes(q) ||
          a.desa.toLowerCase().includes(q) ||
          a.kecamatan.toLowerCase().includes(q) ||
          a.bpn.toLowerCase().includes(q) ||
          (a.pic && a.pic.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [assets, filterUltg, filterKategori, filterPicStatus, filterTahun, searchPersil]);

  // Handle Target Saving
  const handleSaveTargets = () => {
    setIsSavingTargets(true);
    setTimeout(() => {
      onSaveTargetSettings(targetForm);
      setIsSavingTargets(false);
      triggerToast('Target sertifikasi berhasil disimpan dan diperbarui di seluruh dashboard!');
    }, 300);
  };

  const handleResetDefaultTargets = () => {
    const defaults: CertificationTargetSettings = {
      tahunAnggaran: 2024,
      uptTarget: 400,
      categoryTargets: {
        TOWER: 280,
        'GARDU INDUK': 60,
        'RUMAH DINAS': 35,
        'TANAH KOSONG': 25,
        KANTOR: 10,
        'EX. GARDU INDUK': 10,
      },
      ultgTargets: {
        'ULTG MADIUN': 150,
        'ULTG KEDIRI': 130,
        'ULTG BABAT': 120,
      },
    };
    setTargetForm(defaults);
    onSaveTargetSettings(defaults);
    triggerToast('Target sertifikasi dikembalikan ke standar KPI PLN UPT Madiun.');
  };

  // Open PIC modal for Add
  const handleOpenAddPic = () => {
    setEditingPic(null);
    setPicFormData({
      nama: '',
      nip: '',
      jabatan: 'Supervisor Pertanahan & ROW',
      unit: 'ULTG MADIUN',
      kontak: '',
      email: '',
      kantahFokus: '',
      status: 'AKTIF',
    });
    setIsPicModalOpen(true);
  };

  // Open PIC modal for Edit
  const handleOpenEditPic = (officer: PicOfficer) => {
    setEditingPic(officer);
    setPicFormData({
      nama: officer.nama,
      nip: officer.nip,
      jabatan: officer.jabatan,
      unit: officer.unit,
      kontak: officer.kontak,
      email: officer.email || '',
      kantahFokus: officer.kantahFokus || '',
      status: officer.status,
    });
    setIsPicModalOpen(true);
  };

  // Save PIC Officer (Add or Edit)
  const handleSavePicForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!picFormData.nama.trim()) {
      alert('Nama petugas PIC wajib diisi!');
      return;
    }

    let updatedList: PicOfficer[];
    if (editingPic) {
      updatedList = picOfficers.map((p) =>
        p.id === editingPic.id ? { ...p, ...picFormData } : p
      );
      triggerToast(`Data petugas PIC "${picFormData.nama}" berhasil diperbarui.`);
    } else {
      const newId = `PIC-${String(picOfficers.length + 1).padStart(3, '0')}`;
      const newOfficer: PicOfficer = {
        id: newId,
        ...picFormData,
      };
      updatedList = [...picOfficers, newOfficer];
      triggerToast(`Petugas PIC "${picFormData.nama}" berhasil ditambahkan.`);
    }

    onSavePicOfficers(updatedList);
    setIsPicModalOpen(false);
  };

  // Delete PIC Officer
  const handleDeletePic = (officer: PicOfficer) => {
    if (confirm(`Apakah Anda yakin ingin menghapus petugas PIC "${officer.nama}"?`)) {
      const updatedList = picOfficers.filter((p) => p.id !== officer.id);
      onSavePicOfficers(updatedList);
      triggerToast(`Petugas PIC "${officer.nama}" telah dihapus.`);
    }
  };

  // Bulk assign PIC
  const handleExecuteBulkAssign = async () => {
    if (!targetPicForBulk) {
      alert('Silakan pilih petugas PIC terlebih dahulu!');
      return;
    }
    if (selectedAssetIds.length === 0) {
      alert('Silakan pilih minimal satu persil aset!');
      return;
    }

    try {
      setIsBulkAssigning(true);
      await onBulkUpdateAssetPic(selectedAssetIds, targetPicForBulk);
      setSelectedAssetIds([]);
      triggerToast(`Berhasil menugaskan PIC "${targetPicForBulk}" ke ${selectedAssetIds.length} persil tanah!`);
    } catch (err) {
      console.error(err);
      triggerToast('Gagal menugaskan PIC secara massal.');
    } finally {
      setIsBulkAssigning(false);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedAssetIds.length === filteredAssets.length) {
      setSelectedAssetIds([]);
    } else {
      setSelectedAssetIds(filteredAssets.map((a) => a.id));
    }
  };

  const handleToggleSelectId = (id: string) => {
    setSelectedAssetIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-2xl p-5 text-white shadow-md border border-emerald-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 bg-emerald-800/80 text-amber-300 px-3 py-1 rounded-full text-xs font-bold border border-emerald-700/50">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              MENU ADMINISTRATOR PUSAT
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              Manajemen Target & Petugas PIC Sertifikasi
            </h2>
            <p className="text-xs text-emerald-200 max-w-2xl">
              Pusat kendali penetapan sasaran sertifikasi tanah (KPI UPT Madiun & ULTG) serta penetapan Person in Charge (PIC) Pokja Sertifikasi pada tiap persil tapak transmisi dan gardu induk.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-emerald-950/70 border border-emerald-700/40 rounded-xl px-4 py-2.5 text-center">
              <div className="text-[10px] uppercase font-bold text-emerald-300">Tahun Anggaran</div>
              <div className="text-lg font-black text-amber-300">{targetForm.tahunAnggaran}</div>
            </div>
            <div className="bg-emerald-950/70 border border-emerald-700/40 rounded-xl px-4 py-2.5 text-center">
              <div className="text-[10px] uppercase font-bold text-emerald-300">Total Petugas PIC</div>
              <div className="text-lg font-black text-white">{picOfficers.length} Orang</div>
            </div>
          </div>
        </div>

        {/* Sub Navigation Bar */}
        <div className="mt-5 pt-4 border-t border-emerald-800/80 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setSubTab('TARGETS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              subTab === 'TARGETS'
                ? 'bg-amber-400 text-slate-950 shadow-sm font-extrabold'
                : 'bg-emerald-800/60 text-emerald-100 hover:bg-emerald-700/60'
            }`}
          >
            <Target className="w-4 h-4" />
            1. Target Sertifikasi (KPI UPT & ULTG)
          </button>

          <button
            onClick={() => setSubTab('PICS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              subTab === 'PICS'
                ? 'bg-amber-400 text-slate-950 shadow-sm font-extrabold'
                : 'bg-emerald-800/60 text-emerald-100 hover:bg-emerald-700/60'
            }`}
          >
            <Users className="w-4 h-4" />
            2. Master Petugas PIC Pokja ({picOfficers.length})
          </button>

          <button
            onClick={() => setSubTab('DISTRIBUTION')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              subTab === 'DISTRIBUTION'
                ? 'bg-amber-400 text-slate-950 shadow-sm font-extrabold'
                : 'bg-emerald-800/60 text-emerald-100 hover:bg-emerald-700/60'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            3. Penugasan & Distribusi PIC ke Persil
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: TARGET SERTIFIKASI */}
      {/* ========================================================================= */}
      {subTab === 'TARGETS' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Executive Realization vs Target Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-bold uppercase">Target UPT Madiun</span>
                <Target className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{targetForm.uptTarget} <span className="text-xs font-normal text-slate-500">Persil</span></div>
              <p className="text-[11px] text-slate-500 mt-1">Sasaran penerbitan sertifikat TA {targetForm.tahunAnggaran}</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-bold uppercase">Realisasi Terbit Saat Ini</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-700">{totalRealisasiTerbit} <span className="text-xs font-normal text-slate-500">Persil</span></div>
              <div className="mt-2 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, targetForm.uptTarget > 0 ? (totalRealisasiTerbit / targetForm.uptTarget) * 100 : 0)}%`,
                  }}
                ></div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-bold uppercase">Persentase Pencapaian</span>
                <Award className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-amber-600">
                {targetForm.uptTarget > 0 ? ((totalRealisasiTerbit / targetForm.uptTarget) * 100).toFixed(1) : 0}%
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {totalRealisasiTerbit >= targetForm.uptTarget ? 'Target tercapai penuh' : `Sisa ${Math.max(0, targetForm.uptTarget - totalRealisasiTerbit)} persil lagi`}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-bold uppercase">Total Database Persil</span>
                <Layers className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-slate-800">{totalRealisasiPersil} <span className="text-xs font-normal text-slate-500">Persil</span></div>
              <p className="text-[11px] text-slate-500 mt-1">Tersebar di 3 ULTG & 10 Kantah BPN</p>
            </div>
          </div>

          {/* Form Card: Pengaturan Target */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-700" />
                  Formulir Penetapan Target Sertifikasi Tanah
                </h3>
                <p className="text-xs text-slate-500">
                  Ubah angka target di bawah ini untuk memperbarui tolok ukur KPI sertifikasi UPT Madiun dan ULTG.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetDefaultTargets}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Kembalikan nilai ke default KPI PLN"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Default
                </button>
                <button
                  type="button"
                  onClick={handleSaveTargets}
                  disabled={isSavingTargets}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSavingTargets ? 'Menyimpan...' : 'Simpan Perubahan Target'}
                </button>
              </div>
            </div>

            <div className="p-5 space-y-6">
              {/* Row 1: Tahun Anggaran & Target Keseluruhan */}
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-emerald-950 mb-1">
                    Tahun Anggaran Pelaksanaan
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={2000}
                      max={2050}
                      value={targetForm.tahunAnggaran || ''}
                      onChange={(e) =>
                        setTargetForm({ ...targetForm, tahunAnggaran: Number(e.target.value) })
                      }
                      className="bg-white border border-emerald-300 rounded-lg p-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-28 text-center"
                      placeholder="Tahun"
                      title="Ketik tahun target secara manual"
                    />
                    <select
                      value={targetForm.tahunAnggaran}
                      onChange={(e) =>
                        setTargetForm({ ...targetForm, tahunAnggaran: Number(e.target.value) })
                      }
                      className="bg-white border border-emerald-300 rounded-lg p-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 flex-1"
                      title="Pilih tahun dari daftar"
                    >
                      {dynamicYears.map((yr) => (
                        <option key={yr} value={yr}>
                          Tahun Anggaran {yr}
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className="text-[11px] text-emerald-800 mt-1 block">
                    Pilihan tahun anggaran aktif untuk target kinerja penertiban aset (dapat dipilih dari daftar atau diketik manual).
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-950 mb-1">
                    Target Akumulasi UPT Madiun (Total Bidang)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={targetForm.uptTarget}
                    onChange={(e) =>
                      setTargetForm({ ...targetForm, uptTarget: Math.max(0, Number(e.target.value)) })
                    }
                    className="bg-white border border-emerald-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full"
                  />
                  <span className="text-[11px] text-emerald-800 mt-1 block">
                    Target agregat keseluruhan sertifikasi tanah di tingkat UPT Madiun.
                  </span>
                </div>
              </div>

              {/* Section: Target per Kategori Aset */}
              <div>
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-emerald-700" />
                  Target Sertifikasi Berdasarkan Kategori Aset
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                  {(
                    [
                      'TOWER',
                      'GARDU INDUK',
                      'RUMAH DINAS',
                      'TANAH KOSONG',
                      'KANTOR',
                      'EX. GARDU INDUK',
                    ] as CategoryType[]
                  ).map((cat) => {
                      const real = realisasiCategory[cat] || { total: 0, terbit: 0 };
                      const currentTarget = targetForm.categoryTargets[cat] || 0;
                      const percentage =
                        currentTarget > 0 ? ((real.terbit / currentTarget) * 100).toFixed(1) : '0';

                      return (
                        <div
                          key={cat}
                          className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-xs text-slate-900">{cat}</span>
                              <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-semibold">
                                Real: {real.terbit}/{real.total}
                              </span>
                            </div>

                            <label className="block text-[11px] text-slate-500 mb-1">
                              Target Jumlah Terbit:
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={currentTarget}
                              onChange={(e) =>
                                setTargetForm({
                                  ...targetForm,
                                  categoryTargets: {
                                    ...targetForm.categoryTargets,
                                    [cat]: Math.max(0, Number(e.target.value)),
                                  },
                                })
                              }
                              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
                            />
                          </div>

                          <div className="mt-3 pt-3 border-t border-slate-200">
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="text-slate-500">Capaian:</span>
                              <span className="font-bold text-emerald-700">{percentage}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-emerald-600 h-1.5 rounded-full"
                                style={{ width: `${Math.min(100, Number(percentage))}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Section: Target per Unit Layanan Transmisi & Gardu Induk (ULTG) */}
              <div>
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-700" />
                  Target Sertifikasi Berdasarkan Wilayah Kerja ULTG
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(['ULTG MADIUN', 'ULTG KEDIRI', 'ULTG BABAT'] as const).map((uName) => {
                    const real = realisasiUltg[uName] || { total: 0, terbit: 0 };
                    const currentTarget = targetForm.ultgTargets[uName] || 0;
                    const percentage =
                      currentTarget > 0 ? ((real.terbit / currentTarget) * 100).toFixed(1) : '0';

                    return (
                      <div
                        key={uName}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                              <Building className="w-3.5 h-3.5 text-emerald-700" />
                              {uName}
                            </span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold border border-emerald-200">
                              Terbit: {real.terbit}
                            </span>
                          </div>

                          <label className="block text-[11px] text-slate-500 mb-1">
                            Target Terbit ULTG (Bidang):
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={currentTarget}
                            onChange={(e) =>
                              setTargetForm({
                                ...targetForm,
                                ultgTargets: {
                                  ...targetForm.ultgTargets,
                                  [uName]: Math.max(0, Number(e.target.value)),
                                },
                              })
                            }
                            className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
                          />
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="text-slate-500">Total Persil Wilayah:</span>
                            <span className="font-semibold text-slate-700">{real.total} Persil</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="text-slate-500">Pencapaian:</span>
                            <span className="font-bold text-emerald-700">{percentage}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-emerald-600 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(100, Number(percentage))}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Save Footer Bar */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Info className="w-4 h-4 text-emerald-600" />
                  Target yang disimpan akan secara otomatis sinkron ke Dashboard UPT, Dashboard ULTG, dan tabel rekapitulasi.
                </div>
                <button
                  type="button"
                  onClick={handleSaveTargets}
                  disabled={isSavingTargets}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSavingTargets ? 'Menyimpan...' : 'Simpan Target Sertifikasi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: MANAJEMEN PETUGAS PIC POKJA */}
      {/* ========================================================================= */}
      {subTab === 'PICS' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Action & Stats Header */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-700" />
                Daftar Person in Charge (PIC) & Pokja Sertifikasi
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Petugas yang bertanggung jawab mengawal tahapan pensertipikatan tanah di Kantah BPN dan lapangan.
              </p>
            </div>

            <button
              onClick={handleOpenAddPic}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors shadow-xs cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              <UserPlus className="w-4 h-4" />
              Tambah Petugas PIC Baru
            </button>
          </div>

          {/* PIC Officers Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {picOfficers.map((officer) => {
              const workload = picWorkloadMap[officer.id] || 0;

              return (
                <div
                  key={officer.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow p-5 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header with Avatar and Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm border border-emerald-200">
                          {officer.nama
                            .split(' ')
                            .filter((n) => !n.includes('.'))
                            .slice(0, 2)
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase() || 'PIC'}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs leading-tight">
                            {officer.nama}
                          </h4>
                          <span className="text-[11px] text-slate-500 font-mono">
                            NIP: {officer.nip || '-'}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          officer.status === 'AKTIF'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {officer.status}
                      </span>
                    </div>

                    {/* Role and Unit */}
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Jabatan:</span>
                        <span className="font-semibold text-slate-800 text-right">{officer.jabatan}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Unit Kerja:</span>
                        <span className="font-bold text-emerald-800">{officer.unit}</span>
                      </div>
                    </div>

                    {/* Kantah Fokus */}
                    <div className="text-[11px]">
                      <span className="text-slate-400 block mb-0.5">Wilayah / Kantah BPN Fokus:</span>
                      <span className="font-medium text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200 block">
                        {officer.kantahFokus || 'Seluruh Wilayah UPT Madiun'}
                      </span>
                    </div>

                    {/* Contact details */}
                    <div className="text-[11px] space-y-1 text-slate-600 pt-1">
                      {officer.kontak && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                          <span className="font-mono">{officer.kontak}</span>
                        </div>
                      )}
                      {officer.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                          <span className="truncate">{officer.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer with workload counter & action buttons */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500">Beban Persil:</span>
                      <span className="bg-emerald-100 text-emerald-900 font-bold text-xs px-2 py-0.5 rounded-full border border-emerald-200">
                        {workload} Persil
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditPic(officer)}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Data Petugas"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePic(officer)}
                        className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Petugas"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: PENUGASAN & DISTRIBUSI PIC KE PERSIL */}
      {/* ========================================================================= */}
      {subTab === 'DISTRIBUTION' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Quick Filter Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-700" />
                  Penugasan PIC ke Bidang Persil Tanah
                </h3>
                <p className="text-xs text-slate-500">
                  Tugaskan PIC secara massal (bulk assign) atau ubah langsung petugas pada tabel di bawah.
                </p>
              </div>

              {/* Search input */}
              <div className="relative w-full lg:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari persil, jalur, desa, atau PIC..."
                  value={searchPersil}
                  onChange={(e) => setSearchPersil(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            {/* Filter selectors */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-1 text-slate-500 font-semibold">
                <Filter className="w-3.5 h-3.5" />
                Filter:
              </div>

              {/* ULTG Filter */}
              <select
                value={filterUltg}
                onChange={(e) => setFilterUltg(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none"
              >
                <option value="ALL">Semua ULTG</option>
                <option value="ULTG MADIUN">ULTG MADIUN</option>
                <option value="ULTG KEDIRI">ULTG KEDIRI</option>
                <option value="ULTG BABAT">ULTG BABAT</option>
              </select>

              {/* Kategori Filter */}
              <select
                value={filterKategori}
                onChange={(e) => setFilterKategori(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none"
              >
                <option value="ALL">Semua Jenis Aset</option>
                <option value="TOWER">TOWER</option>
                <option value="GARDU INDUK">GARDU INDUK</option>
                <option value="RUMAH DINAS">RUMAH DINAS</option>
                <option value="TANAH KOSONG">TANAH KOSONG</option>
                <option value="KANTOR">KANTOR</option>
                <option value="EX. GARDU INDUK">EX. GARDU INDUK</option>
              </select>

              {/* PIC Assignment Status */}
              <select
                value={filterPicStatus}
                onChange={(e) => setFilterPicStatus(e.target.value as any)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none"
              >
                <option value="ALL">Semua Status PIC</option>
                <option value="UNASSIGNED">Belum Memiliki PIC</option>
                <option value="ASSIGNED">Sudah Ada PIC</option>
              </select>

              {/* Dynamic Year Filter */}
              <select
                value={filterTahun}
                onChange={(e) => setFilterTahun(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none"
              >
                <option value="ALL">Semua Tahun</option>
                {dynamicYears.map((yr) => (
                  <option key={yr} value={String(yr)}>
                    Tahun {yr}
                  </option>
                ))}
                <option value="EMPTY">Tanpa Tahun</option>
              </select>

              <span className="text-slate-400 text-xs ml-auto">
                Menampilkan <b>{filteredAssets.length}</b> dari {assets.length} persil
              </span>
            </div>
          </div>

          {/* Bulk Action Toolbar */}
          <div className="bg-emerald-900 text-white rounded-xl p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleSelectAll}
                className="flex items-center gap-1.5 text-xs font-bold hover:text-amber-300 transition-colors cursor-pointer"
              >
                {selectedAssetIds.length > 0 && selectedAssetIds.length === filteredAssets.length ? (
                  <CheckSquare className="w-4 h-4 text-amber-400" />
                ) : (
                  <Square className="w-4 h-4 text-emerald-300" />
                )}
                <span>
                  {selectedAssetIds.length === 0
                    ? 'Pilih Semua Baris'
                    : `Terpilih ${selectedAssetIds.length} Persil`}
                </span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-emerald-200">Tetapkan ke:</span>
              <select
                value={targetPicForBulk}
                onChange={(e) => setTargetPicForBulk(e.target.value)}
                className="bg-emerald-950 border border-emerald-700 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
              >
                <option value="">-- Pilih Petugas PIC --</option>
                {picOfficers
                  .filter((p) => p.status === 'AKTIF')
                  .map((p) => (
                    <option key={p.id} value={`${p.nama} (${p.jabatan.split(' ')[0]})`}>
                      {p.nama} ({p.unit})
                    </option>
                  ))}
              </select>

              <button
                onClick={handleExecuteBulkAssign}
                disabled={isBulkAssigning || selectedAssetIds.length === 0 || !targetPicForBulk}
                className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                <UserCheck className="w-3.5 h-3.5" />
                {isBulkAssigning ? 'Memproses...' : `Tugaskan ke (${selectedAssetIds.length}) Aset`}
              </button>
            </div>
          </div>

          {/* Persil Table with Inline PIC Dropdown */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[580px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100/80 sticky top-0 z-10 border-b border-slate-200 text-slate-700">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredAssets.length > 0 &&
                          selectedAssetIds.length === filteredAssets.length
                        }
                        onChange={handleToggleSelectAll}
                        className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </th>
                    <th className="p-3 font-bold">ID Persil</th>
                    <th className="p-3 font-bold">Penghantar / Nama Aset</th>
                    <th className="p-3 font-bold">ULTG</th>
                    <th className="p-3 font-bold">Kantah BPN</th>
                    <th className="p-3 font-bold">Jenis / Tahapan</th>
                    <th className="p-3 font-bold min-w-[220px]">Petugas PIC Bertanggung Jawab</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        Tidak ada data persil tanah yang sesuai dengan kriteria filter.
                      </td>
                    </tr>
                  ) : (
                    filteredAssets.map((asset) => {
                      const isSelected = selectedAssetIds.includes(asset.id);

                      return (
                        <tr
                          key={asset.id}
                          className={`hover:bg-emerald-50/40 transition-colors ${
                            isSelected ? 'bg-emerald-50/70' : ''
                          }`}
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectId(asset.id)}
                              className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 font-mono font-bold text-emerald-900">{asset.id}</td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-900">{asset.penghantar}</div>
                            <div className="text-[11px] text-slate-500">
                              {asset.asetLapangan} {asset.desa ? `• Desa ${asset.desa}` : ''}
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="font-medium text-slate-700">{asset.ultg}</span>
                          </td>
                          <td className="p-3 text-slate-700">{asset.bpn}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-semibold border border-slate-200">
                                {asset.kategori}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  asset.tahapan >= 17
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-900'
                                }`}
                              >
                                {asset.statusDisplay}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            {/* Inline Selectable PIC */}
                            <select
                              value={asset.pic || ''}
                              onChange={async (e) => {
                                const newPic = e.target.value;
                                await onUpdateAssetPic(asset.id, newPic);
                                triggerToast(`PIC untuk persil ${asset.id} diperbarui.`);
                              }}
                              className="w-full bg-slate-50 hover:bg-white border border-slate-300 focus:border-emerald-600 rounded-lg p-1.5 text-xs text-slate-800 focus:outline-none transition-colors"
                            >
                              <option value="">-- Belum Ditugaskan --</option>
                              {picOfficers.map((p) => {
                                const label = `${p.nama} (${p.unit.split(' ')[1] || p.unit})`;
                                return (
                                  <option key={p.id} value={label}>
                                    {label}
                                  </option>
                                );
                              })}
                            </select>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH / EDIT PETUGAS PIC */}
      {/* ========================================================================= */}
      {isPicModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-emerald-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-sm">
                  {editingPic ? 'Edit Data Petugas PIC' : 'Tambah Petugas PIC Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsPicModalOpen(false)}
                className="p-1 rounded-md hover:bg-white/10 text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePicForm} className="p-5 space-y-4 text-xs">
              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nama Lengkap Petugas <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={picFormData.nama}
                    onChange={(e) => setPicFormData({ ...picFormData, nama: e.target.value })}
                    placeholder="Contoh: Bpk. Ahmad Yani, S.T."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">NIP / ID Pegawai</label>
                    <input
                      type="text"
                      value={picFormData.nip}
                      onChange={(e) => setPicFormData({ ...picFormData, nip: e.target.value })}
                      placeholder="Contoh: 198904122013111002"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Status Keaktifan</label>
                    <select
                      value={picFormData.status}
                      onChange={(e) =>
                        setPicFormData({ ...picFormData, status: e.target.value as any })
                      }
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
                    >
                      <option value="AKTIF">AKTIF</option>
                      <option value="NONAKTIF">NONAKTIF</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Jabatan / Peran</label>
                    <input
                      type="text"
                      value={picFormData.jabatan}
                      onChange={(e) => setPicFormData({ ...picFormData, jabatan: e.target.value })}
                      placeholder="Contoh: Supervisor Pertanahan & ROW"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Unit Penempatan</label>
                    <select
                      value={picFormData.unit}
                      onChange={(e) => setPicFormData({ ...picFormData, unit: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
                    >
                      <option value="UPT MADIUN">UPT MADIUN</option>
                      <option value="ULTG MADIUN">ULTG MADIUN</option>
                      <option value="ULTG KEDIRI">ULTG KEDIRI</option>
                      <option value="ULTG BABAT">ULTG BABAT</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nomor HP / WhatsApp</label>
                    <input
                      type="text"
                      value={picFormData.kontak}
                      onChange={(e) => setPicFormData({ ...picFormData, kontak: e.target.value })}
                      placeholder="Contoh: 0812-3456-7890"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Email PLN (Opsional)</label>
                    <input
                      type="email"
                      value={picFormData.email}
                      onChange={(e) => setPicFormData({ ...picFormData, email: e.target.value })}
                      placeholder="nama@pln.co.id"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kantah BPN Fokus / Wilayah Pengawalan
                  </label>
                  <input
                    type="text"
                    value={picFormData.kantahFokus}
                    onChange={(e) => setPicFormData({ ...picFormData, kantahFokus: e.target.value })}
                    placeholder="Contoh: BPN Kab Madiun, BPN Kota Madiun, BPN Magetan"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Sebutkan kantor pertanahan BPN yang menjadi fokus pengawalan petugas ini.
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPicModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Simpan Petugas PIC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
