// Mock implementation of expo-localization for Expo managed workflow (no native deps)
function getLocales() { return [{ languageCode: 'en', countryCode: 'US', languageTag: 'en-US', isRTL: false }]; }
const locale = 'en-US';
const isRTL = false;
const region = 'US';

module.exports = {
  getLocales,
  locale,
  isRTL,
  region,
  default: {
    getLocales,
    locale,
    isRTL,
    region,
  },
};
