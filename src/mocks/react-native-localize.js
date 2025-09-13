// Mock implementation of react-native-localize for Expo (CommonJS)
function useLocale() { return { languageCode: 'en', countryCode: 'US' }; }
function getLocales() { return [{ languageCode: 'en', countryCode: 'US' }]; }
function findBestAvailableLanguage() { return { languageTag: 'en', isRTL: false }; }
function getNumberFormatSettings() { return { decimalSeparator: '.', groupingSeparator: ',' }; }
function getCalendar() { return 'gregorian'; }
function getCountry() { return 'US'; }
function getCurrencies() { return ['USD']; }
function getTemperatureUnit() { return 'fahrenheit'; }
function getTimeZone() { return 'America/New_York'; }
function uses24HourClock() { return false; }
function usesMetricSystem() { return false; }
function usesAutoDateAndTime() { return true; }
function usesAutoTimeZone() { return true; }

module.exports = {
  useLocale,
  getLocales,
  findBestAvailableLanguage,
  getNumberFormatSettings,
  getCalendar,
  getCountry,
  getCurrencies,
  getTemperatureUnit,
  getTimeZone,
  uses24HourClock,
  usesMetricSystem,
  usesAutoDateAndTime,
  usesAutoTimeZone,
  default: {
    useLocale,
    getLocales,
    findBestAvailableLanguage,
    getNumberFormatSettings,
    getCalendar,
    getCountry,
    getCurrencies,
    getTemperatureUnit,
    getTimeZone,
    uses24HourClock,
    usesMetricSystem,
    usesAutoDateAndTime,
    usesAutoTimeZone,
  },
};
