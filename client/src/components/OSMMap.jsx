import React, { useRef, useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, ZoomControl } from 'react-leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const FRIEND_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];

const createColoredIcon = (color, label = '', size = 20) => {
  return L.divIcon({
    html: `<div style="background-color:${color};width:${size}px;height:${size}px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:${size * 0.4}px;font-weight:bold;color:white;">${label}</div>`,
    className: 'custom-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)]
  });
};

const createDestinationIcon = (color = '#DB4437') => {
  return L.divIcon({
    html: `<div style="position:relative;width:24px;height:32px;"><svg viewBox="0 0 24 32" width="24" height="32" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20C24 5.373 18.627 0 12 0z" fill="${color}"/><circle cx="12" cy="12" r="5" fill="white"/></svg></div>`,
    className: 'destination-marker',
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -34]
  });
};

const calculateAngle = (p1, p2, p3) => {
  const dy1 = p2[0] - p1[0];
  const dx1 = p2[1] - p1[1];
  const dy2 = p3[0] - p2[0];
  const dx2 = p3[1] - p2[1];

  const angle1 = Math.atan2(dy1, dx1);
  const angle2 = Math.atan2(dy2, dx2);

  let angle = (angle2 - angle1) * (180 / Math.PI);
  if (angle < 0) angle += 360;
  if (angle > 180) angle = 360 - angle;
  return angle;
};

const calculateRealisticETA = (baseDurationSeconds, distanceKm, coordinates = []) => {
  let sharpCurveCount = 0;

  if (coordinates && coordinates.length > 2) {
    for (let i = 0; i < coordinates.length - 2; i++) {
      const p1 = coordinates[i];
      const p2 = coordinates[i + 1];
      const p3 = coordinates[i + 2];

      const turnAngle = calculateAngle(p1, p2, p3);
      if (turnAngle > 30) {
        sharpCurveCount++;
        i += 2;
      }
    }
  }

  const curvesPerKm = sharpCurveCount / Math.max(1, distanceKm);
  const isCurvyRoad = curvesPerKm >= 0.5;

  let totalSeconds = baseDurationSeconds;

  if (isCurvyRoad) {
    totalSeconds += (distanceKm * 20);
  } else {
    totalSeconds += (distanceKm * 30);
  }

  return {
    minutes: Math.max(1, Math.round(totalSeconds / 60)),
    isPeakHour: false
  };
};

const RecenterMap = ({ center }) => {
  const map = useMap();
  const hasCentered = useRef(false);
  useEffect(() => {
    if (center && !hasCentered.current) {
      map.setView([center[0], center[1]], map.getZoom(), { animate: true });
      hasCentered.current = true;
    }
  }, [center, map]);
  return null;
};

const formatDuration = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0) return `${hours}hours ${mins}min`;
  return `${mins}min`;
};

const RouteLayer = ({ source, destination, color = '#6366f1', onRouteFound }) => {
  const map = useMap();
  const [coordinates, setCoordinates] = useState([]);
  const lastKey = useRef('');

  useEffect(() => {
    if (!source || !destination) { setCoordinates([]); return; }
    if (isNaN(source[0]) || isNaN(source[1]) || isNaN(destination.lat) || isNaN(destination.lng)) return;
    const key = `${source[0]},${source[1]}-${destination.lat},${destination.lng}`;
    if (lastKey.current === key) return;
    lastKey.current = key;

    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${source[1]},${source[0]};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (data.routes?.length > 0) {
          const route = data.routes[0];
          const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
          setCoordinates(coords);
          const distanceKm = route.distance / 1000;
          const eta = calculateRealisticETA(route.duration, distanceKm, coords);
          const durationStr = formatDuration(eta.minutes);
          if (onRouteFound) onRouteFound({ distance: distanceKm.toFixed(1), duration: eta.minutes, distanceText: `${distanceKm.toFixed(1)} km`, durationText: durationStr, note: "Calculated via base duration + curve penalty", coordinates: coords });
          map.fitBounds(L.latLngBounds(coords), { padding: [50, 50] });
        }
      } catch (error) { console.error('Error fetching route:', error); }
    };
    fetchRoute();
  }, [source, destination, map, onRouteFound]);

  return coordinates.length > 0 ? <Polyline positions={coordinates} color={color} weight={5} opacity={0.85} /> : null;
};

