import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AssetItem, CategoryType } from '../types';
import { parseCoordinates } from './AssetLocationMap';
import L from 'leaflet';
import {
  MapPin,
  Layers,
  Search,
  Filter,
  Eye,
  Navigation,
  ExternalLink,
  Download,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Zap,
  Building,
  Home,
  FileCheck,
  Compass,
  Maximize2,
  Minimize2,
  ShieldCheck,
  ChevronRight,
  ListFilter,
  LocateFixed,
  Sparkles,
  Info,
  PanelLeftClose,
  PanelLeftOpen,
  Tag,
} from 'lucide-react';

interface AllAssetsMapViewProps {
  assets: AssetItem[];
  onOpenDetailModal: (asset: AssetItem) => void;
  onOpenEditModal?: (asset: AssetItem) => void;
}

type TileLayerType = 'satellite' | 'roadmap' | 'positron';

const TILE_LAYERS: Record<TileLayerType, { url: string; attribution: string; name: string }> = {
  satellite: {
    name: 'Satelit HD (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; DigitalGlobe, GeoEye, Earthstar Geographics',
  },
  roadmap: {
    name: 'Peta Jalan (OSM)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  positron: {
    name: 'Peta Bersih (Carto)',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
  },
};

/**
 * Memformat Nama Aset CBM secara ringkas untuk taging lokasi pada peta GIS
 */
export function getConciseCbmName(item: {
  asetCbm?: string;
  asetProperti?: string;
  asetLapangan?: string;
  asset?: string;
}): string {
  // 1. Cek field asetCbm jika terisi
  if (item.asetCbm && item.asetCbm.trim() !== '' && item.asetCbm.trim() !== '-') {
    let cbm = item.asetCbm.trim();

    // Bersihkan prefix berulang seperti "ASET CBM", "KODE CBM", "CBM:"
    cbm = cbm.replace(/^(aset\s*cbm|kode\s*cbm|cbm\s*[:\-_]?\s*)/i, '');

    // Jika sudah cukup ringkas (<= 16 karakter), tampilkan langsung
    if (cbm.length <= 16) {
      return cbm.toUpperCase().startsWith('CBM') ? cbm : `CBM ${cbm}`;
    }

    // Jika panjang, ekstrak nomor Tower (misal: SUTT 150kV Manisrejo - Ngawi T.45 -> CBM T.45)
    const towerMatch = cbm.match(/(?:T(?:OWER)?\.?\s*(\d+[A-Za-z]?)|NO\.?\s*(\d+))/i);
    if (towerMatch) {
      const no = towerMatch[1] || towerMatch[2];
      return `CBM T.${no}`;
    }

    // Ekstrak Gardu Induk (misal: CBM GARDU INDUK MANISREJO -> GI MANISREJO)
    const giMatch = cbm.match(/(?:GARDU\s+INDUK|GI)\s+([A-Za-z0-9]+)/i);
    if (giMatch) {
      return `GI ${giMatch[1]}`;
    }

    // Potong ringkas dengan elipsis
    return `CBM ${cbm.substring(0, 12)}…`;
  }

  // 2. Fallback jika asetCbm belum terisi: ambil nomor tower atau nama gardu dari asetProperti / asetLapangan
  const fallback = (item.asetProperti || item.asetLapangan || item.asset || '').trim();
  if (fallback && fallback !== '-') {
    const towerMatch = fallback.match(/(?:T(?:OWER)?\.?\s*(\d+[A-Za-z]?)|NO\.?\s*(\d+))/i);
    if (towerMatch) {
      const no = towerMatch[1] || towerMatch[2];
      return `T.${no}`;
    }
    const giMatch = fallback.match(/(?:GARDU\s+INDUK|GI)\s+([A-Za-z0-9]+)/i);
    if (giMatch) {
      return `GI ${giMatch[1]}`;
    }
    if (fallback.length > 15) {
      return fallback.substring(0, 14) + '…';
    }
    return fallback;
  }

  return 'Aset';
}

