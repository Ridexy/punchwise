/** Single place for the brand and deployment settings. Rename the product here. */
export const SITE_NAME = 'Punchwise';
export const SITE_TAGLINE = 'Free time card calculator';
export const SITE_URL: string = (import.meta.env.VITE_SITE_URL || 'https://punchwise.com').replace(/\/$/, '');
export const CF_BEACON_TOKEN: string = import.meta.env.VITE_CF_BEACON_TOKEN || '';
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');
