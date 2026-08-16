export function registerServiceWorker() {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        console.log('SafeRoute SW registered successfully: ', registration.scope);
      }).catch((error) => {
        console.log('SafeRoute SW registration failed: ', error);
      });
    });
  }
}