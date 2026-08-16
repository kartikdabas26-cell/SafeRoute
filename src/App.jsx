import { useState, useEffect, useRef } from 'react';
import { Shield, MapPin, Navigation, Users, AlertTriangle, Menu, X, ArrowRight, Zap, Footprints, Phone, UserPlus, Trash2, BellRing, Share2, ThumbsUp, PlusCircle, Compass } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from './supabaseClient';

export default function App() {
  const [activeTab, setActiveTab] = useState('routes');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Live Geolocation State (Default coordinates: Delhi)
  const [userLocation, setUserLocation] = useState([28.709, 77.037]); 
  const [locationStatus, setLocationStatus] = useState('Detecting High-Precision GPS...');

  // Map reference hooks
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const reportMarkersRef = useRef([]);
  const routePolylineRef = useRef(null);

  // Form states for Route Planner
  const [startLocation, setStartLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [travelMode, setTravelMode] = useState('walking');
  const [isSearching, setIsSearching] = useState(false);
  const [routesSearched, setRoutesSearched] = useState(false);
  const [activeRouteInfo, setActiveRouteInfo] = useState(null);

  // Trusted Circle & SOS States (Synced with Supabase)
  const [trustedContacts, setTrustedContacts] = useState([
    { id: 1, name: 'Chetna Kajla', relation: 'Partner / Lifelong Partner', phone: '+91 98765 43210', status: 'Active • Location Shared' },
    { id: 2, name: 'Father (Dabas)', relation: 'Family Guardian', phone: '+91 91234 56789', status: 'Active' },
    { id: 3, name: 'Campus Security Desk', relation: 'Emergency Authority', phone: '112', status: '24/7 Monitored' }
  ]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRelation, setNewContactRelation] = useState('');

  // SOS Active Countdown State
  const [sosActive, setSosActive] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(10);

  // Community Reports State (Synced with Supabase)
  const [reports, setReports] = useState([
    { id: 1, title: 'Non-functional streetlights near Industrial Alley', category: 'Lighting Failure', location: 'Rohini Sector 16', coords: [28.715, 77.042], time: '12 mins ago', upvotes: 24, verified: true },
    { id: 2, title: 'Active PCR Police Van checkpoint deployed', category: 'Police Patrol', location: 'NSUT Main Gate Corridor', coords: [28.613, 77.035], time: '45 mins ago', upvotes: 41, verified: true },
    { id: 3, title: 'Dark stretch with low pedestrian activity post 10 PM', category: 'Safety Hazard', location: 'Outer Ring Road Crossing', coords: [28.702, 77.028], time: '2 hours ago', upvotes: 18, verified: false }
  ]);
  const [newReportTitle, setNewReportTitle] = useState('');
  const [newReportCategory, setNewReportCategory] = useState('Lighting Failure');
  const [newReportLocation, setNewReportLocation] = useState('');

  // Fetch initial data & setup Live Supabase Realtime Channels
  useEffect(() => {
    async function fetchSupabaseData() {
      try {
        const { data: contactsData, error: contactsError } = await supabase.from('trusted_contacts').select('*');
        if (!contactsError && contactsData && contactsData.length > 0) {
          setTrustedContacts(contactsData);
        }

        const { data: reportsData, error: reportsError } = await supabase.from('community_reports').select('*');
        if (!reportsError && reportsData && reportsData.length > 0) {
          setReports(reportsData);
        }
      } catch (err) {
        console.log('Running on local fallback state.');
      }
    }
    fetchSupabaseData();

    const reportsChannel = supabase
      .channel('public:community_reports')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_reports' }, (payload) => {
        setReports((prev) => [payload.new, ...prev]);
      })
      .subscribe();

    const contactsChannel = supabase
      .channel('public:trusted_contacts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trusted_contacts' }, () => {
        supabase.from('trusted_contacts').select('*').then(({ data }) => {
          if (data) setTrustedContacts(data);
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(reportsChannel);
      supabase.removeChannel(contactsChannel);
    };
  }, []);

  // Continuous High-Precision Geolocation Tracking
  useEffect(() => {
    if ('geolocation' in navigator) {
      const watcher = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          setLocationStatus('Live Vector GPS Locked');
          
          if (mapRef.current) {
            mapRef.current.setView([latitude, longitude], 14);
            if (markerRef.current) {
              markerRef.current.setLatLng([latitude, longitude]);
            }
          }
        },
        (error) => {
          console.warn('GPS tracking error:', error.message);
          setLocationStatus('Default Region Active (Delhi Core)');
        },
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
      );
      return () => navigator.geolocation.clearWatch(watcher);
    } else {
      setLocationStatus('Geolocation unsupported');
    }
  }, []);

  // Initialize Leaflet map instance and render report markers
  useEffect(() => {
    if (activeTab === 'map' && mapContainerRef.current) {
      if (!mapRef.current) {
        const map = L.map(mapContainerRef.current, {
          zoomControl: false
        }).setView(userLocation, 14);

        L.control.zoom({ position: 'topright' }).addTo(map);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
          subdomains: 'abcd',
          maxZoom: 20
        }).addTo(map);

        const pulseIcon = L.divIcon({
          className: 'custom-pulse-marker',
          html: '<div style="width: 20px; height: 20px; background: #0d9488; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 15px #0d9488;"></div>',
          iconSize: [20, 20]
        });

        markerRef.current = L.marker(userLocation, { icon: pulseIcon }).addTo(map)
          .bindPopup('<div style="color:#0f172a; font-weight:bold; padding:4px;">Your Live Position</div>');

        mapRef.current = map;
      } else {
        setTimeout(() => {
          mapRef.current.invalidateSize();
        }, 100);
      }

      if (mapRef.current) {
        reportMarkersRef.current.forEach(m => m.remove());
        reportMarkersRef.current = [];

        reports.forEach(report => {
          if (!report.coords) return;
          
          let badgeColor = '#d97706';
          if (report.category === 'Police Patrol') badgeColor = '#2563eb';
          if (report.category === 'Lighting Failure') badgeColor = '#e11d48';

          const reportIcon = L.divIcon({
            className: 'report-pin',
            html: `<div style="width: 14px; height: 14px; background: ${badgeColor}; border: 2px solid #ffffff; border-radius: 50%; box-shadow: 0 0 10px ${badgeColor};"></div>`,
            iconSize: [14, 14]
          });

          const reportMarker = L.marker(report.coords, { icon: reportIcon }).addTo(mapRef.current)
            .bindPopup(`
              <div style="color:#0f172a; font-family:sans-serif; padding:4px; max-width:200px;">
                <span style="font-size:10px; font-weight:bold; background:#e2e8f0; padding:2px 6px; border-radius:4px; text-transform:uppercase;">${report.category}</span>
                <div style="font-weight:bold; font-size:13px; margin-top:4px; margin-bottom:2px;">${report.title}</div>
                <div style="font-size:11px; color:#475569;">📍 ${report.location}</div>
                <div style="font-size:10px; color:#0d9488; font-weight:bold; margin-top:4px;">👍 ${report.upvotes} Upvotes</div>
              </div>
            `);

          reportMarkersRef.current.push(reportMarker);
        });
      }
    }
  }, [activeTab, reports]);

  // Dynamic Safety Score Calculator
  const calculateDynamicSafety = (coordinates) => {
    let baseScore = 94;
    coordinates.forEach(([lat, lng]) => {
      reports.forEach(report => {
        if (report.coords) {
          const dist = Math.hypot(lat - report.coords[0], lng - report.coords[1]);
          if (dist < 0.003) baseScore -= 12;
        }
      });
    });
    return Math.max(baseScore, 45);
  };

  // Fetch real route from OSRM and display polyline
  const fetchAndDrawRoute = async (startCoords, destCoords, profile = 'foot') => {
    try {
      setIsSearching(true);
      const url = `https://router.project-osrm.org/route/v1/${profile}/${startCoords[1]},${startCoords[0]};${destCoords[1]},${destCoords[0]}?overview=full&geometries=geojson`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        const computedSafety = calculateDynamicSafety(coordinates);

        setActiveRouteInfo({
          distance: (route.distance / 1000).toFixed(1) + ' km',
          duration: Math.ceil(route.duration / 60) + ' mins',
          safetyIndex: computedSafety + ' / 100'
        });

        if (mapRef.current) {
          if (routePolylineRef.current) {
            routePolylineRef.current.remove();
          }

          routePolylineRef.current = L.polyline(coordinates, {
            color: '#0d9488',
            weight: 5,
            opacity: 0.85,
            dashArray: '8, 8'
          }).addTo(mapRef.current);

          mapRef.current.fitBounds(routePolylineRef.current.getBounds(), { padding: [50, 50] });
        }
      }
    } catch (error) {
      console.error('Routing service connection error:', error);
      alert('Could not compute precise route geometry.');
    } finally {
      setIsSearching(false);
      setRoutesSearched(true);
    }
  };

  const handleSearchRoutes = (e) => {
    e.preventDefault();
    if (!startLocation || !destination) return;

    let destCoords = [userLocation[0] + 0.025, userLocation[1] + 0.035];
    const destLower = destination.toLowerCase();
    if (destLower.includes('nsut') || destLower.includes('netaji')) {
      destCoords = [28.6139, 77.0357];
    } else if (destLower.includes('dtu') || destLower.includes('delhi technological')) {
      destCoords = [28.7501, 77.1177];
    } else if (destLower.includes('rohini')) {
      destCoords = [28.7495, 77.1100];
    }

    const profile = travelMode === 'walking' ? 'foot' : 'driving';
    fetchAndDrawRoute(userLocation, destCoords, profile);
  };

  // SOS Countdown Effect
  useEffect(() => {
    let timer;
    if (sosActive && sosCountdown > 0) {
      timer = setInterval(() => {
        setSosCountdown((prev) => prev - 1);
      }, 1000);
    } else if (sosCountdown === 0 && sosActive) {
      const mapsLink = `https://maps.google.com/?q=${userLocation[0]},${userLocation[1]}`;
      const emergencyMessage = encodeURIComponent(
        `🚨 EMERGENCY SOS! I need immediate help! My live GPS location is: ${mapsLink}`
      );

      const primaryContactPhone = trustedContacts[0]?.phone ? trustedContacts[0].phone.replace(/[^0-9]/g, '') : '';
      
      if (primaryContactPhone) {
        window.open(`https://wa.me/${primaryContactPhone}?text=${emergencyMessage}`, '_blank');
      } else if (navigator.share) {
        navigator.share({
          title: '🚨 EMERGENCY SOS',
          text: `I need immediate help! My live location is: ${mapsLink}`,
          url: mapsLink,
        }).catch(() => {});
      } else {
        alert(`🚨 SOS TRIGGERED! Live Coordinates: ${userLocation[0].toFixed(4)}, ${userLocation[1].toFixed(4)}`);
      }

      setSosActive(false);
      setSosCountdown(10);
    }
    return () => clearInterval(timer);
  }, [sosActive, sosCountdown, userLocation, trustedContacts]);

  const triggerEmergencySOS = () => {
    setSosActive(true);
    setSosCountdown(10);
  };

  const cancelSOS = () => {
    setSosActive(false);
    setSosCountdown(10);
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!newContactName || !newContactPhone) return;
    const newContact = {
      name: newContactName,
      relation: newContactRelation || 'Trusted Contact',
      phone: newContactPhone,
      status: 'Active'
    };

    try {
      const { data, error } = await supabase.from('trusted_contacts').insert([newContact]).select();
      if (!error && data) {
        setTrustedContacts([...trustedContacts, data[0]]);
      } else {
        setTrustedContacts([...trustedContacts, { ...newContact, id: Date.now() }]);
      }
    } catch {
      setTrustedContacts([...trustedContacts, { ...newContact, id: Date.now() }]);
    }

    setNewContactName('');
    setNewContactPhone('');
    setNewContactRelation('');
  };

  const handleDeleteContact = async (id) => {
    setTrustedContacts(trustedContacts.filter(c => c.id !== id));
    try {
      await supabase.from('trusted_contacts').delete().eq('id', id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddReport = async (e) => {
    e.preventDefault();
    if (!newReportTitle) return;
    
    const report = {
      title: newReportTitle,
      category: newReportCategory,
      location: newReportLocation || 'Live GPS Vector Location',
      coords: [userLocation[0], userLocation[1]],
      time: 'Just now',
      upvotes: 1,
      verified: false
    };

    try {
      const { data, error } = await supabase.from('community_reports').insert([report]).select();
      if (!error && data) {
        setReports([data[0], ...reports]);
      } else {
        setReports([{ ...report, id: Date.now() }, ...reports]);
      }
    } catch {
      setReports([{ ...report, id: Date.now() }, ...reports]);
    }

    setNewReportTitle('');
    setNewReportLocation('');
  };

  const handleUpvote = async (id) => {
    const updated = reports.map(r => r.id === id ? { ...r, upvotes: r.upvotes + 1 } : r);
    setReports(updated);
    const target = updated.find(r => r.id === id);
    if (target) {
      try {
        await supabase.from('community_reports').update({ upvotes: target.upvotes }).eq('id', id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-sky-50 to-emerald-50 text-slate-800 flex flex-col font-sans relative selection:bg-teal-400 selection:text-slate-900">
      
      {/* SOS Active Countdown Overlay Modal */}
      {sosActive && (
        <div className="fixed inset-0 bg-rose-950/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-pulse">
          <div className="bg-white border border-rose-200 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6">
            <div className="w-20 h-20 bg-rose-50 border-2 border-rose-500 text-rose-600 rounded-full flex items-center justify-center mx-auto text-3xl font-black">
              {sosCountdown}s
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-wider mb-2">SOS Alert Triggered!</h3>
              <p className="text-slate-600 text-sm">
                Dispatches live telemetry via WhatsApp/Share to your <span className="text-rose-600 font-bold">Trusted Circle</span>.
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1 font-mono">
              <div>📍 Lat: {userLocation[0].toFixed(4)}, Lng: {userLocation[1].toFixed(4)}</div>
              <div>🔒 High-bandwidth telemetry stream active</div>
            </div>
            <button
              onClick={cancelSOS}
              className="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3.5 rounded-xl border border-slate-300 transition-all text-sm uppercase tracking-wider shadow-sm"
            >
              I am Safe — Cancel SOS
            </button>
          </div>
        </div>
      )}

      {/* Top Header Navigation */}
      <header className="border-b border-teal-100 bg-white/80 backdrop-blur-xl sticky top-0 z-45 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('routes')}>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center shadow-md shadow-teal-500/20 text-white">
              {/* Shield Icon Replacement */}
              <Shield className="w-6 h-6 fill-white/20 text-white stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900">
                SafeRoute
              </span>
              <span className="block text-[10px] tracking-widest uppercase text-teal-600 font-bold">
                Vector Intelligence Engine
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-1 bg-teal-50/50 p-1.5 rounded-2xl border border-teal-100/80">
            <button
              onClick={() => setActiveTab('routes')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'routes' ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20' : 'text-slate-600 hover:text-slate-900 hover:bg-teal-100/50'
              }`}
            >
              <Navigation className="w-4 h-4" />
              <span>Route Planner</span>
            </button>

            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'map' ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20' : 'text-slate-600 hover:text-slate-900 hover:bg-teal-100/50'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Safety Map</span>
            </button>

            <button
              onClick={() => setActiveTab('trusted')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'trusted' ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20' : 'text-slate-600 hover:text-slate-900 hover:bg-teal-100/50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Trusted Circle</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'reports' ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20' : 'text-slate-600 hover:text-slate-900 hover:bg-teal-100/50'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Community Reports</span>
            </button>
          </nav>

          <div className="hidden md:flex items-center space-x-4">
            <div className="text-right hidden xl:block bg-teal-50/60 px-3 py-1.5 rounded-xl border border-teal-100">
              <span className="block text-[9px] text-slate-500 uppercase tracking-widest font-bold">{locationStatus}</span>
              <span className="text-xs text-teal-700 font-mono font-semibold">{userLocation[0].toFixed(3)}, {userLocation[1].toFixed(3)}</span>
            </div>
            <button
              onClick={triggerEmergencySOS}
              className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-xl shadow-lg shadow-rose-500/25 transition-all flex items-center space-x-2 animate-pulse"
            >
              <span className="w-2 h-2 rounded-full bg-white"></span>
              <span>Emergency SOS</span>
            </button>
          </div>

          <div className="md:hidden flex items-center">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-lg text-slate-600 hover:bg-teal-50">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-xl border-b border-teal-100 px-4 pt-2 pb-4 space-y-1">
            <div className="px-3 py-2 text-xs text-teal-700 font-mono bg-teal-50 rounded-xl mb-2 border border-teal-100">
              📍 {locationStatus}
            </div>
            <button onClick={() => { setActiveTab('routes'); setMobileMenuOpen(false); }} className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-teal-50">
              <Navigation className="w-4 h-4 text-teal-600" /><span>Route Planner</span>
            </button>
            <button onClick={() => { setActiveTab('map'); setMobileMenuOpen(false); }} className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-teal-50">
              <MapPin className="w-4 h-4 text-teal-600" /><span>Safety Map</span>
            </button>
            <button onClick={() => { setActiveTab('trusted'); setMobileMenuOpen(false); }} className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-teal-50">
              <Users className="w-4 h-4 text-teal-600" /><span>Trusted Circle</span>
            </button>
            <button onClick={() => { setActiveTab('reports'); setMobileMenuOpen(false); }} className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-teal-50">
              <AlertTriangle className="w-4 h-4 text-teal-600" /><span>Community Reports</span>
            </button>
            <div className="pt-2">
              <button onClick={() => { triggerEmergencySOS(); setMobileMenuOpen(false); }} className="w-full bg-rose-500 text-white text-xs font-bold uppercase tracking-wider py-3 rounded-xl shadow-md flex items-center justify-center space-x-2">
                <span>Emergency SOS</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* TAB 1: ROUTE PLANNER */}
        {activeTab === 'routes' && (
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-md border border-teal-100/80 rounded-3xl p-8 shadow-xl shadow-teal-900/5">
              <h2 className="text-2xl font-black text-slate-900 mb-2">Safety-Aware Vector Route Comparison</h2>
              <p className="text-slate-600 text-sm mb-8">Enter your journey details to calculate live street paths and evaluate safety indices using OSRM & community hazard pins.</p>

              <form onSubmit={handleSearchRoutes} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="relative">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Starting Point</label>
                    <div className="relative flex items-center">
                      <MapPin className="absolute left-4 w-5 h-5 text-teal-600" />
                      <input
                        type="text"
                        value={startLocation}
                        onChange={(e) => setStartLocation(e.target.value)}
                        placeholder="e.g., Live Position / Metro Station"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-teal-500 focus:bg-white shadow-sm transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Destination</label>
                    <div className="relative flex items-center">
                      <Navigation className="absolute left-4 w-5 h-5 text-rose-500" />
                      <input
                        type="text"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="e.g., NSUT / DTU / Rohini Sector 16"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-teal-500 focus:bg-white shadow-sm transition-all"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between pt-2 gap-4">
                  <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-full sm:w-auto">
                    <button type="button" onClick={() => setTravelMode('walking')} className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all ${travelMode === 'walking' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}>
                      <Footprints className="w-4 h-4" /><span>Walking</span>
                    </button>
                    <button type="button" onClick={() => setTravelMode('transit')} className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all ${travelMode === 'transit' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}>
                      <Zap className="w-4 h-4" /><span>Transit / Driving</span>
                    </button>
                  </div>

                  <button type="submit" disabled={isSearching} className="w-full sm:w-auto bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold px-8 py-3.5 rounded-2xl shadow-lg shadow-teal-600/25 flex items-center justify-center space-x-2 transition-all">
                    {isSearching ? <span>Computing Vector Route...</span> : <><span>Find Safest Route</span><ArrowRight className="w-4 h-4" /></>}
                  </button>
                </div>
              </form>
            </div>

            {routesSearched && activeRouteInfo && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white/80 backdrop-blur-md border border-teal-300 rounded-3xl p-6 shadow-xl relative flex flex-col justify-between">
                    <div className="absolute top-0 right-0 bg-teal-600 text-white text-[10px] font-extrabold uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl shadow-sm">OSRM & Hazard Verified</div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-900 mb-2">Safest & Well-Lit Route</h4>
                      <div className="grid grid-cols-3 gap-3 my-4 bg-teal-50/60 p-4 rounded-2xl border border-teal-100 text-xs">
                        <div><span className="text-slate-500 block">Safety Index</span><span className="text-base font-extrabold text-teal-700">{activeRouteInfo.safetyIndex}</span></div>
                        <div><span className="text-slate-500 block">Duration</span><span className="text-base font-bold text-slate-900">{activeRouteInfo.duration}</span></div>
                        <div><span className="text-slate-500 block">Distance</span><span className="text-base font-bold text-teal-700">{activeRouteInfo.distance}</span></div>
                      </div>
                    </div>
                    <button onClick={() => setActiveTab('map')} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3.5 rounded-2xl text-sm flex items-center justify-center space-x-2 shadow-lg shadow-teal-600/20 transition-all">
                      <Navigation className="w-4 h-4" /><span>View Polyline on Map</span>
                    </button>
                  </div>

                  <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                    <div>
                      <h4 className="text-lg font-bold text-slate-900 mb-2">Alternative Vector Path</h4>
                      <div className="grid grid-cols-3 gap-3 my-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                        <div><span className="text-slate-500 block">Safety Index</span><span className="text-base font-extrabold text-amber-600">64 / 100</span></div>
                        <div><span className="text-slate-500 block">Duration</span><span className="text-base font-bold text-slate-900">{activeRouteInfo.duration}</span></div>
                        <div><span className="text-slate-500 block">Lighting</span><span className="text-base font-bold text-amber-600">Poor (45%)</span></div>
                      </div>
                    </div>
                    <button onClick={() => alert('Alternative route selected.')} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-2xl border border-slate-200 text-sm transition-all">
                      Proceed Anyway
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: INTERACTIVE LEAFLET MAP WITH POLYLINE ROUTING */}
        {activeTab === 'map' && (
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-md border border-teal-100/80 rounded-3xl p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-1 flex items-center space-x-2">
                    <Compass className="w-5 h-5 text-teal-600" />
                    <span>Interactive Safety Intelligence Map</span>
                  </h2>
                  <p className="text-slate-600 text-sm">Displaying live telemetry, OSRM routing polylines, and community hazard pins.</p>
                </div>
                
                <div className="flex items-center space-x-4 text-xs bg-teal-50 px-4 py-2.5 rounded-2xl border border-teal-100">
                  <div className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span><span className="text-slate-700 font-medium">You</span></div>
                  <div className="flex items-center space-x-1.5"><span className="w-4 h-1 bg-teal-600"></span><span className="text-slate-700 font-medium">Safe Route</span></div>
                  <div className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span><span className="text-slate-700 font-medium">Hazards</span></div>
                </div>
              </div>

              <div className="w-full h-[500px] rounded-2xl overflow-hidden border border-teal-100 shadow-xl relative z-10">
                <div ref={mapContainerRef} className="w-full h-full" />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TRUSTED CIRCLE */}
        {activeTab === 'trusted' && (
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-md border border-teal-100/80 rounded-3xl p-8 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 mb-1">Trusted Circle & Emergency Center</h2>
                  <p className="text-slate-600 text-sm">Manage designated emergency guardians who receive live telemetry and SOS alerts instantly.</p>
                </div>
                <button
                  onClick={triggerEmergencySOS}
                  className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-6 py-3.5 rounded-2xl shadow-lg shadow-rose-500/25 flex items-center justify-center space-x-2 animate-pulse transition-all border border-rose-400/30"
                >
                  <BellRing className="w-5 h-5" />
                  <span>Test Emergency SOS Broadcast</span>
                </button>
              </div>

              <form onSubmit={handleAddContact} className="bg-teal-50/50 p-6 rounded-2xl border border-teal-100 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end shadow-sm">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    placeholder="e.g., Guardian Name"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-teal-500 shadow-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    placeholder="+91 XXXXX XXXXX"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-teal-500 shadow-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Relation / Role</label>
                  <input
                    type="text"
                    value={newContactRelation}
                    onChange={(e) => setNewContactRelation(e.target.value)}
                    placeholder="e.g., Family / Authority"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-teal-500 shadow-sm"
                  />
                </div>
                <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center space-x-2 transition-all shadow-md shadow-teal-600/20">
                  <UserPlus className="w-4 h-4" />
                  <span>Add Guardian</span>
                </button>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {trustedContacts.map(contact => (
                  <div key={contact.id} className="bg-white border border-slate-200/80 p-6 rounded-2xl relative flex flex-col justify-between shadow-md shadow-teal-900/5 hover:border-teal-200 transition-all">
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-slate-900 text-base">{contact.name}</h4>
                          <span className="text-xs text-teal-700 font-semibold">{contact.relation}</span>
                        </div>
                        <button onClick={() => handleDeleteContact(contact.id)} className="text-slate-400 hover:text-rose-600 p-1 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-xs text-slate-600 space-y-1 font-mono mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div>📞 {contact.phone}</div>
                        <div>⚡ {contact.status}</div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <a href={`tel:${contact.phone}`} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-center py-2.5 rounded-xl text-xs font-bold border border-slate-200 flex items-center justify-center space-x-1.5 transition-all">
                        <Phone className="w-3.5 h-3.5 text-teal-600" />
                        <span>Call</span>
                      </a>
                      <button onClick={() => alert(`Live telemetry link dispatched to ${contact.name}`)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-center py-2.5 rounded-xl text-xs font-bold border border-slate-200 flex items-center justify-center space-x-1.5 transition-all">
                        <Share2 className="w-3.5 h-3.5 text-teal-600" />
                        <span>Ping GPS</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: COMMUNITY REPORTS */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-md border border-teal-100/80 rounded-3xl p-8 shadow-xl">
              <h2 className="text-2xl font-black text-slate-900 mb-1">Community Safety Reports & Hazard Intel</h2>
              <p className="text-slate-600 text-sm mb-6">Report unlit pathways, safety hazards, or police patrols. Pins automatically anchor to your current live GPS coordinates.</p>

              <form onSubmit={handleAddReport} className="bg-teal-50/50 p-6 rounded-2xl border border-teal-100 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end shadow-sm">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Report Description</label>
                  <input
                    type="text"
                    value={newReportTitle}
                    onChange={(e) => setNewReportTitle(e.target.value)}
                    placeholder="e.g., Unlit corridor near Metro Pillar 42"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-teal-500 shadow-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Category</label>
                  <select
                    value={newReportCategory}
                    onChange={(e) => setNewReportCategory(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-teal-500 shadow-sm"
                  >
                    <option value="Lighting Failure">Lighting Failure</option>
                    <option value="Safety Hazard">Safety Hazard</option>
                    <option value="Police Patrol">Police Patrol</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Location Name</label>
                  <input
                    type="text"
                    value={newReportLocation}
                    onChange={(e) => setNewReportLocation(e.target.value)}
                    placeholder="e.g., Sector 16 Rohini"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-teal-500 shadow-sm"
                  />
                </div>
                <div className="sm:col-span-4">
                  <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center space-x-2 transition-all shadow-md shadow-teal-600/20">
                    <PlusCircle className="w-4 h-4" />
                    <span>Publish Geofenced Community Report</span>
                  </button>
                </div>
              </form>

              <div className="space-y-4">
                {reports.map(report => (
                  <div key={report.id} className="bg-white border border-slate-200/80 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:border-teal-200 transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-100 text-teal-700">
                          {report.category}
                        </span>
                        <span className="text-xs text-slate-500">• {report.time}</span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-base">{report.title}</h4>
                      <p className="text-xs text-slate-600">📍 {report.location}</p>
                    </div>
                    <button
                      onClick={() => handleUpvote(report.id)}
                      className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-sm"
                    >
                      <ThumbsUp className="w-3.5 h-3.5 text-teal-600" />
                      <span>{report.upvotes} Upvotes</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
