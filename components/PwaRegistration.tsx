'use client';

import { useEffect } from 'react';

export function PwaRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV === 'development') {
      void navigator.serviceWorker.getRegistrations().then(registrations =>
        Promise.all(registrations.map(registration => registration.unregister()))
      ).then(async () => {
        if (!('caches' in window)) return;
        const names = await caches.keys();
        await Promise.all(names.filter(name => name.startsWith('minhas-listas-')).map(name => caches.delete(name)));
      }).catch(error => console.warn('Não foi possível limpar o cache local do aplicativo.', error));
      return;
    }
    navigator.serviceWorker.register('/sw.js').catch(error => {
      console.warn('Não foi possível ativar o modo aplicativo.', error);
    });
  }, []);

  return null;
}
