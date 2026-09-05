// utils/sosDispatcher.js

export const dispatchEmergencySOS = (guardians, currentGPS, userData) => {
  if (!guardians || guardians.length === 0) {
    alert("No guardians found in your Trusted Circle! Please add one first.");
    return;
  }

  // Fallboard coordinates if GPS isn't locked yet
  const lat = currentGPS?.lat || "28.6139";
  const lng = currentGPS?.lng || "77.2090";
  const googleMapsUrl = `https://maps.google.com/?q=${lat},${lng}`;

  const emergencyMessage = 
    `🚨 EMERGENCY SOS ALERT! 🚨\n` +
    `Name: ${userData?.name || "User"}\n` +
    `I am in danger and require immediate assistance!\n\n` +
    `📍 Live GPS Location:\n${googleMapsUrl}\n\n` +
    `Please check my live telemetry on SafeRoute immediately.`;

  // Loop through all saved guardians and trigger dispatch
  guardians.forEach((guardian, index) => {
    const cleanPhone = guardian.phone.replace(/[^0-9]/g, '');
    
    // 1. WhatsApp Web/App Universal Intent URL
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(emergencyMessage)}`;
    
    // 2. Fallback native SMS URI scheme (sms:+91XXXXXXXXXX?body=...)
    const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(emergencyMessage)}`;

    // Open WhatsApp via window.open (Staggered slightly to prevent browser popup blockers from choking multi-tabs)
    setTimeout(() => {
      // On mobile, wa.me prompts the app directly. On desktop, it opens WhatsApp Web.
      const win = window.open(whatsappUrl, '_blank');
      
      // If popup blocker stops multiple windows, fallback to triggering standard location href for the first contact
      if (!win && index === 0) {
        window.location.href = smsUrl;
      }
    }, index * 400); // 400ms delay between opening multiple guardian links
  });
};