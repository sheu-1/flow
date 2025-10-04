/**
 * CountrySelector Component
 * 
 * A reusable React Native component for selecting countries with flags, names, and calling codes.
 * Uses react-native-country-picker-modal for country selection functionality.
 * 
 * INSTALLATION REQUIREMENTS:
 * npm install react-native-country-picker-modal react-native-svg react-native-localize
 * 
 * For Expo projects, you may also need:
 * expo install react-native-svg
 * 
 * Note: react-native-svg is already installed in this project (see package.json)
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import CountryPicker, { Country, CountryCode } from 'react-native-country-picker-modal';

export interface SelectedCountry {
  name: string;
  cca2: CountryCode;
  callingCode: string;
}

// Some versions of react-native-country-picker-modal return name as a translation map
// Normalize to a plain string for our SelectedCountry type
function normalizeCountryName(name: Country['name']): string {
  if (typeof name === 'string') return name;
  const anyName: any = name as any;
  return (
    anyName?.common ||
    anyName?.official ||
    anyName?.en ||
    (anyName && typeof anyName === 'object' ? Object.values(anyName)[0] : '') ||
    ''
  );
}

interface CountrySelectorProps {
  /** Currently selected country */
  selectedCountry?: SelectedCountry;
  /** Callback when country is selected */
  onSelect: (country: SelectedCountry) => void;
  /** Placeholder text when no country is selected */
  placeholder?: string;
  /** Custom container style */
  containerStyle?: ViewStyle;
  /** Custom button style */
  buttonStyle?: ViewStyle;
  /** Custom text style */
  textStyle?: TextStyle;
  /** Show calling code in the display */
  showCallingCode?: boolean;
  /** Show country name in the display */
  showCountryName?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

const CountrySelector: React.FC<CountrySelectorProps> = ({
  selectedCountry,
  onSelect,
  placeholder = 'Select Country',
  containerStyle,
  buttonStyle,
  textStyle,
  showCallingCode = true,
  showCountryName = true,
  disabled = false,
}) => {

  const handleCountrySelect = (country: Country) => {
    const selectedData: SelectedCountry = {
      name: normalizeCountryName(country.name) || (country.cca2 as string),
      cca2: country.cca2,
      callingCode: Array.isArray(country.callingCode)
        ? country.callingCode?.[0] || ''
        : (country.callingCode as unknown as string) || '',
    };
    
    onSelect(selectedData);
  };

  return (
    <View
      style={[styles.container, containerStyle, disabled && { opacity: 0.6 }]}
      pointerEvents={disabled ? 'none' : 'auto'}
    >
      <CountryPicker
        countryCode={selectedCountry?.cca2 || 'KE'}
        withFlag
        withEmoji={false}
        withFilter
        withAlphaFilter
        withCallingCode
        withCountryNameButton={showCountryName}
        withCallingCodeButton={showCallingCode}
        withCloseButton
        onSelect={handleCountrySelect}
        containerButtonStyle={[
          styles.button,
          buttonStyle,
          disabled && styles.buttonDisabled,
        ]}
        modalProps={{
          animationType: 'slide',
          presentationStyle: 'fullScreen',
          transparent: false,
        }}
      />
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  button: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    minHeight: 48,
  },
  buttonDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  // No inner content styles needed since we use library's containerButton
});

export default CountrySelector;
