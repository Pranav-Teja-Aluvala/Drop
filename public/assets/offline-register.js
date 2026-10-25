// Only the static error screen is cached. Transfer data never enters the cache.
if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/offline-worker.js', {scope: '/', updateViaCache: 'none'}).catch(function () {
      // Offline fallback is optional; registration failure must not block sharing.
    });
  });
}
