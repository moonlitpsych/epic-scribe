/**
 * Preload script for Electron
 *
 * This is a minimal preload since we don't have a renderer window.
 * The app runs entirely in the main process with just a tray icon.
 */

// No preload needed for tray-only app
console.log('Preload script loaded');
