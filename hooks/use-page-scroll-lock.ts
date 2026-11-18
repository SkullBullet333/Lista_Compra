'use client';

import { useEffect, useRef } from 'react';

const escapeDismissals: { close: () => void }[] = [];

function dismissPopup(event: KeyboardEvent) {
  if (event.key !== 'Escape' || event.defaultPrevented || !window.matchMedia('(min-width: 768px)').matches) return;
  // Native dialogs handle Escape through their cancel event.
  if (document.querySelector('dialog[open]')) return;
  const popup = escapeDismissals[escapeDismissals.length - 1];
  if (!popup) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (!event.repeat) popup.close();
}

const activeLocks = new Set<symbol>();
let restoreStyles: (() => void) | undefined;

export function lockPageScroll(): () => void {
  const token = Symbol('popup-scroll-lock');
  if (activeLocks.size === 0) {
    const root = document.documentElement;
    const body = document.body;
    const properties = [
      [root, 'overflow'],
      [root, 'scrollbar-gutter'],
      [root, 'overscroll-behavior'],
      [body, 'overflow'],
    ] as const;
    const previous = properties.map(([element, property]) => ({
      element, property,
      value: element.style.getPropertyValue(property),
      priority: element.style.getPropertyPriority(property),
    }));
    // Keep the scrollbar's space so opening a popup doesn't shift the layout.
    if (window.innerWidth > root.clientWidth) root.style.setProperty('scrollbar-gutter', 'stable');
    root.style.setProperty('overflow', 'hidden', 'important');
    root.style.setProperty('overscroll-behavior', 'none', 'important');
    body.style.setProperty('overflow', 'hidden', 'important');
    restoreStyles = () => {
      for (const { element, property, value, priority } of previous) {
        if (value) element.style.setProperty(property, value, priority);
        else element.style.removeProperty(property);
      }
    };
  }
  activeLocks.add(token);
  return () => {
    if (!activeLocks.delete(token) || activeLocks.size > 0) return;
    restoreStyles?.();
    restoreStyles = undefined;
  };
}

export function usePageScrollLock(isOpen: boolean, onDismiss?: () => void): void {
  const dismissRef = useRef(onDismiss);
  useEffect(() => { dismissRef.current = onDismiss; }, [onDismiss]);
  const dismissible = !!onDismiss;
  useEffect(() => {
    if (!isOpen || !dismissible) return;
    const popup = { close: () => dismissRef.current?.() };
    escapeDismissals.push(popup);
    if (escapeDismissals.length === 1) document.addEventListener('keydown', dismissPopup);
    return () => {
      escapeDismissals.splice(escapeDismissals.indexOf(popup), 1);
      if (!escapeDismissals.length) document.removeEventListener('keydown', dismissPopup);
    };
  }, [isOpen, dismissible]);

  useEffect(() => {
    if (!isOpen) return;
    const desktop = window.matchMedia('(min-width: 768px)');
    let release: (() => void) | undefined;
    const update = () => {
      if (desktop.matches && !release) release = lockPageScroll();
      else if (!desktop.matches && release) {
        release();
        release = undefined;
      }
    };
    update();
    desktop.addEventListener('change', update);
    return () => {
      desktop.removeEventListener('change', update);
      release?.();
    };
  }, [isOpen]);
}
