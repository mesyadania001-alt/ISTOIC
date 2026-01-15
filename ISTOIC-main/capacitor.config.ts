import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.istoic.app',
  appName: 'ISTOIC',
  webDir: 'dist',
  bundledWebRuntime: false,
  // HAPUS server block supaya pakai scheme default "capacitor://"
};

export default config;