const FriendRouteLayer = ({ source, destination, color }) => {
  const [coordinates, setCoordinates] = useState([]);
  const lastKey = useRef('');

  useEffect(() => {
    if (!source || !destination) { setCoordinates([]); return; }
    const lat = source.lat || source[0];
    const lng = source.lng || source[1];
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

    const key = `${lat},${lng}-${destination.lat},${destination.lng}`;
    if (lastKey.current === key) return;
    lastKey.current = key;
    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${lng},${lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
        const response = await fetch(url);
        if (!response.ok) return;
        const data = await response.json();
        if (data.routes?.[0]) setCoordinates(data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]));
      } catch (e) { console.error('Friend route error:', e); }
    };
    fetchRoute();
  }, [source, destination]);

  return coordinates.length > 0 ? <Polyline positions={coordinates} color={color} weight={3} opacity={0.6} dashArray="8, 6" /> : null;
};

const OSMMap = ({ center, zoom = 13, destination, friends = [], onRouteFound, onMapClick }) => {
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [realCenter, setRealCenter] = useState(null);
  const searchTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!center) return;
    setRealCenter(center);
  }, [center?.[0], center?.[1]]);

  const searchPlaces = async (query) => {
    if (!query || query.length < 3) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`);
      const data = await response.json();
      setSearchResults(data.map(place => ({ id: place.place_id, name: place.display_name.split(',')[0], fullName: place.display_name, lat: parseFloat(place.lat), lng: parseFloat(place.lon) })));
      setShowResults(true);
    } catch (error) { console.error('Search error:', error); }
    finally { setIsSearching(false); }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => searchPlaces(value), 500);
  };

  const handlePlaceSelect = (place) => {
    if (!place.lat || !place.lng || isNaN(place.lat) || isNaN(place.lng)) return;
    setSearchQuery(place.name);
    setShowResults(false);
    setSearchExpanded(false);
    if (onMapClick) onMapClick({ lat: parseFloat(place.lat), lng: parseFloat(place.lng), name: place.name });
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.search-container')) {
        setShowResults(false);
        setSearchExpanded(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (!center || isNaN(center[0]) || isNaN(center[1])) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse at 50% 50%,rgba(9,11,17,0.98) 0%,#000 100%)', gap: 16 }}>
        <div style={{ position: 'relative', width: 64, height: 64 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(56,189,248,0.3)', animation: `radarPulse 2s ease-out ${i * 0.6}s infinite` }} />
          ))}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 12, height: 12, borderRadius: '50%', background: '#7dd3fc', boxShadow: '0 0 16px rgba(125,211,252,0.6)' }} />
        </div>
        <p style={{ color: '#475569', fontSize: 14, fontFamily: "'DM Sans',sans-serif" }}>Acquiring GPS location…</p>
        <style>{`@keyframes radarPulse { 0% { transform: scale(0.3); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <style>{`
        .search-container { position: absolute; z-index: 900; }
        .search-input {
          width: 100%; padding: 11px 14px; border-radius: 12px;
          border: 1px solid rgba(148,163,184,0.12);
          background: rgba(9,11,17,0.92); color: #f1f5f9; font-size: 14px;
          backdrop-filter: blur(16px); box-shadow: 0 4px 24px rgba(0,0,0,0.5);
          outline: none; font-family: 'DM Sans', sans-serif; box-sizing: border-box;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .search-input:focus { border-color: rgba(56,189,248,0.3); box-shadow: 0 4px 24px rgba(0,0,0,0.5), 0 0 0 3px rgba(56,189,248,0.06); }
        .search-input::placeholder { color: #475569; }
        .search-results {
          margin-top: 6px; border-radius: 12px;
          background: rgba(9,11,17,0.97); backdrop-filter: blur(16px);
          max-height: 240px; overflow-y: auto;
          border: 1px solid rgba(148,163,184,0.1);
          box-shadow: 0 8px 32px rgba(0,0,0,0.6);
        }
        .search-result-item { padding: 11px 14px; cursor: pointer; border-bottom: 1px solid rgba(148,163,184,0.06); color: #f1f5f9; transition: background 0.15s; }
        .search-result-item:hover { background: rgba(99,102,241,0.15); }
        .search-result-item:last-child { border-bottom: none; }

        @media (min-width: 768px) {
          .search-container { top: 20px; left: 50%; transform: translateX(-50%); width: min(420px, calc(100% - 40px)); }
        }
        @media (max-width: 767px) {
          .search-container { top: 12px; left: 12px; right: 12px; width: auto; max-width: calc(100% - 24px); transform: none; }
          .search-input { font-size: 13px; padding: 10px 12px; }
          .search-results { max-height: 200px; }
          .search-result-item { padding: 10px 12px; }
        }
      `}</style>

      <div className="search-container search-area">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={() => searchResults.length > 0 && setShowResults(true)}
          placeholder="Search destination..."
          className="search-input"
        />
        {showResults && searchResults.length > 0 && (
          <div className="search-results">
            {isSearching && <div style={{ padding: '11px 14px', textAlign: 'center', color: '#475569', fontSize: 13 }}>Searching…</div>}
            {searchResults.map(place => (
              <div key={place.id} className="search-result-item" onClick={() => handlePlaceSelect(place)}>
                <div style={{ fontWeight: 500, fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>{place.name}</div>
                <div style={{ fontSize: 11, color: '#475569', marginTop: 2, fontFamily: "'DM Sans',sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.fullName}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <MapContainer center={[center[0], center[1]]} zoom={zoom} zoomControl={false} style={{ width: '100%', height: '100%', minHeight: '300px' }}>
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomright" />

        <RecenterMap center={realCenter} />

        <Marker position={[center[0], center[1]]} icon={createColoredIcon('#4285F4', 'You', 26)}>
          <Popup><strong>Your Location</strong></Popup>
        </Marker>

        {friends.map((friend, index) => {
          if (!friend.location || !friend.online) return null;
          const color = FRIEND_COLORS[index % FRIEND_COLORS.length];
          const initial = friend.name?.charAt(0)?.toUpperCase() || '?';
          return (
            <React.Fragment key={friend.id}>
              <Marker position={[friend.location.lat, friend.location.lng]} icon={createColoredIcon(color, initial, 24)}>
                <Popup>
                  <div>
                    <strong>{friend.name}</strong>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>🟢 Online</div>
                    {friend.trip?.destination && <div style={{ fontSize: '12px', marginTop: '4px' }}>📍 Heading to: <strong>{friend.trip.destination.name || 'a destination'}</strong></div>}
                  </div>
                </Popup>
              </Marker>
              {friend.trip?.destination?.lat && friend.trip?.destination?.lng && (
                <Marker position={[friend.trip.destination.lat, friend.trip.destination.lng]} icon={createDestinationIcon(color)}>
                  <Popup><div><strong>{friend.name}'s destination</strong><div style={{ fontSize: '12px', color: '#666' }}>{friend.trip.destination.name}</div></div></Popup>
                </Marker>
              )}
              {friend.trip?.destination?.lat && friend.trip?.destination?.lng && (
                <FriendRouteLayer source={[friend.location.lat, friend.location.lng]} destination={friend.trip.destination} color={color} />
              )}
            </React.Fragment>
          );
        })}

        {destination?.lat && destination?.lng && (
          <>
            <Marker position={[destination.lat, destination.lng]} icon={createDestinationIcon('#DB4437')}>
              <Popup>{destination.name || 'Destination'}</Popup>
            </Marker>
            <RouteLayer source={[center[0], center[1]]} destination={destination} color="#6366f1" onRouteFound={onRouteFound} />
          </>
        )}
      </MapContainer>
    </div>
  );
};

export default OSMMap;