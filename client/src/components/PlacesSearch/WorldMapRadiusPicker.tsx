import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, ZoomIn, ZoomOut, Globe2, Compass } from 'lucide-react';

interface WorldMapRadiusPickerProps {
  initialLat?: number;
  initialLng?: number;
  initialRadiusKm?: number;
  onLocationSelect: (data: {
    lat: number;
    lng: number;
    radiusKm: number;
    locationName: string;
    country: string;
  }) => void;
}

const GLOBAL_SHORTCUTS = [
  { name: 'Mumbai, India', lat: 19.0760, lng: 72.8777, country: 'India' },
  { name: 'Delhi NCR, India', lat: 28.6139, lng: 77.2090, country: 'India' },
  { name: 'Bangalore, India', lat: 12.9716, lng: 77.5946, country: 'India' },
  { name: 'Dubai, UAE', lat: 25.2048, lng: 55.2708, country: 'United Arab Emirates' },
  { name: 'London, UK', lat: 51.5074, lng: -0.1278, country: 'United Kingdom' },
  { name: 'New York, USA', lat: 40.7128, lng: -74.0060, country: 'United States' },
  { name: 'Los Angeles, USA', lat: 34.0522, lng: -118.2437, country: 'United States' },
  { name: 'Toronto, Canada', lat: 43.6532, lng: -79.3832, country: 'Canada' },
  { name: 'Sydney, Australia', lat: -33.8688, lng: 151.2093, country: 'Australia' },
  { name: 'Singapore', lat: 1.3521, lng: 103.8198, country: 'Singapore' },
];

export const WorldMapRadiusPicker: React.FC<WorldMapRadiusPickerProps> = ({
  initialLat = 19.0760,
  initialLng = 72.8777,
  initialRadiusKm = 10,
  onLocationSelect,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  const [currentLat, setCurrentLat] = useState(initialLat);
  const [currentLng, setCurrentLng] = useState(initialLng);
  const [radiusKm, setRadiusKm] = useState(initialRadiusKm);
  const [locationName, setLocationName] = useState('Mumbai, India');
  const [country, setCountry] = useState('India');
  const [geocoding, setGeocoding] = useState(false);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [currentLat, currentLng],
        zoom: 11,
        zoomControl: false,
      });

      // Sleek Dark Theme CartoDB tiles
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; OpenStreetMap &copy; CARTO',
          subdomains: 'abcd',
          maxZoom: 19,
        }
      ).addTo(map);

      // Custom Glowing Icon
      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `<div style="background-color: #0284c7; width: 18px; height: 18px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 12px #38bdf8;"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      const marker = L.marker([currentLat, currentLng], {
        icon: customIcon,
        draggable: true,
      }).addTo(map);

      const circle = L.circle([currentLat, currentLng], {
        radius: radiusKm * 1000,
        color: '#0284c7',
        fillColor: '#38bdf8',
        fillOpacity: 0.2,
        weight: 2,
      }).addTo(map);

      markerRef.current = marker;
      circleRef.current = circle;
      mapInstanceRef.current = map;

      // Handle map clicks to move circle & marker
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        updatePosition(lat, lng, radiusKm);
      });

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        updatePosition(pos.lat, pos.lng, radiusKm);
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const updatePosition = async (lat: number, lng: number, rad: number) => {
    setCurrentLat(lat);
    setCurrentLng(lng);

    if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
    if (circleRef.current) {
      circleRef.current.setLatLng([lat, lng]);
      circleRef.current.setRadius(rad * 1000);
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo([lat, lng]);
    }

    // Reverse geocode via Nominatim
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10`
      );
      const data = await res.json();
      if (data && data.address) {
        const city =
          data.address.city ||
          data.address.town ||
          data.address.county ||
          data.address.state_district ||
          data.address.state ||
          'Area';
        const detectedCountry = data.address.country || 'Global';
        const formatted = `${city}, ${detectedCountry}`;
        setLocationName(formatted);
        setCountry(detectedCountry);

        onLocationSelect({
          lat,
          lng,
          radiusKm: rad,
          locationName: formatted,
          country: detectedCountry,
        });
      }
    } catch (err) {
      const fallbackName = `Lat: ${lat.toFixed(3)}, Lng: ${lng.toFixed(3)}`;
      setLocationName(fallbackName);
      onLocationSelect({
        lat,
        lng,
        radiusKm: rad,
        locationName: fallbackName,
        country: 'Global',
      });
    } finally {
      setGeocoding(false);
    }
  };

  const handleRadiusChange = (newRadius: number) => {
    setRadiusKm(newRadius);
    if (circleRef.current) {
      circleRef.current.setRadius(newRadius * 1000);
    }
    if (mapInstanceRef.current && circleRef.current) {
      mapInstanceRef.current.fitBounds(circleRef.current.getBounds(), {
        padding: [20, 20],
        maxZoom: 14,
      });
    }
    onLocationSelect({
      lat: currentLat,
      lng: currentLng,
      radiusKm: newRadius,
      locationName,
      country,
    });
  };

  const handleJumpToCity = (shortcut: typeof GLOBAL_SHORTCUTS[0]) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([shortcut.lat, shortcut.lng], 11);
    }
    setLocationName(shortcut.name);
    setCountry(shortcut.country);
    updatePosition(shortcut.lat, shortcut.lng, radiusKm);
  };

  return (
    <div className="space-y-3 rounded-2xl bg-slate-950/80 border border-slate-800 p-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Globe2 className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span>Interactive Global Radius Map</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
                {radiusKm} KM Radius
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Click anywhere on the world map or drag the circle to extract all leads within this exact radius.
            </p>
          </div>
        </div>

        {/* Selected City & Country Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <MapPin className="h-3.5 w-3.5 text-rose-400" />
          <span className="font-semibold text-slate-200 truncate max-w-[200px]">
            {geocoding ? 'Detecting Location...' : locationName}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
            {country.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Global Quick Jump Shortcuts */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
          <Compass className="h-3 w-3 text-sky-400" /> Jump:
        </span>
        {GLOBAL_SHORTCUTS.map((s) => (
          <button
            type="button"
            key={s.name}
            onClick={() => handleJumpToCity(s)}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition-colors border ${
              locationName === s.name
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Map Container */}
      <div className="relative rounded-xl overflow-hidden border border-slate-800/80 shadow-inner h-[280px] w-full">
        <div ref={mapContainerRef} className="h-full w-full z-0" />

        {/* Floating Radius Slider */}
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-[400] p-2.5 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-800 text-xs shadow-2xl flex flex-col gap-1.5 min-w-[220px]">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
            <span>Circle Radius:</span>
            <span className="font-mono text-sky-400 font-bold">{radiusKm} km ({Math.round(radiusKm * 0.621)} miles)</span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            step={1}
            value={radiusKm}
            onChange={(e) => handleRadiusChange(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
          <div className="flex justify-between text-[9px] text-slate-500 font-mono">
            <span>1 km (Local)</span>
            <span>25 km</span>
            <span>50 km</span>
            <span>100 km (Metro)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
