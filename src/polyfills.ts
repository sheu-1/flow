// Simple polyfill for react-native-chart-kit
// Set global useLocale function that the chart library expects
if (typeof global !== 'undefined') {
  // @ts-ignore
  global.useLocale = () => ({ languageCode: 'en', countryCode: 'US' });
}
