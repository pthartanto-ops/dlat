import React, { useState, useMemo } from 'react';
import { AssetItem } from '../types';
import {
  MapPin,
  Navigation,
  ExternalLink,
  Copy,
  Check,
  Layers,
  Globe,
  Compass,
  Maximize2,
  AlertCircle,
  Map as MapIcon,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';

interface AssetLocationMapProps {
  asset: AssetItem;
}

export type MapMode = 'google-satellite' | 'google-roadmap' | 'osm';

// Known coordinates for BPN / ULTG administrative areas in East Java (PLN UPT Madiun jurisdiction)
const REGION_COORDINATES: Record<string, { lat: number; lng: number; label: string }> = {
  madiun: { lat: -7.6298, lng: 111.5239, label: 'Kota/Kabupaten Madiun' },
  kediri: { lat: -7.8164, lng: 112.0118, label: 'Kediri' },
  babat: { lat: -7.1128, lng: 112.1636, label: 'Babat, Lamongan' },
  lamongan: { lat: -7.1195, lng: 112.4158, label: 'Lamongan' },
  ngawi: { lat: -7.4039, lng: 111.4462, label: 'Ngawi' },
  magetan: { lat: -7.6493, lng: 111.3283, label: 'Magetan' },
  ponorogo: { lat: -7.8697, lng: 111.4623, label: 'Ponorogo' },
  pacitan: { lat: -8.2045, lng: 111.0921, label: 'Pacitan' },
  bojonegoro: { lat: -7.1502, lng: 111.8817, label: 'Bojonegoro' },
  tuban: { lat: -6.8976, lng: 112.0649, label: 'Tuban' },
  nganjuk: { lat: -7.6049, lng: 111.9009, label: 'Nganjuk' },
  trenggalek: { lat: -8.0504, lng: 111.7082, label: 'Trenggalek' },
  tulungagung: { lat: -8.0652, lng: 111.9015, label: 'Tulungagung' },
  blitar: { lat: -8.0983, lng: 112.1681, label: 'Blitar' },
};

export function parseCoordinates(
  coordStr?: string,
  bpn?: string,
  ultg?: string
): { lat: number; lng: number; isValid: boolean; isEstimated: boolean; note: string } {
  if (coordStr && typeof coordStr === 'string' && coordStr.trim() !== '' && coordStr.trim() !== '-') {
    // Normalize string: remove words like Lat:, Lng:, Longitude:, etc.
    const cleaned = coordStr
      .replace(/latitude/gi, '')
      .replace(/longitude/gi, '')
      .replace(/lat/gi, '')
      .replace(/lng/gi, '')
      .replace(/lon/gi, '')
      .replace(/[^\d.,;-\s]/g, '')
      .trim();

    // Match two numbers with decimal points
    const match = cleaned.match(/([-+]?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*([-+]?\d{1,3}(?:\.\d+)?)/);

    if (match) {
      let lat = parseFloat(match[1]);
      let lng = parseFloat(match[2]);

      // Detect swapped coordinates: Indonesia has Lat ~ -6 to -11 and Lng ~ 95 to 141
      if (lat > 90 && lng <= 90) {
        const temp = lat;
        lat = lng;
        lng = temp;
      } else if (lat > 0 && lat > 90 && lng < 0) {
        const temp = lat;
        lat = lng;
        lng = temp;
      }

      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return {
          lat,
          lng,
          isValid: true,
          isEstimated: false,
          note: 'Koordinat GPS Terverifikasi Lapangan',
        };
      }
    }
  }

  // Fallback to estimated region
  const searchKey = `${bpn || ''} ${ultg || ''}`.toLowerCase();
  for (const [key, val] of Object.entries(REGION_COORDINATES)) {
    if (searchKey.includes(key)) {
      return {
        lat: val.lat,
        lng: val.lng,
        isValid: true,
        isEstimated: true,
        note: `Koordinat Perkiraan Area ${val.label}`,
      };
    }
  }

  // Default to Madiun Center
  return {
    lat: -7.6298,
    lng: 111.5239,
    isValid: true,
    isEstimated: true,
    note: 'Koordinat Default Wilayah Kerja UPT Madiun',
  };
}

export const AssetLocationMap: React.FC<AssetLocationMapProps> = ({ asset }) => {
  const [mapMode, setMapMode] = useState<MapMode>('google-satellite');
  const [zoomLevel, setZoomLevel] = useState<number>(17);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const coords = useMemo(() => {
    return parseCoordinates(asset.koordinat, asset.bpn, asset.ultg);
  }, [asset.koordinat, asset.bpn, asset.ultg]);

  const handleCopyCoordinates = () => {
    const textToCopy = `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 1, 20));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 1, 12));
  };

  const handleResetView = () => {
    setZoomLevel(17);
  };

  // Construct iframe embed URL based on mapMode
  const embedUrl = useMemo(() => {
    const lat = coords.lat;
    const lng = coords.lng;

    if (mapMode === 'osm') {
      // OpenStreetMap embed
      const delta = 0.005 * Math.pow(2, 17 - zoomLevel);
      const minLon = (lng - delta).toFixed(6);
      const minLat = (lat - delta * 0.7).toFixed(6);
      const maxLon = (lng + delta).toFixed(6);
      const maxLat = (lat + delta * 0.7).toFixed(6);
      return `https://www.openstreetmap.org/export/embed.html?bbox=${minLon}%2C${minLat}%2C${maxLon}%2C${maxLat}&layer=mapnik&marker=${lat.toFixed(6)}%2C${lng.toFixed(6)}`;
    }

    if (mapMode === 'google-satellite') {
      // Google Maps Satellite / Hybrid embed
      return `https://maps.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}&t=k&z=${zoomLevel}&ie=UTF8&iwloc=&output=embed`;
    }

    // Google Maps Roadmap
    return `https://maps.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}&t=m&z=${zoomLevel}&ie=UTF8&iwloc=&output=embed`;
  }, [coords.lat, coords.lng, mapMode, zoomLevel]);

  const googleMapsUrl = `https://www.google.com/maps?q=${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`;

  return (
    <div
      className={`border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs transition-all ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl flex flex-col' : 'relative'
      }`}
    >
      {/* Map Header Toolbar */}
      <div className="bg-slate-900 text-white px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-white">Visualisasi Peta Persil Tanah</span>
              {coords.isEstimated ? (
                <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded">
                  <AlertCircle className="w-2.5 h-2.5" />
                  Perkiraan Wilayah
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded">
                  <Check className="w-2.5 h-2.5" />
                  GPS Presisi
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-300 font-mono flex items-center gap-1.5">
              <span>{coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">{coords.note}</span>
            </div>
          </div>
        </div>

        {/* Map Layer Mode Switcher */}
        <div className="flex items-center gap-1.5">
          <div className="bg-slate-800 p-0.5 rounded-lg flex items-center border border-slate-700">
            <button
              type="button"
              onClick={() => setMapMode('google-satellite')}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                mapMode === 'google-satellite'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Citra Satelit Google Maps"
            >
              <Globe className="w-3 h-3" />
              Satelit
            </button>
            <button
              type="button"
              onClick={() => setMapMode('google-roadmap')}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                mapMode === 'google-roadmap'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Peta Jalan Google Maps"
            >
              <MapIcon className="w-3 h-3" />
              Peta Jalan
            </button>
            <button
              type="button"
              onClick={() => setMapMode('osm')}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                mapMode === 'osm'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="OpenStreetMap Standard"
            >
              <Layers className="w-3 h-3" />
              OSM
            </button>
          </div>

          {/* Quick Actions */}
          <button
            type="button"
            onClick={handleCopyCoordinates}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg transition-colors text-[11px]"
            title="Salin Koordinat GPS"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition-colors shadow-2xs"
            title="Buka di Google Maps (Tab Baru)"
          >
            <ExternalLink className="w-3 h-3" />
            Buka Peta
          </a>

          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-[10px] font-bold transition-colors shadow-2xs"
            title="Petunjuk Arah Navigasi ke Lokasi Tapak"
          >
            <Navigation className="w-3 h-3" />
            Rute
          </a>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg transition-colors"
            title={isFullscreen ? 'Kecilkan Peta' : 'Perbesar Peta (Layar Penuh)'}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Map Canvas / iFrame Container */}
      <div className={`relative w-full bg-slate-100 ${isFullscreen ? 'flex-1' : 'h-64 sm:h-72'}`}>
        <iframe
          key={`${mapMode}-${coords.lat}-${coords.lng}-${zoomLevel}`}
          title={`Peta Lokasi ${asset.asetLapangan}`}
          src={embedUrl}
          className="w-full h-full border-0"
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
        />

        {/* Floating Zoom Controls */}
        <div className="absolute top-3 right-3 flex flex-col gap-1 bg-white/95 backdrop-blur-xs border border-slate-300 rounded-lg shadow-md p-1 z-10">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-slate-100 text-slate-700 rounded transition-colors"
            title="Perbesar Peta (Zoom In)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-slate-100 text-slate-700 rounded transition-colors"
            title="Perkecil Peta (Zoom Out)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetView}
            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded transition-colors border-t border-slate-200"
            title="Reset Zoom Default (17x)"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* Floating Bottom Card: Asset Location Summary */}
        <div className="absolute bottom-3 left-3 right-16 sm:right-auto sm:max-w-md bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-xl shadow-lg p-2.5 text-[11px] z-10 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {asset.asetLapangan}
            </div>
            <div className="text-[10px] text-slate-500 truncate mt-0.5">
              {asset.desa ? `Desa ${asset.desa}, ` : ''}
              {asset.kecamatan ? `Kec. ${asset.kecamatan}, ` : ''}
              {asset.bpn}
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <div className="text-[10px] font-bold text-slate-700 uppercase">
              {asset.kategori}
            </div>
            <div className="text-[10px] font-mono text-emerald-700 font-bold">
              {asset.luas.toLocaleString('id-ID')} m²
            </div>
          </div>
        </div>
      </div>

      {/* Map Footer Note */}
      <div className="bg-slate-50 px-3.5 py-1.5 border-t border-slate-200 flex flex-wrap items-center justify-between text-[10px] text-slate-500 gap-2">
        <div className="flex items-center gap-1.5">
          <Compass className="w-3 h-3 text-slate-400" />
          <span>
            Ketuk peta untuk bernavigasi dan melihat orientasi tapak tower & jalur ROW transmisi PLN.
          </span>
        </div>
        {copied && (
          <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded animate-pulse">
            Koordinat berhasil disalin!
          </span>
        )}
      </div>
    </div>
  );
};
