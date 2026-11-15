'use client';

import { RefObject, useEffect } from 'react';

export function useOutsideDismiss<T extends HTMLElement>(
  ref: RefObject<T | null>,
  isOpen: boolean,
  onDismiss: () => void,
) {
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !ref.current?.contains(event.target)) onDismiss();
    };
    // Capture also catches clicks on controls that stop event propagation.
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [ref, isOpen, onDismiss]);
}
