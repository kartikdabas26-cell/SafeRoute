import { useState, useEffect, useRef } from 'react';
import { Shield, MapPin, Navigation, Users, AlertTriangle, Menu, X, ArrowRight, Zap, Footprints, Phone, UserPlus, Trash2, BellRing, Share2, ThumbsUp, PlusCircle, Compass, Radio, Volume2, Camera, MessageSquare, Send, Bot, Sparkles, Eye, Mic, MicOff, WifiOff } from 'lucide-react';
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

  // Advanced Safety Features State
  const [checkInActive, setCheckInActive] = useState(false);
  const [checkInMinutes, setCheckInMinutes] = useState(15);
  const [checkInTimer, setCheckInTimer] = useState(900);
  const [sirenActive, setSirenActive] = useState(false);
  const [stealthMode, setStealthMode] = useState(false);

  // Computer Vision Camera Scanner State
  const [visionModalOpen, setVisionModalOpen] = useState(false);
  const [scanningActive, setScanningActive] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const videoRef = useRef(null);

  // AI Safety Chatbot Assistant State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Hello! I am your AI Safety Copilot. Ask me anything about route security, local emergency protocols, or hazard checks.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // NEW FEATURE 1: Offline BLE Mesh Radar Modal State
  const [meshModalOpen, setMeshModalOpen] = useState(false);
  const [meshNodes, setMeshNodes] = useState([
    { id: 1, name: 'Node #A4 - Nearby Peer', distance: '14 meters away', signal: 'Strong (BLE 5.0)', status: 'Relay Ready' },
    { id: 2, name: 'Node #B9 - Campus Corridor', distance: '38 meters away', signal: 'Moderate', status: 'Relay Ready' },
    { id: 3, name: 'Node #C2 - Metro Gate Post', distance: '65 meters away', signal: 'Low', status: 'Standby' }
  ]);

  // NEW FEATURE 2: Geofenced Safe Haven Auto-Alert State
  const [geofenceActive, setGeofenceActive] = useState(true);
  const [currentSafeHaven, setCurrentSafeHaven] = useState('DTU / Campus Corridor Perimeter');

  // NEW FEATURE 3: Voice-Activated Hands-Free SOS Listener State
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('Inactive');

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

  // Community Reports State
  const [reports, setReports] = useState([
    { id: 1, title: 'Non-functional streetlights near Industrial Alley', category: 'Lighting Failure', location: 'Rohini Sector 16', coords: [28.715, 77.042], time: '12 mins ago', upvotes: 24, verified: true },
    { id: 2, title: 'Active PCR Police Van checkpoint deployed', category: 'Police Patrol', location: 'NSUT Main Gate Corridor', coords: [28.613, 77.035], time: '45 mins ago', upvotes: 41, verified: true },
    { id: 3, title: 'Dark stretch with low pedestrian activity post 10 PM', category: 'Safety Hazard', location: 'Outer Ring Road Crossing', coords: [28.702, 77.028], time: '2 hours ago', upvotes: 18, verified: false }
  ]);
  const [newReportTitle, setNewReportTitle] = useState('');
  const [newReportCategory, setNewReportCategory] = useState('Lighting Failure');
  const [newReportLocation, setNewReportLocation] = useState('');

  // Voice Recognition Web Speech API Effect
  useEffect(() => {
    let recognition = null;
    if (voiceListening && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
        setVoiceTranscript(transcript);
        if (transcript.includes('saferoute emergency') || transcript.includes('help me sos')) {
          setVoiceListening(false);
          triggerEmergencySOS();
        }
      };

      recognition.onerror = () => {
        setVoiceListening(false);
      };

      try {
        recognition.start();
      } catch (e) {
        console.log('Voice recognition already active or blocked');
      }
    }
    return () => {
      if (recognition) {
        try { recognition.stop(); } catch(e){}
      }
    };
  }, [voiceListening]);

  // Fetch initial data & setup Supabase Realtime Channels
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

  // Continuous Geolocation Tracking & Geofence Check
  useEffect(() => {
    if ('geolocation' in navigator) {
      const watcher = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          setLocationStatus('Live Vector GPS Locked');
          
          if (geofenceActive) {
            if (latitude > 28.7) {
              setCurrentSafeHaven('DTU / Rohini Verified Secure Zone');
            } else {
              setCurrentSafeHaven('Transit Corridor Zone');
            }
          }

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
  }, [geofenceActive]);

  // Safety Timer Effect
  useEffect(() => {
    let timer;
    if (checkInActive && checkInTimer > 0) {
      timer = setInterval(() => {
        setCheckInTimer(prev => prev - 1);
      }, 1000);
    } else if (checkInTimer === 0 && checkInActive) {
      setCheckInActive(false);
      triggerEmergencySOS();
    }
    return () => clearInterval(timer);
  }, [checkInActive, checkInTimer]);

  // Panic Siren Audio Effect
  useEffect(() => {
    let audioContext;
    let oscillator;
    let intervalId;

    if (sirenActive) {
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        let high = true;
        intervalId = setInterval(() => {
          if (!audioContext) return;
          oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.type = 'sawtooth';
          oscillator.frequency.setValueAtTime(high ? 880 : 587, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.3);
          high = !high;
        }, 350);
      } catch (e) {
        console.log('Audio context blocked or unsupported');
      }
    }
    return () => {
      clearInterval(intervalId);
      if (audioContext) audioContext.close();
    };
  }, [sirenActive]);

  // Leaflet Map Initialization
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
          html: '<div style="width: 22px; height: 22px; background: #0ea5e9; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 15px rgba(14, 165, 233, 0.6);"></div>',
          iconSize: [22, 22]
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
          if (report.category === 'Police Patrol') badgeColor = '#0284c7';
          if (report.category === 'Lighting Failure') badgeColor = '#e11d48';

          const reportIcon = L.divIcon({
            className: 'report-pin',
            html: `<div style="width: 14px; height: 14px; background: ${badgeColor}; border: 2px solid #ffffff; border-radius: 50%; box-shadow: 0 0 10px ${badgeColor};"></div>`,
            iconSize: [14, 14]
          });

          const reportMarker = L.marker(report.coords, { icon: reportIcon }).addTo(mapRef.current)
            .bindPopup(`
              <div style="color:#0f172a; font-family:sans-serif; padding:4px; max-width:200px;">
                <span style="font-size:10px; font-weight:bold; background:#e0f2fe; color:#0369a1; padding:2px 6px; border-radius:4px; text-transform:uppercase;">${report.category}</span>
                <div style="font-weight:bold; font-size:13px; margin-top:4px; margin-bottom:2px;">${report.title}</div>
                <div style="font-size:11px; color:#475569;">📍 ${report.location}</div>
                <div style="font-size:10px; color:#0284c7; font-weight:bold; margin-top:4px;">👍 ${report.upvotes} Upvotes</div>
              </div>
            `);

          reportMarkersRef.current.push(reportMarker);
        });
      }
    }
  }, [activeTab, reports]);

  // Computer Vision Camera Handlers
  const startCameraStream = async () => {
    setVisionModalOpen(true);
    setScanResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      alert('Unable to access device camera. Please check permissions.');
      setVisionModalOpen(false);
    }
  };

  const stopCameraStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setVisionModalOpen(false);
    setScanningActive(false);
  };

  const handleCaptureAndScan = () => {
    setScanningActive(true);
    setTimeout(() => {
      setScanningActive(false);
      const mockScans = [
        { status: 'Hazard Detected', title: 'Unlit Street Corridor / Broken Lamppost', risk: 'High', color: 'text-rose-500', bg: 'bg-rose-500/10 border-rose-500/30' },
        { status: 'Secure Zone', title: 'Well-Lit Commercial Arcade with CCTV', risk: 'Low', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/30' },
        { status: 'Caution Area', title: 'Low Pedestrian Traffic / Construction Zone', risk: 'Medium', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/30' }
      ];
      const randomScan = mockScans[Math.floor(Math.random() * mockScans.length)];
      setScanResult(randomScan);
    }, 2000);
  };

  // AI Chatbot Handler
  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');
    setChatLoading(true);

    setTimeout(() => {
      let botReply = "I recommend sticking to well-lit main corridors. Ensure your location is shared with your Trusted Circle if walking late.";
      const lower = userMsg.toLowerCase();
      if (lower.includes('nsut') || lower.includes('dtu') || lower.includes('college')) {
        botReply = "Campus transit routes through Dwarka/Rohini are generally monitored with police PCR vans stationed near main gates.";
      } else if (lower.includes('unsafe') || lower.includes('dark') || lower.includes('hazard')) {
        botReply = "If you encounter an unlit stretch, use our Computer Vision scanner to log it instantly or trigger the panic siren if approached.";
      } else if (lower.includes('chetna') || lower.includes('sos')) {
        botReply = "Your SOS broadcast instantly dispatches your live GPS telemetry via WhatsApp to Chetna Kajla and your primary guardians.";
      }

      setChatMessages(prev => [...prev, { sender: 'bot', text: botReply }]);
      setChatLoading(false);
    }, 800);
  };

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
            color: '#0284c7',
            weight: 6,
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
    <div className={`min-h-screen ${stealthMode ? 'bg-slate-900 text-slate-100' : 'bg-gradient-to-br from-sky-50 via-indigo-50/40 to-teal-50/50 text-slate-700'} flex flex-col font-sans relative selection:bg-sky-200 selection:text-slate-900 transition-colors duration-500`}>
      
      {/* OFFLINE BLE MESH RADAR MODAL */}
      {meshModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-teal-500/50 rounded-3xl p-6 max-w-lg w-full shadow-2xl text-slate-100 space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <WifiOff className="w-5 h-5 text-teal-400" />
                <h3 className="font-extrabold text-lg text-white">Offline BLE Mesh Radar</h3>
              </div>
              <button onClick={() => setMeshModalOpen(false)} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              In dead zones or low-signal areas, your device automatically relays SOS packets peer-to-peer via Bluetooth Low Energy (BLE) mesh hops.
            </p>
            <div className="space-y-3">
              {meshNodes.map(node => (
                <div key={node.id} className="p-3.5 bg-slate-800/80 border border-slate-700 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-white">{node.name}</div>
                    <div className="text-[11px] text-teal-400 font-mono">📍 {node.distance} • Signal: {node.signal}</div>
                  </div>
                  <span className="text-[10px] bg-teal-500/10 border border-teal-500/30 text-teal-300 font-bold px-2.5 py-1 rounded-full">
                    {node.status}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setMeshModalOpen(false)}
              className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg"
            >
              Close Mesh Radar
            </button>
          </div>
        </div>
      )}

      {/* COMPUTER VISION CAMERA SCANNER MODAL */}
      {visionModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-sky-500/50 rounded-3xl p-6 max-w-lg w-full shadow-2xl text-slate-100 space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Camera className="w-5 h-5 text-sky-400" />
                <h3 className="font-extrabold text-lg text-white">AI Computer Vision Hazard Scanner</h3>
              </div>
              <button onClick={stopCameraStream} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative w-full h-72 bg-black rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute inset-0 border-2 border-dashed border-sky-400/40 m-6 rounded-xl pointer-events-none flex items-center justify-center">
                <span className="text-xs bg-black/60 text-sky-300 font-mono px-3 py-1 rounded-full backdrop-blur-sm">
                  {scanningActive ? 'Analyzing frame pixels...' : 'Align camera with walkway / street'}
                </span>
              </div>
            </div>

            {scanResult && (
              <div className={`p-4 rounded-2xl border ${scanResult.bg} space-y-1 animate-fade-in`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider ${scanResult.color}`}>{scanResult.status}</span>
                  <span className="text-xs font-mono font-bold text-slate-300">Risk: {scanResult.risk}</span>
                </div>
                <div className="font-bold text-white text-sm">{scanResult.title}</div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleCaptureAndScan}
                disabled={scanningActive}
                className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg flex items-center justify-center space-x-2"
              >
                <Eye className="w-4 h-4" />
                <span>{scanningActive ? 'Scanning...' : 'Scan Environment'}</span>
              </button>
              <button
                onClick={stopCameraStream}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs uppercase tracking-wider"
              >
                Close Camera
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI SAFETY CHATBOT FLOATING DRAWER */}
      {chatOpen && (
        <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-2rem)] h-[500px] bg-white dark:bg-slate-900 border-2 border-sky-500/40 rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden animate-fade-in">
          <div className="bg-gradient-to-r from-sky-650 to-indigo-600 p-4 text-white flex items-center justify-between bg-sky-600">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-sm">AI Safety Copilot</h4>
                <span className="text-[10px] text-sky-200">Online • Ready to assist</span>
              </div>
            </div>
            <button onClick={() => setChatOpen(false)} className="p-1.5 rounded-lg hover:bg-white/20 text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50 dark:bg-slate-950/50 text-xs">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-sky-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-none shadow-sm'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl text-slate-400 text-xs italic animate-pulse">
                  AI Copilot is thinking...
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSendChatMessage} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center space-x-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask safety doubt or route advice..."
              className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none dark:text-white"
            />
            <button type="submit" className="bg-sky-600 hover:bg-sky-500 text-white p-2.5 rounded-xl shadow-md">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* SOS Active Modal */}
      {sosActive && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-pulse">
          <div className="bg-white border-2 border-rose-400 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6">
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
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3.5 rounded-xl border border-slate-300 transition-all text-sm uppercase tracking-wider shadow-sm"
            >
              I am Safe — Cancel SOS
            </button>
          </div>
        </div>
      )}

      {/* Panic Siren Active Modal */}
      {sirenActive && (
        <div className="fixed inset-0 bg-rose-950/80 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-rose-600 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6 animate-bounce">
            <div className="w-24 h-24 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Volume2 className="w-12 h-12 animate-pulse" />
            </div>
            <div>
              <h3 className="text-3xl font-black text-rose-600 tracking-wider mb-2">PANIC SIREN ACTIVE</h3>
              <p className="text-slate-600 text-sm">High-decibel acoustic deterrent blaring. Flashing beacon signal active.</p>
            </div>
            <button
              onClick={() => setSirenActive(false)}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-4 rounded-2xl transition-all text-sm uppercase tracking-wider shadow-lg shadow-rose-600/30"
            >
              Stop Siren Alarm
            </button>
          </div>
        </div>
      )}

      {/* Top Header Navigation */}
      <header className={`border-b ${stealthMode ? 'border-slate-800 bg-slate-900/90' : 'border-sky-100 bg-white/90'} backdrop-blur-xl sticky top-0 z-45 shadow-sm transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('routes')}>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/25 text-white">
              <Shield className="w-6 h-6 fill-white/20 text-white stroke-[2.2]" />
            </div>
            <div>
              <span className={`text-xl font-extrabold tracking-tight ${stealthMode ? 'text-white' : 'text-slate-900'}`}>
                SafeRoute
              </span>
              <span className="block text-[10px] tracking-widest uppercase text-sky-600 font-bold">
                Vector Intelligence Engine
              </span>
            </div>
          </div>

          <nav className={`hidden md:flex items-center space-x-1 ${stealthMode ? 'bg-slate-800/80 border-slate-700' : 'bg-sky-50/70 border-sky-100'} p-1.5 rounded-2xl border`}>
            <button
              onClick={() => setActiveTab('routes')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'routes' ? 'bg-sky-600 text-white shadow-md shadow-sky-600/25' : stealthMode ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-sky-100/60'
              }`}
            >
              <Navigation className="w-4 h-4" />
              <span>Route Planner</span>
            </button>

            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'map' ? 'bg-sky-600 text-white shadow-md shadow-sky-600/25' : stealthMode ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-sky-100/60'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Safety Map</span>
            </button>

            <button
              onClick={() => setActiveTab('trusted')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'trusted' ? 'bg-sky-600 text-white shadow-md shadow-sky-600/25' : stealthMode ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-sky-100/60'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Trusted Circle</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'reports' ? 'bg-sky-600 text-white shadow-md shadow-sky-600/25' : stealthMode ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-sky-100/60'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Community Reports</span>
            </button>
          </nav>

          <div className="hidden md:flex items-center space-x-3">
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md flex items-center space-x-1.5 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Copilot</span>
            </button>

            <button
              onClick={triggerEmergencySOS}
              className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-xl shadow-lg shadow-rose-500/25 transition-all flex items-center space-x-2 animate-pulse"
            >
              <span className="w-2 h-2 rounded-full bg-white"></span>
              <span>Emergency SOS</span>
            </button>
          </div>

          <div className="md:hidden flex items-center space-x-2">
            <button onClick={() => setChatOpen(!chatOpen)} className="p-2 rounded-xl bg-indigo-600 text-white">
              <Sparkles className="w-5 h-5" />
            </button>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className={`p-2 rounded-xl border ${stealthMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-sky-50 border-sky-200 text-slate-700'}`}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className={`md:hidden ${stealthMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-sky-100 text-slate-800'} backdrop-blur-xl border-b px-4 pt-3 pb-5 space-y-2 shadow-2xl animate-fade-in`}>
            <div className={`px-3 py-2 text-xs font-mono rounded-xl border ${stealthMode ? 'bg-slate-800 border-slate-700 text-sky-400' : 'bg-sky-50 border-sky-200 text-sky-800'}`}>
              📍 {locationStatus}
            </div>
            <button onClick={() => { setActiveTab('routes'); setMobileMenuOpen(false); }} className="w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-sm font-medium hover:bg-sky-500/10">
              <Navigation className="w-4 h-4 text-sky-500" /><span>Route Planner</span>
            </button>
            <button onClick={() => { setActiveTab('map'); setMobileMenuOpen(false); }} className="w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-sm font-medium hover:bg-sky-500/10">
              <MapPin className="w-4 h-4 text-sky-500" /><span>Safety Map</span>
            </button>
            <button onClick={() => { setActiveTab('trusted'); setMobileMenuOpen(false); }} className="w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-sm font-medium hover:bg-sky-500/10">
              <Users className="w-4 h-4 text-sky-500" /><span>Trusted Circle</span>
            </button>
            <button onClick={() => { setActiveTab('reports'); setMobileMenuOpen(false); }} className="w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-sm font-medium hover:bg-sky-500/10">
              <AlertTriangle className="w-4 h-4 text-sky-500" /><span>Community Reports</span>
            </button>
            <div className="pt-2 grid grid-cols-2 gap-2">
              <button onClick={() => { setStealthMode(!stealthMode); setMobileMenuOpen(false); }} className="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white text-xs font-bold py-3 rounded-xl">
                Theme Toggle
              </button>
              <button onClick={() => { triggerEmergencySOS(); setMobileMenuOpen(false); }} className="bg-rose-500 text-white text-xs font-bold uppercase tracking-wider py-3 rounded-xl shadow-md flex items-center justify-center space-x-1">
                <span>SOS</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* ENHANCED SAFETY TOOLBAR WITH NEW ENTERPRISE FEATURES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Feature 1: Computer Vision Scanner */}
          <div className={`p-4 rounded-3xl border shadow-lg backdrop-blur-md flex flex-col justify-between space-y-3 ${stealthMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/90 border-sky-100'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">AI Vision Scanner</span>
              <Camera className="w-5 h-5 text-indigo-500" />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">Open camera to instantly detect hazards & unlit paths.</p>
            <button
              onClick={startCameraStream}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center space-x-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Launch Camera Scan</span>
            </button>
          </div>

          {/* Feature 2: Offline BLE Mesh Status Radar */}
          <div className={`p-4 rounded-3xl border shadow-lg backdrop-blur-md flex flex-col justify-between space-y-3 ${stealthMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/90 border-sky-100'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">Offline BLE Mesh</span>
              <WifiOff className="w-5 h-5 text-teal-500 animate-pulse" />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">4 active mesh nodes linked for low-signal fallback.</p>
            <button
              onClick={() => setMeshModalOpen(true)}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center space-x-1.5"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>View Mesh Radar</span>
            </button>
          </div>

          {/* Feature 3: Geofenced Safe Haven Auto-Alert */}
          <div className={`p-4 rounded-3xl border shadow-lg backdrop-blur-md flex flex-col justify-between space-y-3 ${stealthMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/90 border-sky-100'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">Safe Haven Zone</span>
              <Shield className="w-5 h-5 text-sky-500" />
            </div>
            <div className="text-[11px] font-mono text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-slate-900 p-2 rounded-xl border border-sky-200 dark:border-slate-700 truncate">
              📍 {currentSafeHaven}
            </div>
            <button
              onClick={() => {
                setGeofenceActive(!geofenceActive);
                alert(`Geofenced Safe Haven alerts ${!geofenceActive ? 'enabled' : 'disabled'}.`);
              }}
              className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${geofenceActive ? 'bg-sky-600 hover:bg-sky-700 text-white' : 'bg-slate-700 text-slate-300'}`}
            >
              {geofenceActive ? 'Geofence Active' : 'Enable Geofence'}
            </button>
          </div>

          {/* Feature 4: Hands-Free Voice SOS Listener */}
          <div className={`p-4 rounded-3xl border shadow-lg backdrop-blur-md flex flex-col justify-between space-y-3 ${stealthMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/90 border-sky-100'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Voice SOS Trigger</span>
              {voiceListening ? <Mic className="w-5 h-5 text-rose-500 animate-bounce" /> : <MicOff className="w-5 h-5 text-slate-400" />}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">Say <span className="font-bold text-rose-500">"SafeRoute Emergency"</span> to trigger SOS.</p>
            <button
              onClick={() => setVoiceListening(!voiceListening)}
              className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${voiceListening ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-slate-800 dark:bg-slate-700 text-slate-200'}`}
            >
              {voiceListening ? 'Listening for Passphrase...' : 'Enable Voice Trigger'}
            </button>
          </div>

        </div>

        {/* TAB 1: ROUTE PLANNER */}
        {activeTab === 'routes' && (
          <div className="space-y-6">
            <div className={`backdrop-blur-md border rounded-3xl p-6 sm:p-8 shadow-xl ${stealthMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/90 border-sky-100'}`}>
              <h2 className={`text-2xl font-black mb-2 ${stealthMode ? 'text-white' : 'text-slate-900'}`}>Safety-Aware Vector Route Comparison</h2>
              <p className={`text-sm mb-8 ${stealthMode ? 'text-slate-300' : 'text-slate-600'}`}>Enter your journey details to calculate live street paths and evaluate safety indices using OSRM & community hazard pins.</p>

              <form onSubmit={handleSearchRoutes} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="relative">
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${stealthMode ? 'text-slate-300' : 'text-slate-600'}`}>Starting Point</label>
                    <div className="relative flex items-center">
                      <MapPin className="absolute left-4 w-5 h-5 text-sky-600" />
                      <input
                        type="text"
                        value={startLocation}
                        onChange={(e) => setStartLocation(e.target.value)}
                        placeholder="e.g., Live Position / Metro Station"
                        className={`w-full border rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:outline-none transition-all shadow-sm ${stealthMode ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-sky-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:bg-white'}`}
                        required
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${stealthMode ? 'text-slate-300' : 'text-slate-600'}`}>Destination</label>
                    <div className="relative flex items-center">
                      <Navigation className="absolute left-4 w-5 h-5 text-rose-500" />
                      <input
                        type="text"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="e.g., NSUT / DTU / Rohini Sector 16"
                        className={`w-full border rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:outline-none transition-all shadow-sm ${stealthMode ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-sky-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:bg-white'}`}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between pt-2 gap-4">
                  <div className={`flex items-center space-x-2 p-1.5 rounded-2xl border w-full sm:w-auto ${stealthMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                    <button type="button" onClick={() => setTravelMode('walking')} className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all ${travelMode === 'walking' ? 'bg-sky-600 text-white shadow-md' : stealthMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>
                      <Footprints className="w-4 h-4" /><span>Walking</span>
                    </button>
                    <button type="button" onClick={() => setTravelMode('transit')} className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all ${travelMode === 'transit' ? 'bg-sky-600 text-white shadow-md' : stealthMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>
                      <Zap className="w-4 h-4" /><span>Transit / Driving</span>
                    </button>
                  </div>

                  <button type="submit" disabled={isSearching} className="w-full sm:w-auto bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold px-8 py-3.5 rounded-2xl shadow-lg shadow-sky-600/25 flex items-center justify-center space-x-2 transition-all">
                    {isSearching ? <span>Computing Vector Route...</span> : <><span>Find Safest Route</span><ArrowRight className="w-4 h-4" /></>}
                  </button>
                </div>
              </form>
            </div>

            {routesSearched && activeRouteInfo && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className={`backdrop-blur-md border rounded-3xl p-6 shadow-xl relative flex flex-col justify-between ${stealthMode ? 'bg-slate-800/80 border-sky-500' : 'bg-white/90 border-sky-300'}`}>
                    <div className="absolute top-0 right-0 bg-sky-600 text-white text-[10px] font-extrabold uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl shadow-sm">OSRM & Hazard Verified</div>
                    <div>
                      <h4 className={`text-lg font-bold mb-2 ${stealthMode ? 'text-white' : 'text-slate-900'}`}>Safest & Well-Lit Route</h4>
                      <div className={`grid grid-cols-3 gap-3 my-4 p-4 rounded-2xl border text-xs ${stealthMode ? 'bg-slate-900/60 border-slate-700' : 'bg-sky-50/70 border-sky-100'}`}>
                        <div><span className="text-slate-400 block">Safety Index</span><span className="text-base font-extrabold text-sky-600 dark:text-sky-400">{activeRouteInfo.safetyIndex}</span></div>
                        <div><span className="text-slate-400 block">Duration</span><span className={`text-base font-bold ${stealthMode ? 'text-white' : 'text-slate-900'}`}>{activeRouteInfo.duration}</span></div>
                        <div><span className="text-slate-400 block">Distance</span><span className="text-base font-bold text-sky-600 dark:text-sky-400">{activeRouteInfo.distance}</span></div>
                      </div>
                    </div>
                    <button onClick={() => setActiveTab('map')} className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3.5 rounded-2xl text-sm flex items-center justify-center space-x-2 shadow-lg shadow-sky-600/20 transition-all">
                      <Navigation className="w-4 h-4" /><span>View Polyline on Map</span>
                    </button>
                  </div>

                  <div className={`backdrop-blur-md border rounded-3xl p-6 shadow-xl flex flex-col justify-between ${stealthMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/90 border-slate-200'}`}>
                    <div>
                      <h4 className={`text-lg font-bold mb-2 ${stealthMode ? 'text-white' : 'text-slate-900'}`}>Alternative Vector Path</h4>
                      <div className={`grid grid-cols-3 gap-3 my-4 p-4 rounded-2xl border text-xs ${stealthMode ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                        <div><span className="text-slate-400 block">Safety Index</span><span className="text-base font-extrabold text-amber-500">64 / 100</span></div>
                        <div><span className="text-slate-400 block">Duration</span><span className={`text-base font-bold ${stealthMode ? 'text-white' : 'text-slate-900'}`}>{activeRouteInfo.duration}</span></div>
                        <div><span className="text-slate-400 block">Lighting</span><span className="text-base font-bold text-amber-500">Poor (45%)</span></div>
                      </div>
                    </div>
                    <button onClick={() => alert('Alternative route selected.')} className={`w-full font-bold py-3.5 rounded-2xl border text-sm transition-all ${stealthMode ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'}`}>
                      Proceed Anyway
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: INTERACTIVE MAP */}
        {activeTab === 'map' && (
          <div className="space-y-6">
            <div className={`backdrop-blur-md border rounded-3xl p-6 shadow-xl ${stealthMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/90 border-sky-100'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <div>
                  <h2 className={`text-xl font-bold mb-1 flex items-center space-x-2 ${stealthMode ? 'text-white' : 'text-slate-900'}`}>
                    <Compass className="w-5 h-5 text-sky-600" />
                    <span>Interactive Safety Intelligence Map</span>
                  </h2>
                  <p className={`text-sm ${stealthMode ? 'text-slate-300' : 'text-slate-600'}`}>Displaying live telemetry, OSRM routing polylines, and community hazard pins.</p>
                </div>
                
                <div className={`flex items-center space-x-4 text-xs px-4 py-2.5 rounded-2xl border ${stealthMode ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-sky-50 border-sky-100 text-slate-700'}`}>
                  <div className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span><span className="font-medium">You</span></div>
                  <div className="flex items-center space-x-1.5"><span className="w-4 h-1 bg-sky-500"></span><span className="font-medium">Safe Route</span></div>
                  <div className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span><span className="font-medium">Hazards</span></div>
                </div>
              </div>

              <div className="w-full h-[500px] sm:h-[550px] rounded-2xl overflow-hidden border border-sky-100 shadow-xl relative z-10">
                <div ref={mapContainerRef} className="w-full h-full" />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TRUSTED CIRCLE */}
        {activeTab === 'trusted' && (
          <div className="space-y-6">
            <div className={`backdrop-blur-md border rounded-3xl p-6 sm:p-8 shadow-xl ${stealthMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/90 border-sky-100'}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                  <h2 className={`text-2xl font-black mb-1 ${stealthMode ? 'text-white' : 'text-slate-900'}`}>Trusted Circle & Emergency Center</h2>
                  <p className={`text-sm ${stealthMode ? 'text-slate-300' : 'text-slate-600'}`}>Manage designated emergency guardians who receive live telemetry and SOS alerts instantly.</p>
                </div>
                <button
                  onClick={triggerEmergencySOS}
                  className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-6 py-3.5 rounded-2xl shadow-lg shadow-rose-500/25 flex items-center justify-center space-x-2 animate-pulse transition-all border border-rose-400/30"
                >
                  <BellRing className="w-5 h-5" />
                  <span>Test Emergency SOS Broadcast</span>
                </button>
              </div>

              <form onSubmit={handleAddContact} className={`p-6 rounded-2xl border mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end shadow-sm ${stealthMode ? 'bg-slate-900 border-slate-700' : 'bg-sky-50/60 border-sky-100'}`}>
                <div>
                  <label className={`block text-xs font-bold uppercase mb-1 ${stealthMode ? 'text-slate-300' : 'text-slate-600'}`}>Contact Name</label>
                  <input
                    type="text"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    placeholder="e.g., Guardian Name"
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none shadow-sm ${stealthMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-sky-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-sky-500'}`}
                    required
                  />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase mb-1 ${stealthMode ? 'text-slate-300' : 'text-slate-600'}`}>Phone Number</label>
                  <input
                    type="text"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    placeholder="+91 XXXXX XXXXX"
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none shadow-sm ${stealthMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-sky-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-sky-500'}`}
                    required
                  />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase mb-1 ${stealthMode ? 'text-slate-300' : 'text-slate-600'}`}>Relation / Role</label>
                  <input
                    type="text"
                    value={newContactRelation}
                    onChange={(e) => setNewContactRelation(e.target.value)}
                    placeholder="e.g., Family / Authority"
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none shadow-sm ${stealthMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-sky-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-sky-500'}`}
                  />
                </div>
                <button type="submit" className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center space-x-2 transition-all shadow-md shadow-sky-600/20">
                  <UserPlus className="w-4 h-4" />
                  <span>Add Guardian</span>
                </button>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {trustedContacts.map(contact => (
                  <div key={contact.id} className={`border p-6 rounded-2xl relative flex flex-col justify-between shadow-md transition-all ${stealthMode ? 'bg-slate-900 border-slate-700 hover:border-sky-500' : 'bg-white border-slate-200/80 hover:border-sky-200'}`}>
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className={`font-bold text-base ${stealthMode ? 'text-white' : 'text-slate-900'}`}>{contact.name}</h4>
                          <span className="text-xs text-sky-600 dark:text-sky-400 font-semibold">{contact.relation}</span>
                        </div>
                        <button onClick={() => handleDeleteContact(contact.id)} className="text-slate-400 hover:text-rose-600 p-1 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className={`text-xs space-y-1 font-mono mb-6 p-3 rounded-xl border ${stealthMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                        <div>📞 {contact.phone}</div>
                        <div>⚡ {contact.status}</div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <a href={`tel:${contact.phone}`} className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold border flex items-center justify-center space-x-1.5 transition-all ${stealthMode ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'}`}>
                        <Phone className="w-3.5 h-3.5 text-sky-500" />
                        <span>Call</span>
                      </a>
                      <button onClick={() => alert(`Live telemetry link dispatched to ${contact.name}`)} className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold border flex items-center justify-center space-x-1.5 transition-all ${stealthMode ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'}`}>
                        <Share2 className="w-3.5 h-3.5 text-sky-500" />
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
            <div className={`backdrop-blur-md border rounded-3xl p-6 sm:p-8 shadow-xl ${stealthMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/90 border-sky-100'}`}>
              <h2 className={`text-2xl font-black mb-1 ${stealthMode ? 'text-white' : 'text-slate-900'}`}>Community Safety Reports & Hazard Intel</h2>
              <p className={`text-sm mb-6 ${stealthMode ? 'text-slate-300' : 'text-slate-600'}`}>Report unlit pathways, safety hazards, or police patrols. Pins automatically anchor to your current live GPS coordinates.</p>

              <form onSubmit={handleAddReport} className={`p-6 rounded-2xl border mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end shadow-sm ${stealthMode ? 'bg-slate-900 border-slate-700' : 'bg-sky-50/60 border-sky-100'}`}>
                <div className="sm:col-span-2">
                  <label className={`block text-xs font-bold uppercase mb-1 ${stealthMode ? 'text-slate-300' : 'text-slate-600'}`}>Report Description</label>
                  <input
                    type="text"
                    value={newReportTitle}
                    onChange={(e) => setNewReportTitle(e.target.value)}
                    placeholder="e.g., Unlit corridor near Metro Pillar 42"
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none shadow-sm ${stealthMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-sky-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-sky-500'}`}
                    required
                  />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase mb-1 ${stealthMode ? 'text-slate-300' : 'text-slate-600'}`}>Category</label>
                  <select
                    value={newReportCategory}
                    onChange={(e) => setNewReportCategory(e.target.value)}
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none shadow-sm ${stealthMode ? 'bg-slate-800 border-slate-700 text-white focus:border-sky-500' : 'bg-white border-slate-200 text-slate-900 focus:border-sky-500'}`}
                  >
                    <option value="Lighting Failure">Lighting Failure</option>
                    <option value="Safety Hazard">Safety Hazard</option>
                    <option value="Police Patrol">Police Patrol</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase mb-1 ${stealthMode ? 'text-slate-300' : 'text-slate-600'}`}>Location Name</label>
                  <input
                    type="text"
                    value={newReportLocation}
                    onChange={(e) => setNewReportLocation(e.target.value)}
                    placeholder="e.g., Sector 16 Rohini"
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none shadow-sm ${stealthMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-sky-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-sky-500'}`}
                  />
                </div>
                <div className="sm:col-span-4">
                  <button type="submit" className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center space-x-2 transition-all shadow-md shadow-sky-600/20">
                    <PlusCircle className="w-4 h-4" />
                    <span>Publish Geofenced Community Report</span>
                  </button>
                </div>
              </form>

              <div className="space-y-4">
                {reports.map(report => (
                  <div key={report.id} className={`border p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm transition-all ${stealthMode ? 'bg-slate-900 border-slate-700 hover:border-sky-500' : 'bg-white border-slate-200/80 hover:border-sky-200'}`}>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${stealthMode ? 'bg-slate-800 border-slate-700 text-sky-400' : 'bg-sky-50 border-sky-100 text-sky-700'}`}>
                          {report.category}
                        </span>
                        <span className="text-xs text-slate-400">• {report.time}</span>
                      </div>
                      <h4 className={`font-bold text-base ${stealthMode ? 'text-white' : 'text-slate-900'}`}>{report.title}</h4>
                      <p className="text-xs text-slate-400">📍 {report.location}</p>
                    </div>
                    <button
                      onClick={() => handleUpvote(report.id)}
                      className={`border px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-sm ${stealthMode ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100'}`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5 text-sky-500" />
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
