// IMPORT WAJIB: Penyeimbang WebRTC untuk semua browser (Safari/Android lama)
import 'webrtc-adapter';

// NOTE: Global Error Handlers for Web3 conflicts are now injected in index.html <head>
// to ensure they run before any extension code.

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { VaultProvider } from './contexts/VaultContext';
import { FeatureProvider } from './contexts/FeatureContext';

// Note: Capacitor URL handler (untuk balik dari Google Login ke app)
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

// Firebase redirect result (ambil hasil login setelah balik)
import { getAuth, getRedirectResult } from 'firebase/auth';
const auth = getAuth();

// Mencegah error jika root tidak ditemukan (Safety check)
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('FATAL: Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);

/**
 * Helper function to detect iOS PWA
 */
function isIosPwa(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent || "";
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    (window.navigator as { standalone?: boolean }).standalone === true;
  return isIos && isStandalone;
}

/**
 * Note: Tangkap redirect balik dari browser ke app (Capacitor)
 * Ini penting untuk Firebase Google Login redirect.
 */
if (Capacitor.isNativePlatform()) {
  CapApp.addListener('appUrlOpen', async ({ url }) => {
    console.log('APP URL OPEN:', url);

    try {
      // Ini akan menyelesaikan proses redirect login jika ada
      await getRedirectResult(auth);
    } catch (e) {
      console.error('Redirect error', e);
    }

    // Kembalikan ke root app (hindari nyangkut di handler page)
    window.location.replace('/');
  });
}

/**
 * Handle redirect result for PWA (especially iOS PWA)
 * This ensures redirect login completes properly after returning from Google
 */
if (!Capacitor.isNativePlatform() && isIosPwa()) {
  // Check for redirect result immediately on load
  getRedirectResult(auth)
    .then((result) => {
      if (result?.user) {
        console.log('[PWA_REDIRECT] User signed in via redirect');
        // Clear any stale flags
        sessionStorage.removeItem("istok_login_redirect");
        sessionStorage.removeItem("istok_redirect_processed");
        // Reload to trigger auth state update
        window.location.reload();
      }
    })
    .catch((error) => {
      console.warn('[PWA_REDIRECT] No redirect result or error:', error);
      // Clear flags on error to prevent loops
      sessionStorage.removeItem("istok_login_redirect");
      sessionStorage.removeItem("istok_redirect_processed");
    });
}

/**
 * Note: Service Worker untuk PWA
 * Jangan aktifkan SW di Capacitor (native webview), biar tidak intercept request/login.
 */
if (!Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('SW Registered:', registration.scope);
      })
      .catch((error) => {
        console.log('SW Registration Failed:', error);
      });
  });
}

// StrictMode diaktifkan untuk best practice
root.render(
  <React.StrictMode>
    <FeatureProvider>
      <VaultProvider>
        <App />
      </VaultProvider>
    </FeatureProvider>
  </React.StrictMode>
);


