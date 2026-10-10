'use client';

import { useEffect } from 'react';

export function PwaRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(error => {
        console.warn('Não foi possível ativar o modo aplicativo.', error);
      });
    }
  }, []);

  return null;
}
