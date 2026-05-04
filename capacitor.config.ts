import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.adrewards.ph',
  appName: 'AdRewards Pro',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
