export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const baseUrl = import.meta.env.BASE_URL || "/";
      navigator.serviceWorker
        .register(`${baseUrl}service-worker.js`)
        .then((registration) => {
          console.log('Service Worker registered:', registration);
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error);
        });
    });
  }
}

// PWA install prompt handling
// Users can install via browser menu (Android) or Share button (iOS)
// No custom install button needed - native prompts work better
export function setupInstallTracking() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    console.log('PWA install prompt available');
    // Let the browser handle the install prompt via native UI
  });

  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed successfully');
  });
}
