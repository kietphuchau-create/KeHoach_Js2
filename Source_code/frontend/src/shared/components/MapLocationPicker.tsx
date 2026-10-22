'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  MapPin, 
  Search, 
  Navigation, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Crosshair,
  Loader2,
  HelpCircle
} from 'lucide-react';

export interface LocationData {
  lat: number;
  lng: number;
  address?: string;
  isPinned: boolean;
}

interface MapLocationPickerProps {
  initialAddress?: string;
  initialLat?: number;
  initialLng?: number;
  onLocationChange: (data: LocationData) => void;
  required?: boolean;
}

// Default center: TP.HCM
const DEFAULT_LAT = 10.7769;
const DEFAULT_LNG = 106.7009;

export default function MapLocationPicker({
  initialAddress = '',
  initialLat,
  initialLng,
  onLocationChange,
  required = true
}: MapLocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);

  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [mapLayerType, setMapLayerType] = useState<'streets' | 'satellite'>('streets');
  
  // Marker state
  const [currentLat, setCurrentLat] = useState<number>(initialLat || DEFAULT_LAT);
  const [currentLng, setCurrentLng] = useState<number>(initialLng || DEFAULT_LNG);
  const [hasPinned, setHasPinned] = useState<boolean>(Boolean(initialLat && initialLng));
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [detectedAddress, setDetectedAddress] = useState<string>(initialAddress);

  // Load Leaflet dynamically
  const initLeafletLibraries = async (): Promise<any> => {
    if (typeof window === 'undefined') return null;
    if ((window as any).L) return (window as any).L;

    // Check if stylesheet is already attached
    if (!document.getElementById('leaflet-css-bundle')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css-bundle';
      link.rel = 'stylesheet';
      link.href = '/vendor/leaflet/leaflet.css';
      link.onerror = () => {
        // Fallback to unpkg CDN if local vendor fails
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      };
      document.head.appendChild(link);
    }

    return new Promise((resolve, reject) => {
      // Check if script already exists
      const existingScript = document.getElementById('leaflet-js-bundle');
      if (existingScript) {
        if ((window as any).L) return resolve((window as any).L);
        existingScript.addEventListener('load', () => resolve((window as any).L));
        return;
      }

      const script = document.createElement('script');
      script.id = 'leaflet-js-bundle';
      script.src = '/vendor/leaflet/leaflet.js';
      script.async = true;
      script.onload = () => resolve((window as any).L);
      script.onerror = () => {
        // Fallback to unpkg CDN
        const fallbackScript = document.createElement('script');
        fallbackScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        fallbackScript.onload = () => resolve((window as any).L);
        fallbackScript.onerror = () => reject(new Error('Không thể nạp thư viện bản đồ Leaflet. Vui lòng kiểm tra kết nối mạng.'));
        document.body.appendChild(fallbackScript);
      };
      document.body.appendChild(script);
    });
  };

  // Perform reverse geocode via Nominatim OSM
  const performReverseGeocode = async (lat: number, lng: number) => {
    setReverseGeocoding(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
        headers: {
          'Accept-Language': 'vi,en;q=0.9',
          'User-Agent': 'MedSchedClinicApp/1.0'
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          const addr = data.display_name;
          setDetectedAddress(addr);
          onLocationChange({
            lat,
            lng,
            address: addr,
            isPinned: true
          });
          return addr;
        }
      }
    } catch (e) {
      console.warn('Reverse geocoding error:', e);
    } finally {
      setReverseGeocoding(false);
    }

    // Default notification if reverse geocode fails or rate limits
    onLocationChange({
      lat,
      lng,
      address: detectedAddress || undefined,
      isPinned: true
    });
    return null;
  };

  // Handle location update when marker is moved
  const handleLocationUpdate = useCallback((lat: number, lng: number, shouldGeocode = true) => {
    setCurrentLat(lat);
    setCurrentLng(lng);
    setHasPinned(true);

    if (shouldGeocode) {
      performReverseGeocode(lat, lng);
    } else {
      onLocationChange({
        lat,
        lng,
        address: detectedAddress,
        isPinned: true
      });
    }
  }, [detectedAddress, onLocationChange]);

  // Initialize Map
  useEffect(() => {
    let isCancelled = false;

    const setupMap = async () => {
      if (!mapContainerRef.current) return;
      
      try {
        const L = await initLeafletLibraries();
        if (isCancelled || !L || !mapContainerRef.current) return;

        // Clean previous map instance if re-rendering
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const startLat = initialLat || DEFAULT_LAT;
        const startLng = initialLng || DEFAULT_LNG;
        const startZoom = initialLat && initialLng ? 16 : 13;

        // Create Leaflet Map
        const map = L.map(mapContainerRef.current, {
          center: [startLat, startLng],
          zoom: startZoom,
          zoomControl: false // We will add custom position
        });

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // Tile layer (OpenStreetMap Standard)
        const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        });

        streetLayer.addTo(map);
        tileLayerRef.current = streetLayer;

        // Custom Red Clinic Marker SVG (Google Maps Pin Style)
        const customPinIcon = L.divIcon({
          className: 'medsched-map-pin-container',
          html: `
            <div style="position: relative; width: 38px; height: 48px; cursor: grab; filter: drop-shadow(0 6px 10px rgba(0,0,0,0.35)); transition: transform 0.15s ease;">
              <svg viewBox="0 0 384 512" width="38" height="48" style="display: block;">
                <path fill="#EF4444" d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0z"/>
                <circle cx="192" cy="192" r="84" fill="#FFFFFF"/>
                <path fill="#DC2626" d="M176 136h32v40h40v32h-40v40h-32v-40h-40v-32h40z"/>
              </svg>
              <div style="position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%); width: 14px; height: 5px; background: rgba(0,0,0,0.25); border-radius: 50%; filter: blur(2px);"></div>
            </div>
          `,
          iconSize: [38, 48],
          iconAnchor: [19, 48],
          popupAnchor: [0, -48]
        });

        // Create Draggable Marker
        const marker = L.marker([startLat, startLng], {
          icon: customPinIcon,
          draggable: true,
          autoPan: true
        }).addTo(map);

        marker.bindPopup(`
          <div style="text-align: center; font-family: inherit; font-size: 12px; padding: 4px;">
            <strong style="color: #DC2626;">📍 Ghim Vị Trí Phòng Khám</strong>
            <p style="margin: 4px 0 0; color: #4B5563;">Kéo thả ghim này đến đúng vị trí thực tế của cơ sở để AI & Google Maps dẫn đường chính xác.</p>
          </div>
        `);

        // Event: Dragging Marker
        marker.on('dragstart', () => {
          marker.closePopup();
        });

        marker.on('dragend', (e: any) => {
          const newPos = e.target.getLatLng();
          handleLocationUpdate(newPos.lat, newPos.lng, true);
        });

        // Event: Click on Map moves the marker
        map.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          handleLocationUpdate(lat, lng, true);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
        setIsMapReady(true);
        setMapError(null);

        // If initial coordinate was provided, announce it
        if (initialLat && initialLng) {
          setHasPinned(true);
        }
      } catch (err: any) {
        console.error('Lỗi khởi tạo bản đồ:', err);
        setMapError(err.message || 'Không thể tải bản đồ tương tác');
      }
    };

    setupMap();

    return () => {
      isCancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Switch between Street and Satellite Map Layer
  const toggleMapLayer = () => {
    if (!mapInstanceRef.current || !(window as any).L) return;
    const L = (window as any).L;

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    if (mapLayerType === 'streets') {
      // Switch to Esri World Imagery Satellite
      const satLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      });
      satLayer.addTo(mapInstanceRef.current);
      tileLayerRef.current = satLayer;
      setMapLayerType('satellite');
    } else {
      // Switch back to OSM Standard
      const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      });
      streetLayer.addTo(mapInstanceRef.current);
      tileLayerRef.current = streetLayer;
      setMapLayerType('streets');
    }
  };

  // Search Address / Landmark via Nominatim Geocoding
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setShowSearchResults(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.trim())}&limit=5&countrycodes=vn`, {
        headers: {
          'Accept-Language': 'vi,en;q=0.9',
          'User-Agent': 'MedSchedClinicApp/1.0'
        }
      });
      if (res.ok) {
        const results = await res.json();
        setSearchResults(results);
        if (results.length > 0) {
          // Auto select top result if pressed Enter
          selectSearchResult(results[0]);
        }
      }
    } catch (err) {
      console.warn('Search geocoding error:', err);
    } finally {
      setSearching(false);
    }
  };

  // Select a search result
  const selectSearchResult = (item: any) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    if (isNaN(lat) || isNaN(lng)) return;

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 17, { duration: 1.2 });
      markerRef.current.setLatLng([lat, lng]);
    }

    setDetectedAddress(item.display_name);
    handleLocationUpdate(lat, lng, false);
    setShowSearchResults(false);
  };

  // Current GPS Location
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Trình duyệt của bạn không hỗ trợ định vị GPS.');
      return;
    }

    setSearching(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSearching(false);
        const { latitude, longitude } = pos.coords;
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 17, { duration: 1.2 });
          markerRef.current.setLatLng([latitude, longitude]);
        }
        handleLocationUpdate(latitude, longitude, true);
      },
      (err) => {
        setSearching(false);
        alert(`Không thể lấy vị trí hiện tại: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Quick Preset Locations (TP.HCM branches)
  const setPresetLocation = (lat: number, lng: number, name: string) => {
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 17, { duration: 1.0 });
      markerRef.current.setLatLng([lat, lng]);
    }
    handleLocationUpdate(lat, lng, true);
  };

  const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${currentLat},${currentLng}`;
  const googleMapsDirUrl = `https://www.google.com/maps/dir/?api=1&destination=${currentLat},${currentLng}`;

  return (
    <div className="space-y-3">
      {/* Header bar with instructions and status badge */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="flex h-2 w-2 relative">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${hasPinned ? 'bg-emerald-400 opacity-75' : 'bg-red-400 opacity-75'}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${hasPinned ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
          </span>
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
            <MapPin size={14} className="text-red-500" />
            <span>Kéo Ghim Vị Trí Trên Bản Đồ</span>
            {required && <span className="text-red-500">* (Bắt buộc)</span>}
          </label>
        </div>

        {/* Verification Status Badge */}
        {hasPinned ? (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={13} className="text-emerald-600" />
            <span>Đã ghim vị trí chuẩn ({currentLat.toFixed(4)}, {currentLng.toFixed(4)})</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            <AlertCircle size={13} className="text-amber-600" />
            <span>Chưa ghim vị trí (Kéo ghim hoặc bấm bản đồ)</span>
          </div>
        )}
      </div>

      {/* Search & Map Control Toolbar */}
      <div className="relative">
        <div className="flex gap-2">
          {/* Quick search input */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              placeholder="Nhập địa chỉ hoặc địa danh (vd: 12 Trịnh Đình Thảo, Quận 1)..."
              className="w-full pl-8 pr-16 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-purple-500 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-purple-200 focus:outline-none transition"
            />
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <button
              type="button"
              onClick={() => handleSearch()}
              disabled={searching || !searchQuery.trim()}
              className="absolute right-1 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white rounded-lg text-[11px] font-medium transition cursor-pointer flex items-center gap-1"
            >
              {searching ? <Loader2 size={11} className="animate-spin" /> : <span>Tìm</span>}
            </button>
          </div>

          {/* GPS Current Location button */}
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            title="Định vị GPS vị trí của tôi"
            className="px-2.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 transition flex items-center gap-1 shadow-2xs cursor-pointer shrink-0"
          >
            <Crosshair size={14} className="text-blue-600" />
            <span className="hidden sm:inline">Vị trí của tôi</span>
          </button>

          {/* Toggle Satellite Layer */}
          <button
            type="button"
            onClick={toggleMapLayer}
            title="Đổi chế độ xem Vệ tinh / Đường phố"
            className="px-2.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 transition flex items-center gap-1 shadow-2xs cursor-pointer shrink-0"
          >
            <Layers size={14} className={mapLayerType === 'satellite' ? 'text-purple-600' : 'text-slate-500'} />
            <span className="hidden sm:inline">{mapLayerType === 'satellite' ? 'Vệ Tinh' : 'Bản Đồ'}</span>
          </button>
        </div>

        {/* Search Results Dropdown */}
        {showSearchResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
            <div className="p-1.5 bg-slate-50 border-b border-slate-100 flex justify-between items-center text-[11px] font-bold text-slate-600">
              <span>Kết quả tìm kiếm gợi ý:</span>
              <button
                type="button"
                onClick={() => setShowSearchResults(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Đóng
              </button>
            </div>
            {searchResults.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => selectSearchResult(item)}
                className="w-full text-left p-2 hover:bg-purple-50 text-xs text-slate-700 border-b border-slate-100 last:border-0 flex items-start gap-2 transition cursor-pointer"
              >
                <MapPin size={13} className="text-red-500 mt-0.5 shrink-0" />
                <span className="line-clamp-2">{item.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map Interactive Canvas */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 shadow-inner group">
        <div 
          ref={mapContainerRef} 
          className="w-full h-[280px] bg-slate-100"
          style={{ minHeight: '280px' }}
        />

        {/* Drag Hint Overlay Pill */}
        <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-medium px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
          <Navigation size={12} className="text-amber-400 animate-pulse" />
          <span>Kéo ghim đỏ hoặc click trên bản đồ để định vị chi nhánh</span>
        </div>

        {/* Reverse geocoding loading spinner overlay */}
        {reverseGeocoding && (
          <div className="absolute top-2.5 right-2.5 z-20 bg-white/95 backdrop-blur-md text-slate-800 text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1.5 border border-purple-200">
            <Loader2 size={12} className="animate-spin text-purple-600" />
            <span>Đang tra cứu địa chỉ...</span>
          </div>
        )}

        {/* Error Fallback */}
        {mapError && (
          <div className="absolute inset-0 z-20 bg-white/95 flex flex-col items-center justify-center p-4 text-center">
            <AlertCircle size={32} className="text-red-500 mb-2" />
            <p className="text-xs text-red-600 font-semibold mb-2">{mapError}</p>
            <p className="text-[11px] text-slate-500 max-w-sm">
              Bạn vẫn có thể nhập tọa độ hoặc mở Google Maps bên dưới để kiểm tra vị trí.
            </p>
          </div>
        )}
      </div>

      {/* Quick Branch Presets Bar */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="text-slate-400 font-medium">Gợi ý nhanh:</span>
        <button
          type="button"
          onClick={() => setPresetLocation(10.7725, 106.6267, 'Trịnh Đình Thảo (ITC)')}
          className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-purple-100 hover:text-purple-700 text-slate-600 transition cursor-pointer"
        >
          📍 Chi nhánh Trịnh Đình Thảo (ITC)
        </button>
        <button
          type="button"
          onClick={() => setPresetLocation(10.7485, 106.5982, 'Trần Đại Nghĩa')}
          className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-purple-100 hover:text-purple-700 text-slate-600 transition cursor-pointer"
        >
          📍 Chi nhánh Trần Đại Nghĩa
        </button>
        <button
          type="button"
          onClick={() => setPresetLocation(10.7769, 106.7009, 'Trung tâm Quận 1')}
          className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-purple-100 hover:text-purple-700 text-slate-600 transition cursor-pointer"
        >
          📍 Trung tâm Quận 1
        </button>
      </div>

      {/* Coordinates & Google Maps Verification Bar */}
      <div className="p-3 bg-gradient-to-r from-slate-50 to-purple-50/40 rounded-xl border border-slate-200 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <span className="font-semibold">Tọa độ đã chọn:</span>
            <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-purple-700 font-bold">
              Lat: {currentLat.toFixed(6)}, Lng: {currentLng.toFixed(6)}
            </span>
          </div>

          {/* Real Google Maps Verification Link */}
          <div className="flex items-center gap-2">
            <a
              href={googleMapsSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold shadow-2xs transition"
              title="Mở Google Maps thực tế để kiểm tra vị trí vừa ghim"
            >
              <span>Xem Thử Trên Google Maps</span>
              <ExternalLink size={12} />
            </a>
            <a
              href={googleMapsDirUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold shadow-2xs transition"
              title="Mở chỉ đường trên Google Maps"
            >
              <Navigation size={12} />
              <span>Chỉ Đường Thử</span>
            </a>
          </div>
        </div>

        {/* Address preview note */}
        {detectedAddress && (
          <div className="text-[11px] text-slate-600 bg-white/80 p-2 rounded-lg border border-slate-100 flex items-start gap-1.5">
            <MapPin size={12} className="text-red-500 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold text-slate-700">Địa chỉ phát hiện từ ghim: </span>
              <span className="text-slate-600">{detectedAddress}</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50/80 px-2.5 py-1.5 rounded-lg border border-amber-200">
          <HelpCircle size={13} className="shrink-0 text-amber-600" />
          <span>
            Hệ thống AI Đặt Lịch sẽ sử dụng tọa độ và địa chỉ này để chuyển hướng và chỉ đường Google Maps chính xác từng mét cho bệnh nhân.
          </span>
        </div>
      </div>
    </div>
  );
}
