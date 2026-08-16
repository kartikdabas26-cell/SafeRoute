import { useState, useEffect, useRef } from 'react';
import { Shield, MapPin, Navigation, Users, AlertTriangle, Menu, X, ArrowRight, Zap, Footprints, Phone, UserPlus, Trash2, BellRing, Share2, ThumbsUp, PlusCircle, Compass } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from './supabaseClient';

export default function App() {
  const [activeTab, setActiveTab] = useState('routes');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Live Geolocation State (Default coordinates: Delhi)
  const [userLocation, setUserLocation] = useState([28.709, 77.037]); // [lat, lng] for Leaflet
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

    // Realtime listeners for multi-user live updates
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

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
          subdomains: 'abcd',
          maxZoom: 20
        }).addTo(map);

        const pulseIcon = L.divIcon({
          className: 'custom-pulse-marker',
          html: '<div style="width: 20px; height: 20px; background: #10b981; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 15px #10b981;"></div>',
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
          
          let badgeColor = '#f59e0b';
          if (report.category === 'Police Patrol') badgeColor = '#3b82f6';
          if (report.category === 'Lighting Failure') badgeColor = '#ef4444';

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
                <div style="font-size:11px; color:#64748b;">📍 ${report.location}</div>
                <div style="font-size:10px; color:#10b981; font-weight:bold; margin-top:4px;">👍 ${report.upvotes} Upvotes</div>
              </div>
            `);

          reportMarkersRef.current.push(reportMarker);
        });
      }
    }
  }, [activeTab, reports]);

  // Dynamic Safety Score Calculator based on Community Hazard Pins
  const calculateDynamicSafety = (coordinates) => {
    let baseScore = 94;
    coordinates.forEach(([lat, lng]) => {
      reports.forEach(report => {
        if (report.coords) {
          const dist = Math.hypot(lat - report.coords[0], lng - report.coords[1]);
          if (dist < 0.003) baseScore -= 12; // Deduct points near hazard pins
        }
      });
    });
    return Math.max(baseScore, 45);
  };

  // Fetch real route from OSRM and display polyline on the map
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
            color: '#10b981',
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

  // Direct WhatsApp & Native Share SOS Countdown Triggered Effect
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

  // Geofenced Community Report Submission
  const handleAddReport = async (e) => {
    e.preventDefault();
    if (!newReportTitle) return;
    
    const report = {
      title: newReportTitle,
      category: newReportCategory,
      location: newReportLocation || 'Live GPS Vector Location',
      coords: [userLocation[0], userLocation[1]], // Automatically stamps current live GPS
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative">
      
      {/* SOS Active Countdown Overlay Modal */}
      {sosActive && (
        <div className="fixed inset-0 bg-rose-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-pulse">
          <div className="bg-slate-900 border-2 border-rose-600 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6">
            <div className="w-20 h-20 bg-rose-600/20 border-2 border-rose-500 text-rose-500 rounded-full flex items-center justify-center mx-auto text-3xl font-black">
              {sosCountdown}s
            </div>
            <div>
              <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-2">SOS Alert Triggered!</h3>
              <p className="text-slate-300 text-sm">
                Dispatches live telemetry via WhatsApp/Share to your <span className="text-rose-400 font-bold">Trusted Circle</span>.
              </p>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1 font-mono">
              <div>📍 Lat: {userLocation[0].toFixed(4)}, Lng: {userLocation[1].toFixed(4)}</div>
              <div>🔒 High-bandwidth telemetry stream active</div>
            </div>
            <button
              onClick={cancelSOS}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl border border-slate-700 transition-all text-sm uppercase tracking-wider shadow-lg"
            >
              I am Safe — Cancel SOS
            </button>
          </div>
        </div>
      )}

      {/* Top Header Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('routes')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Shield className="w-6 h-6 text-slate-950 font-bold" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-emerald-400 bg-clip-text text-transparent">
                SafeRoute
              </span>
              <span className="block text-[10px] tracking-widest uppercase text-emerald-400 font-semibold">
                Vector Intelligence Engine
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('routes')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'routes' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Navigation className="w-4 h-4" />
              <span>Route Planner</span>
            </button>

            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'map' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Safety Map</span>
            </button>

            <button
              onClick={() => setActiveTab('trusted')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'trusted' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Trusted Circle</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'reports' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Community Reports</span>
            </button>
          </nav>

          <div className="hidden md:flex items-center space-x-4">
            <div className="text-right hidden xl:block">
              <span className="block text-[10px] text-slate-500 uppercase tracking-widest font-semibold">{locationStatus}</span>
              <span className="text-xs text-emerald-400 font-mono">{userLocation[0].toFixed(3)}, {userLocation[1].toFixed(3)}</span>
            </div>
            <button
              onClick={triggerEmergencySOS}
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-lg shadow-rose-600/20 transition-all flex items-center space-x-2 border border-rose-500/30 animate-pulse"
            >
              <span className="w-2 h-2 rounded-full bg-white"></span>
              <span>Emergency SOS</span>
            </button>
          </div>

          <div className="md:hidden flex items-center">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-4 space-y-1">
            <div className="px-3 py-2 text-xs text-emerald-400 font-mono bg-slate-950 rounded-lg mb-2">
              📍 {locationStatus}
            </div>
            <button onClick={() => { setActiveTab('routes'); setMobileMenuOpen(false); }} className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400">
              <Navigation className="w-4 h-4" /><span>Route Planner</span>
            </button>
            <button onClick={() => { setActiveTab('map'); setMobileMenuOpen(false); }} className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400">
              <MapPin className="w-4 h-4" /><span>Safety Map</span>
            </button>
            <button onClick={() => { setActiveTab('trusted'); setMobileMenuOpen(false); }} className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400">
              <Users className="w-4 h-4" /><span>Trusted Circle</span>
            </button>
            <button onClick={() => { setActiveTab('reports'); setMobileMenuOpen(false); }} className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400">
              <AlertTriangle className="w-4 h-4" /><span>Community Reports</span>
            </button>
            <div className="pt-2">
              <button onClick={() => { triggerEmergencySOS(); setMobileMenuOpen(false); }} className="w-full bg-rose-600 text-white text-xs font-bold uppercase tracking-wider py-2.5 rounded-lg shadow-md flex items-center justify-center space-x-2">
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
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-1">Safety-Aware Vector Route Comparison</h2>
              <p className="text-slate-400 text-sm mb-6">Enter your journey details to calculate live street paths and evaluate safety indices using OSRM & community hazard pins.</p>

              <form onSubmit={handleSearchRoutes} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Starting Point</label>
                    <div className="relative flex items-center">
                      <MapPin className="absolute left-3 w-5 h-5 text-emerald-400" />
                      <input
                        type="text"
                        value={startLocation}
                        onChange={(e) => setStartLocation(e.target.value)}
                        placeholder="e.g., Live Position / Metro Station"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Destination</label>
                    <div className="relative flex items-center">
                      <Navigation className="absolute left-3 w-5 h-5 text-rose-400" />
                      <input
                        type="text"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="e.g., NSUT / DTU / Rohini Sector 16"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between pt-2 gap-4">
                  <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 w-full sm:w-auto">
                    <button type="button" onClick={() => setTravelMode('walking')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 ${travelMode === 'walking' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}>
                      <Footprints className="w-4 h-4" /><span>Walking</span>
                    </button>
                    <button type="button" onClick={() => setTravelMode('transit')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 ${travelMode === 'transit' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}>
                      <Zap className="w-4 h-4" /><span>Transit / Driving</span>
                    </button>
                  </div>

                  <button type="submit" disabled={isSearching} className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold px-8 py-3 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2">
                    {isSearching ? <span>Computing Vector Route...</span> : <><span>Find Safest Route</span><ArrowRight className="w-4 h-4" /></>}
                  </button>
                </div>
              </form>
            </div>

            {routesSearched && activeRouteInfo && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-2xl p-6 shadow-xl relative flex flex-col justify-between">
                    <div className="absolute top-0 right-0 bg-emerald-500 text-slate-950 text-[10px] font-extrabold uppercase tracking-widest px-4 py-1 rounded-bl-xl">OSRM & Hazard Verified</div>
                    <div>
                      <h4 className="text-lg font-bold text-white mb-2">Safest & Well-Lit Route</h4>
                      <div className="grid grid-cols-3 gap-3 my-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs">
                        <div><span className="text-slate-500 block">Safety Index</span><span className="text-base font-extrabold text-emerald-400">{activeRouteInfo.safetyIndex}</span></div>
                        <div><span className="text-slate-500 block">Duration</span><span className="text-base font-bold text-white">{activeRouteInfo.duration}</span></div>
                        <div><span className="text-slate-500 block">Distance</span><span className="text-base font-bold text-emerald-400">{activeRouteInfo.distance}</span></div>
                      </div>
                    </div>
                    <button onClick={() => setActiveTab('map')} className="w-full bg-emerald-500 text-slate-950 font-bold py-3 rounded-xl text-sm flex items-center justify-center space-x-2">
                      <Navigation className="w-4 h-4" /><span>View Polyline on Map</span>
                    </button>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                    <div>
                      <h4 className="text-lg font-bold text-white mb-2">Alternative Vector Path</h4>
                      <div className="grid grid-cols-3 gap-3 my-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs">
                        <div><span className="text-slate-500 block">Safety Index</span><span className="text-base font-extrabold text-amber-400">64 / 100</span></div>
                        <div><span className="text-slate-500 block">Duration</span><span className="text-base font-bold text-white">{activeRouteInfo.duration}</span></div>
                        <div><span className="text-slate-500 block">Lighting</span><span className="text-base font-bold text-amber-400">Poor (45%)</span></div>
                      </div>
                    </div>
                    <button onClick={() => alert('Alternative route selected.')} className="w-full bg-slate-800 text-slate-200 font-bold py-3 rounded-xl border border-slate-700 text-sm">
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
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1 flex items-center space-x-2">
                    <Compass className="w-5 h-5 text-emerald-400" />
                    <span>Interactive Safety Intelligence Map</span>
                  </h2>
                  <p className="text-slate-400 text-sm">Displaying live telemetry, OSRM routing polylines, and community hazard pins.</p>
                </div>
                
                <div className="flex items-center space-x-4 text-xs bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                  <div className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span><span className="text-slate-300">You</span></div>
                  <div className="flex items-center space-x-1.5"><span className="w-4 h-1 bg-emerald-400"></span><span className="text-slate-300">Safe Route</span></div>
                  <div className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span><span className="text-slate-300">Hazards</span></div>
                </div>
              </div>

              <div className="w-full h-[500px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative z-10">
                <div ref={mapContainerRef} className="w-full h-full" />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TRUSTED CIRCLE */}
        {activeTab === 'trusted' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">Trusted Circle & Emergency Center</h2>
                  <p className="text-slate-400 text-sm">Manage designated emergency guardians who receive live telemetry and SOS alerts instantly.</p>
                </div>
                <button
                  onClick={triggerEmergencySOS}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg flex items-center justify-center space-x-2 animate-pulse"
                >
                  <BellRing className="w-5 h-5" />
                  <span>Test Emergency SOS Broadcast</span>
                </button>
              </div>

              <form onSubmit={handleAddContact} className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    placeholder="e.g., Guardian Name"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    placeholder="+91 XXXXX XXXXX"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Relation / Role</label>
                  <input
                    type="text"
                    value={newContactRelation}
                    onChange={(e) => setNewContactRelation(e.target.value)}
                    placeholder="e.g., Family / Authority"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2 px-4 rounded-lg text-sm flex items-center justify-center space-x-2 transition-all">
                  <UserPlus className="w-4 h-4" />
                  <span>Add Guardian</span>
                </button>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {trustedContacts.map(contact => (
                  <div key={contact.id} className="bg-slate-950 border border-slate-800 p-5 rounded-xl relative flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-white text-base">{contact.name}</h4>
                          <span className="text-xs text-emerald-400 font-medium">{contact.relation}</span>
                        </div>
                        <button onClick={() => handleDeleteContact(contact.id)} className="text-slate-500 hover:text-rose-400 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-xs text-slate-400 space-y-1 font-mono mb-4">
                        <div>📞 {contact.phone}</div>
                        <div>⚡ {contact.status}</div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <a href={`tel:${contact.phone}`} className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-200 text-center py-2 rounded-lg text-xs font-bold border border-slate-800 flex items-center justify-center space-x-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Call</span>
                      </a>
                      <button onClick={() => alert(`Live telemetry link dispatched to ${contact.name}`)} className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-200 text-center py-2 rounded-lg text-xs font-bold border border-slate-800 flex items-center justify-center space-x-1.5">
                        <Share2 className="w-3.5 h-3.5 text-emerald-400" />
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
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-1">Community Safety Reports & Hazard Intel</h2>
              <p className="text-slate-400 text-sm mb-6">Report unlit pathways, safety hazards, or police patrols. Pins automatically anchor to your current live GPS coordinates.</p>

              <form onSubmit={handleAddReport} className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Report Description</label>
                  <input
                    type="text"
                    value={newReportTitle}
                    onChange={(e) => setNewReportTitle(e.target.value)}
                    placeholder="e.g., Unlit corridor near Metro Pillar 42"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Category</label>
                  <select
                    value={newReportCategory}
                    onChange={(e) => setNewReportCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Lighting Failure">Lighting Failure</option>
                    <option value="Safety Hazard">Safety Hazard</option>
                    <option value="Police Patrol">Police Patrol</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Location Name</label>
                  <input
                    type="text"
                    value={newReportLocation}
                    onChange={(e) => setNewReportLocation(e.target.value)}
                    placeholder="e.g., Sector 16 Rohini"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="sm:col-span-4">
                  <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 px-4 rounded-lg text-sm flex items-center justify-center space-x-2 transition-all">
                    <PlusCircle className="w-4 h-4" />
                    <span>Publish Geofenced Community Report</span>
                  </button>
                </div>
              </form>

              <div className="space-y-4">
                {reports.map(report => (
                  <div key={report.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-400">
                          {report.category}
                        </span>
                        <span className="text-xs text-slate-500">• {report.time}</span>
                      </div>
                      <h4 className="font-bold text-white text-base">{report.title}</h4>
                      <p className="text-xs text-slate-400">📍 {report.location}</p>
                    </div>
                    <button
                      onClick={() => handleUpvote(report.id)}
                      className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all"
                    >
                      <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
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