export const AllAssetsMapView: React.FC<AllAssetsMapViewProps> = ({
  assets,
  onOpenDetailModal,
  onOpenEditModal,
}) => {
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUltg, setSelectedUltg] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedKategori, setSelectedKategori] = useState<string>('ALL');
  const [coordTypeFilter, setCoordTypeFilter] = useState<'ALL' | 'VERIFIED' | 'ESTIMATED'>('ALL');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  // Map settings
  const [activeLayer, setActiveLayer] = useState<TileLayerType>('satellite');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [showCbmLabels, setShowCbmLabels] = useState(true); // Toggle taging lokasi nama aset CBM ringkas

  // Map DOM and Leaflet instance refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const markersMapRef = useRef<Map<string, L.Marker>>(new Map());

  // Process coordinates for all assets
  const processedAssets = useMemo(() => {
    return assets.map((asset) => {
      const coordData = parseCoordinates(asset.koordinat, asset.bpn, asset.ultg);
      const conciseCbm = getConciseCbmName(asset);
      return {
        ...asset,
        parsedLat: coordData.lat,
        parsedLng: coordData.lng,
        isVerifiedGps: !coordData.isEstimated,
        coordNote: coordData.note,
        conciseCbm,
      };
    });
  }, [assets]);

  // Filtered Assets based on user selections
  const filteredAssets = useMemo(() => {
    return processedAssets.filter((item) => {
      // Search
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const matchesQuery =
          (item.asetProperti || item.asetLapangan).toLowerCase().includes(query) ||
          (item.asetCbm || '').toLowerCase().includes(query) ||
          (item.conciseCbm || '').toLowerCase().includes(query) ||
          item.penghantar.toLowerCase().includes(query) ||
          item.desa.toLowerCase().includes(query) ||
          item.kecamatan.toLowerCase().includes(query) ||
          item.bpn.toLowerCase().includes(query) ||
          String(item.persil || '').toLowerCase().includes(query) ||
          item.noSertifikat.toLowerCase().includes(query) ||
          item.asset.toLowerCase().includes(query);
        if (!matchesQuery) return false;
      }

      // ULTG
      if (selectedUltg !== 'ALL' && item.ultg !== selectedUltg) {
        return false;
      }

      // Status
      if (selectedStatus === 'TERBIT') {
        if (item.statusDisplay !== 'TERBIT' && item.tahapan < 17) return false;
      } else if (selectedStatus === 'PROSES') {
        if (item.statusDisplay === 'TERBIT' || item.tahapan >= 17 || item.tahapan === 0) return false;
      } else if (selectedStatus === 'BELUM') {
        if (item.tahapan !== 0 && item.statusDisplay !== 'BELUM PROSES') return false;
      } else if (selectedStatus === 'KENDALA') {
        if (!item.kendala || item.kendala.toLowerCase().includes('lancar') || item.kendala === '-') return false;
      }

      // Kategori
      if (selectedKategori !== 'ALL' && item.kategori !== selectedKategori) {
        return false;
      }

      // Coordinate Type
      if (coordTypeFilter === 'VERIFIED' && !item.isVerifiedGps) return false;
      if (coordTypeFilter === 'ESTIMATED' && item.isVerifiedGps) return false;

      return true;
    });
  }, [processedAssets, searchTerm, selectedUltg, selectedStatus, selectedKategori, coordTypeFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = filteredAssets.length;
    const terbit = filteredAssets.filter((a) => a.statusDisplay === 'TERBIT' || a.tahapan >= 17).length;
    const proses = total - terbit;
    const verified = filteredAssets.filter((a) => a.isVerifiedGps).length;
    const totalLuas = filteredAssets.reduce((acc, a) => acc + (a.luas || 0), 0);
    return { total, terbit, proses, verified, totalLuas };
  }, [filteredAssets]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Center in Madiun - East Java
      const map = L.map(mapContainerRef.current, {
        center: [-7.6298, 111.5239],
        zoom: 10,
        zoomControl: false,
      });

      // Add zoom control in top right
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Tile layer
      const layerConfig = TILE_LAYERS[activeLayer];
      const tileLayer = L.tileLayer(layerConfig.url, {
        attribution: layerConfig.attribution,
        maxZoom: 19,
      }).addTo(map);

      tileLayerRef.current = tileLayer;

      // Group for asset markers
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Base Tile Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const layerConfig = TILE_LAYERS[activeLayer];
    tileLayerRef.current.setUrl(layerConfig.url);
  }, [activeLayer]);

  // Recalculate map size when sidebar is hidden/shown or fullscreen toggled
  useEffect(() => {
    const timer1 = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);
    const timer2 = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 350);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [sidebarOpen, isFullscreen]);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Create custom marker icons with concise CBM Asset tagging label
  const createMarkerIcon = (
    item: (typeof processedAssets)[0],
    isSelected: boolean,
    showCbmTag: boolean
  ) => {
    const isTerbit = item.statusDisplay === 'TERBIT' || item.tahapan >= 17;
    const hasKendala = item.kendala && !item.kendala.toLowerCase().includes('lancar') && item.kendala !== '-';
    const conciseCbm = item.conciseCbm || getConciseCbmName(item);

    let pinColor = '#059669'; // Emerald for TERBIT
    let badgeText = 'TERBIT';
    if (!isTerbit) {
      if (item.tahapan === 0) {
        pinColor = '#0284c7'; // Blue for Belum Proses
        badgeText = 'BELUM';
      } else {
        pinColor = '#d97706'; // Amber for Tahapan BPN 1-16
        badgeText = `T.${item.tahapan}`;
      }
    }

    const ringEffect = isSelected
      ? 'ring-4 ring-amber-400 ring-offset-2 scale-110 z-50'
      : hasKendala
      ? 'ring-2 ring-rose-500 ring-offset-1'
      : 'hover:scale-110';

    const html = `
      <div class="relative flex flex-col items-center cursor-pointer transition-transform ${ringEffect}" style="width: 140px; pointer-events: auto;">
        <!-- Pin Group -->
        <div class="relative flex flex-col items-center">
          <!-- Status Pill at Top -->
          <span class="absolute -top-2.5 bg-slate-900 text-white font-bold text-[8px] px-1 py-0.2 rounded shadow-xs border border-white/40 whitespace-nowrap z-10">
            ${badgeText}
          </span>
          <!-- Round Pin Icon -->
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg font-extrabold text-[10px]" style="background-color: ${pinColor}; border: 2px solid white;">
            ${
              item.kategori === 'TOWER'
                ? '⚡'
                : item.kategori === 'GARDU INDUK'
                ? '🏭'
                : item.kategori === 'RUMAH DINAS'
                ? '🏠'
                : item.kategori === 'KANTOR'
                ? '🏢'
                : item.kategori === 'EX. GARDU INDUK'
                ? '🏚️'
                : '📍'
            }
          </div>
          <!-- Pin Pointer Arrow -->
          <div class="w-2.5 h-2.5 -mt-1.5 rotate-45" style="background-color: ${pinColor};"></div>
        </div>

        <!-- Tagging Lokasi Nama Aset CBM Ringkas -->
        ${
          showCbmTag
            ? `
          <div class="mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold shadow-md border whitespace-nowrap tracking-tight transition-all flex items-center gap-1 max-w-[136px] ${
            isSelected
              ? 'bg-amber-400 text-slate-950 border-amber-500 ring-2 ring-amber-300 font-extrabold shadow-lg'
              : 'bg-slate-900/90 text-white border-slate-700/80 backdrop-blur-xs'
          }">
            <span class="text-[7.5px] font-mono font-black px-1 py-0.2 rounded ${
              isSelected ? 'bg-amber-700 text-white' : 'bg-emerald-600 text-white'
            } flex-shrink-0">
              CBM
            </span>
            <span class="truncate font-semibold">${conciseCbm}</span>
          </div>
        `
            : ''
        }
      </div>
    `;

    return L.divIcon({
      className: 'custom-leaflet-marker',
      html,
      iconSize: [140, showCbmTag ? 64 : 46],
      iconAnchor: [70, 36],
      popupAnchor: [0, -38],
    });
  };

  // Re-render markers when filtered assets change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    markersLayer.clearLayers();
    markersMapRef.current.clear();

    const bounds = L.latLngBounds([]);

    filteredAssets.forEach((item) => {
      const isSelected = item.id === selectedAssetId;
      const conciseCbm = item.conciseCbm || getConciseCbmName(item);
      const icon = createMarkerIcon(item, isSelected, showCbmLabels);
      const marker = L.marker([item.parsedLat, item.parsedLng], { icon });

      // Popup HTML
      const isTerbit = item.statusDisplay === 'TERBIT' || item.tahapan >= 17;
      const statusBadge = isTerbit
        ? `<span style="background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 2px 8px; border-radius: 9999px; font-weight: bold; font-size: 10px;">SERTIFIKAT SUDAH TERBIT</span>`
        : `<span style="background-color: #fffbeb; color: #b45309; border: 1px solid #fde68a; padding: 2px 8px; border-radius: 9999px; font-weight: bold; font-size: 10px;">PROSES BPN: TAHAPAN ${item.tahapan}</span>`;

      const popupContent = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 250px; max-width: 320px; color: #1e293b; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
            <div style="font-weight: 800; font-size: 13px; color: #0f172a;">${item.asetProperti || item.asetLapangan}</div>
            ${statusBadge}
          </div>

          <!-- Tagging Lokasi CBM Ringkas -->
          <div style="display: inline-flex; align-items: center; gap: 6px; background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 2px 8px; border-radius: 6px; margin-bottom: 8px;">
            <span style="background-color: #047857; color: white; font-family: monospace; font-size: 9px; font-weight: 800; padding: 1px 4px; border-radius: 3px;">CBM</span>
            <span style="font-weight: 800; font-size: 11px; color: #065f46;">${conciseCbm}</span>
            ${item.asetCbm && item.asetCbm !== '-' && item.asetCbm !== conciseCbm ? `<span style="font-size: 10px; color: #64748b; font-family: monospace;">(${item.asetCbm})</span>` : ''}
          </div>

          <div style="font-size: 11px; color: #475569; margin-bottom: 8px; font-weight: 600;">
            ${item.penghantar}
          </div>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; font-size: 11px; margin-bottom: 10px; display: grid; grid-template-columns: 1fr; gap: 4px;">
            <div><strong>Tag Aset CBM:</strong> <span style="font-family: monospace; font-weight: bold; color: #0f172a; background-color: #f1f5f9; padding: 1px 5px; border-radius: 4px;">${conciseCbm}</span></div>
            <div><strong>Wilayah:</strong> Desa ${item.desa || '-'}, Kec. ${item.kecamatan || '-'}</div>
            <div><strong>Kantah:</strong> ${item.bpn} (${item.ultg})</div>
            <div><strong>Luas Tanah:</strong> <span style="font-weight: bold; color: #047857;">${(item.luas || 0).toLocaleString('id-ID')} m²</span> (Jml Persil: ${item.persil || '-'})</div>
            <div><strong>Sertifikat / NIB:</strong> ${item.noSertifikat !== '-' ? item.noSertifikat : 'Dalam Proses'}</div>
            <div><strong>Koordinat:</strong> ${
              item.koordinat && item.koordinat !== '-'
                ? `<span style="font-family: monospace; font-size: 10px; background-color: #e2e8f0; padding: 1px 4px; border-radius: 4px;">${item.koordinat}</span>`
                : `<span style="color: #94a3b8; font-style: italic; font-size: 10px;">Kosong (Estimasi Wilayah)</span>`
            }</div>
            ${
              item.kendala && item.kendala !== '-' && !item.kendala.toLowerCase().includes('lancar')
                ? `<div style="color: #b91c1c; font-size: 10px; margin-top: 4px; border-top: 1px dashed #cbd5e1; padding-top: 4px;"><strong>Kendala:</strong> ${item.kendala}</div>`
                : ''
            }
          </div>

          <div style="display: flex; gap: 6px;">
            <button
              id="btn-popup-detail-${item.id}"
              data-asset-id="${item.id}"
              style="flex: 1; background-color: #047857; color: white; border: none; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer;"
            >
              Lihat Detail Persil
            </button>
            <a
              href="https://www.google.com/maps?q=${item.parsedLat.toFixed(6)},${item.parsedLng.toFixed(6)}"
              target="_blank"
              rel="noopener noreferrer"
              style="background-color: #334155; color: white; text-decoration: none; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; display: inline-flex; align-items: center;"
              title="Buka Google Maps"
            >
              Google Maps
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 320 });

      marker.on('click', () => {
        setSelectedAssetId(item.id);
      });

      marker.addTo(markersLayer);
      markersMapRef.current.set(item.id, marker);
      bounds.extend([item.parsedLat, item.parsedLng]);
    });

    // Auto fit bounds if markers exist and no individual asset is currently actively focused
    if (filteredAssets.length > 0 && !selectedAssetId) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [filteredAssets, selectedAssetId, showCbmLabels]);

  // Delegated event listener for "Lihat Detail Persil" button in Leaflet Popups
  useEffect(() => {
    const handleMapContainerClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.matches('button[data-asset-id]')) {
        const assetId = target.getAttribute('data-asset-id');
        const found = assets.find((a) => a.id === assetId);
        if (found) {
          onOpenDetailModal(found);
        }
      }
    };

    const container = mapContainerRef.current;
    if (container) {
      container.addEventListener('click', handleMapContainerClick);
    }

    return () => {
      if (container) {
        container.removeEventListener('click', handleMapContainerClick);
      }
    };
  }, [assets, onOpenDetailModal]);

  // Center/Fly to selected asset
  const handleFlyToAsset = (asset: (typeof processedAssets)[0]) => {
    setSelectedAssetId(asset.id);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([asset.parsedLat, asset.parsedLng], 17, {
        duration: 1.2,
      });
      const marker = markersMapRef.current.get(asset.id);
      if (marker) {
        setTimeout(() => marker.openPopup(), 400);
      }
    }
  };

  // Reset to see all markers
  const handleFitAllMarkers = () => {
    setSelectedAssetId(null);
    if (!mapInstanceRef.current || filteredAssets.length === 0) return;
    const bounds = L.latLngBounds([]);
    filteredAssets.forEach((a) => bounds.extend([a.parsedLat, a.parsedLng]));
    mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  };

  // Export GeoJSON
  const handleExportGeoJson = () => {
    const featureCollection = {
      type: 'FeatureCollection',
      features: filteredAssets.map((a) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [a.parsedLng, a.parsedLat],
        },
        properties: {
          id: a.id,
          asetProperti: a.asetProperti || a.asetLapangan,
          asetCbm: a.asetCbm || '-',
          asetLapangan: a.asetProperti || a.asetLapangan,
          penghantar: a.penghantar,
          ultg: a.ultg,
          bpn: a.bpn,
          desa: a.desa,
          kecamatan: a.kecamatan,
          status: a.statusDisplay,
          tahapan: a.tahapan,
          persil: a.persil || '-',
          luas: a.luas,
          noSertifikat: a.noSertifikat,
          kategori: a.kategori,
          kendala: a.kendala,
        },
      })),
    };

    const blob = new Blob([JSON.stringify(featureCollection, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Peta_Aset_Tanah_PLN_UPT_Madiun_${new Date().toISOString().slice(0, 10)}.geojson`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy all coordinates to clipboard
  const handleCopyAllCoordinates = () => {
    const lines = [
      'ID;Aset Properti;Aset CBM;Penghantar;ULTG;BPN;Status;Latitude;Longitude',
      ...filteredAssets.map(
        (a) =>
          `${a.id};"${a.asetProperti || a.asetLapangan}";"${a.asetCbm || '-'}";"${a.penghantar}";${a.ultg};"${a.bpn}";${a.statusDisplay};${a.parsedLat};${a.parsedLng}`
      ),
    ].join('\n');

    navigator.clipboard.writeText(lines).then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    });
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Banner: Statistics & Quick Actions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <Compass className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  Peta Spasial Sebaran Aset Tanah PLN UPT Madiun
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visualisasi GIS lokasi tapak tower transmisi, gardu induk, dan persil tanah BPN
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-2">
              <span className="text-xs text-slate-500">Terpetakan:</span>
              <span className="font-extrabold text-xs text-slate-900">
                {stats.total} Persil
              </span>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              <span className="text-xs text-emerald-700 font-semibold">Terbit:</span>
              <span className="font-extrabold text-xs text-emerald-800">{stats.terbit}</span>
            </div>

            <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="text-xs text-amber-700 font-semibold">Proses BPN:</span>
              <span className="font-extrabold text-xs text-amber-800">{stats.proses}</span>
            </div>

            <div className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl flex items-center gap-2">
              <LocateFixed className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs text-blue-700 font-semibold">GPS Riil:</span>
              <span className="font-extrabold text-xs text-blue-800">{stats.verified}</span>
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              <button
                id="btn-toggle-maximize-map"
                type="button"
                onClick={() => setSidebarOpen((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-2xs border ${
                  !sidebarOpen
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/20'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                }`}
                title={
                  sidebarOpen
                    ? 'Sembunyikan data persil agar peta tampil maksimal selebar layar'
                    : 'Tampilkan kembali panel data persil'
                }
              >
                {sidebarOpen ? (
                  <>
                    <PanelLeftClose className="w-3.5 h-3.5 text-slate-500" />
                    <span className="hidden sm:inline">Maksimalkan Peta</span>
                    <span className="sm:hidden">Peta Penuh</span>
                  </>
                ) : (
                  <>
                    <PanelLeftOpen className="w-3.5 h-3.5 text-white" />
                    <span className="hidden sm:inline">Tampilkan Data Persil</span>
                    <span className="sm:hidden">Buka Data</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleFitAllMarkers}
                className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors shadow-2xs"
                title="Pusatkan peta untuk melihat seluruh aset yang terfilter"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pusatkan Peta</span>
              </button>

              <button
                type="button"
                onClick={handleExportGeoJson}
                className="inline-flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors shadow-2xs"
                title="Unduh data spasial GeoJSON untuk aplikasi GIS atau Google Earth"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ekspor GeoJSON</span>
              </button>

              <button
                type="button"
                onClick={handleCopyAllCoordinates}
                className="p-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl transition-colors"
                title="Salin daftar koordinat seluruh aset"
              >
                {copiedAll ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-500" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari tapak tower, desa, jalur..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Filter ULTG */}
          <div>
            <select
              value={selectedUltg}
              onChange={(e) => setSelectedUltg(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Semua Unit (ULTG)</option>
              <option value="ULTG MADIUN">ULTG MADIUN</option>
              <option value="ULTG KEDIRI">ULTG KEDIRI</option>
              <option value="ULTG BABAT">ULTG BABAT</option>
            </select>
          </div>

          {/* Filter Status */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Semua Status Sertifikasi</option>
              <option value="TERBIT">Sertifikat Sudah Terbit</option>
              <option value="PROSES">Dalam Proses BPN (1-16)</option>
              <option value="BELUM">Belum Diproses</option>
              <option value="KENDALA">Ada Kendala Lapangan</option>
            </select>
          </div>

          {/* Filter Kategori */}
          <div>
            <select
              value={selectedKategori}
              onChange={(e) => setSelectedKategori(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Semua Jenis Aset</option>
              <option value="TOWER">⚡ Tapak Tower (SUTT/SUTET)</option>
              <option value="GARDU INDUK">🏭 Gardu Induk (GI)</option>
              <option value="RUMAH DINAS">🏠 Rumah Dinas</option>
              <option value="TANAH KOSONG">📍 Tanah Kosong / Lainnya</option>
              <option value="KANTOR">🏢 Kantor / Gedung Operasional</option>
              <option value="EX. GARDU INDUK">🏚️ Ex. Gardu Induk</option>
            </select>
          </div>

          {/* Layer Peta Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveLayer('satellite')}
              className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all text-center ${
                activeLayer === 'satellite'
                  ? 'bg-emerald-800 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Satelit
            </button>
            <button
              type="button"
              onClick={() => setActiveLayer('roadmap')}
              className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all text-center ${
                activeLayer === 'roadmap'
                  ? 'bg-emerald-800 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Jalan
            </button>
            <button
              type="button"
              onClick={() => setActiveLayer('positron')}
              className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all text-center ${
                activeLayer === 'positron'
                  ? 'bg-emerald-800 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bersih
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area: Map Canvas + Persil List Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Side: Asset Persil Directory (Collapsible) */}
        {sidebarOpen && (
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col h-[700px] animate-in fade-in slide-in-from-left-4 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ListFilter className="w-4 h-4 text-emerald-700" />
                <span className="font-bold text-xs text-slate-800">
                  Daftar Persil ({filteredAssets.length})
                </span>
              </div>
              <button
                id="btn-hide-persil-sidebar"
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors border border-slate-200 shadow-2xs cursor-pointer"
                title="Sembunyikan panel data persil untuk memaksimalkan area peta"
              >
                <PanelLeftClose className="w-3.5 h-3.5 text-slate-500" />
                <span>Sembunyikan</span>
              </button>
            </div>

            {/* Scrollable list of items */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 mt-2.5">
              {filteredAssets.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <MapPin className="w-8 h-8 mx-auto text-slate-300 stroke-1" />
                  <p className="text-xs">Tidak ada aset yang sesuai kriteria filter.</p>
                </div>
              ) : (
                filteredAssets.map((item) => {
                  const isSelected = item.id === selectedAssetId;
                  const isTerbit = item.statusDisplay === 'TERBIT' || item.tahapan >= 17;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleFlyToAsset(item)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-emerald-50/80 border-emerald-500 shadow-xs ring-2 ring-emerald-400/20'
                          : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                isTerbit
                                  ? 'bg-emerald-500'
                                  : item.tahapan === 0
                                  ? 'bg-sky-500'
                                  : 'bg-amber-500'
                              }`}
                            ></span>
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {item.asetProperti || item.asetLapangan}
                            </span>
                            <span
                              className="text-[9px] font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex-shrink-0 flex items-center gap-1"
                              title={`Tagging CBM: ${item.conciseCbm}${item.asetCbm && item.asetCbm !== '-' ? ` (${item.asetCbm})` : ''}`}
                            >
                              <span className="text-[7.5px] bg-emerald-600 text-white px-0.5 rounded font-black">CBM</span>
                              <span>{item.conciseCbm.replace(/^CBM\s*/i, '')}</span>
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 truncate mt-0.5">
                            {item.penghantar}
                          </div>
                        </div>

                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap flex-shrink-0 ${
                            isTerbit
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-amber-100 text-amber-900 border-amber-200'
                          }`}
                        >
                          {item.statusDisplay}
                        </span>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                        <span>
                          {item.desa ? `${item.desa}, ` : ''}
                          {item.bpn}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9px] text-slate-400">
                            {item.koordinat && item.koordinat !== '-' ? (
                              item.koordinat
                            ) : (
                              <span className="italic text-slate-400">Kosong</span>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenDetailModal(item);
                            }}
                            className="text-emerald-700 hover:text-emerald-800 font-bold"
                            title="Buka detail modal"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Map Legend */}
            <div className="mt-3 pt-3 border-t border-slate-200 text-[10px] text-slate-500 space-y-1.5">
              <div className="font-bold text-slate-700 flex items-center gap-1">
                <Info className="w-3 h-3 text-slate-400" />
                Legenda Simbol & Taging Peta
              </div>
              <div className="grid grid-cols-2 gap-1 text-[9px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  <span>Sertifikat Terbit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span>Tahapan BPN (1-16)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                  <span>Belum Proses</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full ring-2 ring-rose-500 bg-white"></span>
                  <span>Ada Kendala</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 text-[9px] text-slate-600 font-medium">
                <span className="text-[7.5px] bg-slate-900 text-white font-mono font-bold px-1 rounded">CBM</span>
                <span>Tagging Pin: Nama Aset CBM Ringkas (T.xx / GI / Kode)</span>
              </div>
            </div>
          </div>
        )}

        {/* Right Side: Interactive Leaflet Map View */}
        <div
          className={`${
            isFullscreen
              ? 'fixed inset-2 sm:inset-4 z-50 shadow-2xl rounded-2xl'
              : sidebarOpen
              ? 'lg:col-span-8'
              : 'lg:col-span-12'
          } bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs relative flex flex-col ${
            isFullscreen ? 'h-auto' : 'h-[700px]'
          } transition-all duration-200`}
        >
          {/* Map Top Bar */}
          <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              {!sidebarOpen && (
                <button
                  id="btn-open-sidebar-header"
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg border border-emerald-500/50 shadow-xs mr-2 transition-colors cursor-pointer"
                  title="Tampilkan kembali panel daftar persil"
                >
                  <PanelLeftOpen className="w-3.5 h-3.5" />
                  <span>Tampilkan Data Persil ({filteredAssets.length})</span>
                </button>
              )}
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>Peta Interaktif GIS Persil Transmisi & Gardu Induk</span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Toggle Taging Nama Aset CBM Ringkas */}
              <button
                id="btn-toggle-cbm-labels"
                type="button"
                onClick={() => setShowCbmLabels(!showCbmLabels)}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                  showCbmLabels
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-2xs'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                }`}
                title="Tampilkan atau sembunyikan label nama aset CBM ringkas pada pin peta"
              >
                <Tag className="w-3.5 h-3.5 text-emerald-300" />
                <span className="hidden sm:inline">Tag CBM: {showCbmLabels ? 'Aktif' : 'Nonaktif'}</span>
                <span className="sm:hidden">CBM: {showCbmLabels ? 'ON' : 'OFF'}</span>
              </button>

              <div className="text-[11px] text-slate-300 font-medium hidden md:inline">
                Layer:{' '}
                <strong className="text-emerald-300">{TILE_LAYERS[activeLayer].name}</strong>
              </div>

              <button
                id="btn-toggle-fullscreen"
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                title={isFullscreen ? 'Keluar dari Mode Layar Penuh (ESC)' : 'Tampilkan Peta Layar Penuh (Fullscreen)'}
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Keluar Penuh</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Layar Penuh</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Leaflet Canvas Container */}
          <div ref={mapContainerRef} className="flex-1 w-full relative z-0 bg-slate-200" />

          {/* Floating toggle pill when sidebar is hidden */}
          {!sidebarOpen && (
            <div className="absolute top-14 left-4 z-10">
              <button
                id="btn-floating-show-persil"
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="inline-flex items-center gap-2 bg-white/95 hover:bg-white text-slate-800 font-bold text-xs px-3.5 py-2 rounded-xl shadow-xl border border-slate-200/90 backdrop-blur-xs transition-all hover:scale-105 cursor-pointer"
                title="Buka kembali panel daftar persil"
              >
                <PanelLeftOpen className="w-4 h-4 text-emerald-700" />
                <span>Buka Data Persil ({filteredAssets.length})</span>
              </button>
            </div>
          )}

          {/* Quick Floating Map Helper */}
          <div className="absolute bottom-3 left-3 z-10 bg-slate-900/85 backdrop-blur-xs text-white px-3 py-1.5 rounded-xl text-[10px] border border-slate-700/60 flex items-center gap-2 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>
              Klik pin pada peta untuk melihat detail sertifikasi, koordinat, dan petunjuk navigasi
              Google Maps.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
