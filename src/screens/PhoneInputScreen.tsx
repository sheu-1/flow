/**
 * PhoneInputScreen - Example usage of CountrySelector component
 * 
 * This screen demonstrates how to use the CountrySelector component
 * for phone number input with country code selection.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ScrollView,
  FlatList,
} from 'react-native';

// Simple country data for autocomplete
const COUNTRIES = [
  { name: 'Afghanistan', code: 'AF', callingCode: '93' },
  { name: 'Albania', code: 'AL', callingCode: '355' },
  { name: 'Algeria', code: 'DZ', callingCode: '213' },
  { name: 'Argentina', code: 'AR', callingCode: '54' },
  { name: 'Australia', code: 'AU', callingCode: '61' },
  { name: 'Austria', code: 'AT', callingCode: '43' },
  { name: 'Bangladesh', code: 'BD', callingCode: '880' },
  { name: 'Belgium', code: 'BE', callingCode: '32' },
  { name: 'Brazil', code: 'BR', callingCode: '55' },
  { name: 'Canada', code: 'CA', callingCode: '1' },
  { name: 'China', code: 'CN', callingCode: '86' },
  { name: 'Egypt', code: 'EG', callingCode: '20' },
  { name: 'France', code: 'FR', callingCode: '33' },
  { name: 'Germany', code: 'DE', callingCode: '49' },
  { name: 'Ghana', code: 'GH', callingCode: '233' },
  { name: 'India', code: 'IN', callingCode: '91' },
  { name: 'Indonesia', code: 'ID', callingCode: '62' },
  { name: 'Italy', code: 'IT', callingCode: '39' },
  { name: 'Japan', code: 'JP', callingCode: '81' },
  { name: 'Kenya', code: 'KE', callingCode: '254' },
  { name: 'Malaysia', code: 'MY', callingCode: '60' },
  { name: 'Mexico', code: 'MX', callingCode: '52' },
  { name: 'Netherlands', code: 'NL', callingCode: '31' },
  { name: 'Nigeria', code: 'NG', callingCode: '234' },
  { name: 'Norway', code: 'NO', callingCode: '47' },
  { name: 'Pakistan', code: 'PK', callingCode: '92' },
  { name: 'Philippines', code: 'PH', callingCode: '63' },
  { name: 'Poland', code: 'PL', callingCode: '48' },
  { name: 'Russia', code: 'RU', callingCode: '7' },
  { name: 'Rwanda', code: 'RW', callingCode: '250' },
  { name: 'Saudi Arabia', code: 'SA', callingCode: '966' },
  { name: 'Singapore', code: 'SG', callingCode: '65' },
  { name: 'South Africa', code: 'ZA', callingCode: '27' },
  { name: 'South Korea', code: 'KR', callingCode: '82' },
  { name: 'Spain', code: 'ES', callingCode: '34' },
  { name: 'Sweden', code: 'SE', callingCode: '46' },
  { name: 'Switzerland', code: 'CH', callingCode: '41' },
  { name: 'Tanzania', code: 'TZ', callingCode: '255' },
  { name: 'Thailand', code: 'TH', callingCode: '66' },
  { name: 'Turkey', code: 'TR', callingCode: '90' },
  { name: 'Uganda', code: 'UG', callingCode: '256' },
  { name: 'Ukraine', code: 'UA', callingCode: '380' },
  { name: 'United Arab Emirates', code: 'AE', callingCode: '971' },
  { name: 'United Kingdom', code: 'GB', callingCode: '44' },
  { name: 'United States', code: 'US', callingCode: '1' },
  { name: 'Vietnam', code: 'VN', callingCode: '84' },
];

type Country = {
  name: string;
  code: string;
  callingCode: string;
};

const PhoneInputScreen: React.FC = () => {
  const [countryInput, setCountryInput] = useState('Kenya');
  const [selectedCountry, setSelectedCountry] = useState<Country>({
    name: 'Kenya',
    code: 'KE',
    callingCode: '254',
  });
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredCountries, setFilteredCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleCountryInputChange = (text: string) => {
    setCountryInput(text);
    
    if (text.length > 0) {
      const filtered = COUNTRIES.filter(country =>
        country.name.toLowerCase().includes(text.toLowerCase())
      ).slice(0, 5); // Show max 5 suggestions
      
      setFilteredCountries(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setFilteredCountries([]);
    }
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setCountryInput(country.name);
    setShowSuggestions(false);
    console.log('Selected country:', country);
  };

  const handleSubmit = () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    const fullPhoneNumber = `+${selectedCountry.callingCode}${phoneNumber}`;
    
    Alert.alert(
      'Phone Number Submitted',
      `Country: ${selectedCountry.name}\nFull Number: ${fullPhoneNumber}`,
      [{ text: 'OK' }]
    );
  };

  const formatPhoneNumber = (text: string) => {
    // Remove any non-numeric characters
    const cleaned = text.replace(/\D/g, '');
    
    // Limit to reasonable phone number length
    if (cleaned.length <= 15) {
      setPhoneNumber(cleaned);
    }
  };

  const getFullPhoneNumber = () => {
    if (!phoneNumber) return '';
    return phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Phone Number Input</Text>
        <Text style={styles.subtitle}>
          Select your country and enter your phone number
        </Text>

        {/* Country Input with Autocomplete */}
        <View style={styles.section}>
          <Text style={styles.label}>Country</Text>
          <View style={styles.autocompleteContainer}>
            <TextInput
              style={styles.countryInput}
              placeholder="Type country name..."
              value={countryInput}
              onChangeText={handleCountryInputChange}
              onFocus={() => {
                if (countryInput.length > 0) {
                  handleCountryInputChange(countryInput);
                }
              }}
            />
            {showSuggestions && filteredCountries.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <FlatList
                  data={filteredCountries}
                  keyExtractor={(item) => item.code}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.suggestionItem}
                      onPress={() => handleCountrySelect(item)}
                    >
                      <Text style={styles.suggestionText}>
                        {item.name} (+{item.callingCode})
                      </Text>
                    </TouchableOpacity>
                  )}
                  style={styles.suggestionsList}
                  keyboardShouldPersistTaps="handled"
                />
              </View>
            )}
          </View>
        </View>

        {/* Phone Number Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Phone Number (with country code)</Text>
          <TextInput
            style={styles.phoneInputFull}
            placeholder="e.g. +254712345678 or +1234567890"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />
          
          {/* Suggested format based on selected country */}
          {selectedCountry && (
            <Text style={styles.hintText}>
              Suggested format for {selectedCountry.name}: +{selectedCountry.callingCode}XXXXXXXXX
            </Text>
          )}
          
          {/* Full phone number preview */}
          {phoneNumber ? (
            <Text style={styles.previewText}>
              Full number: {getFullPhoneNumber()}
            </Text>
          ) : null}
        </View>

        {/* Selected Country Info */}
        <View style={styles.section}>
          <Text style={styles.label}>Selected Country Info</Text>
          <View style={styles.countryInfo}>
            <Text style={styles.countryInfoText}>
              Country: {selectedCountry.name}
            </Text>
            <Text style={styles.countryInfoText}>
              Code: {selectedCountry.code}
            </Text>
            <Text style={styles.countryInfoText}>
              Calling Code: +{selectedCountry.callingCode}
            </Text>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, !phoneNumber && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!phoneNumber || isLoading}
        >
          <Text style={[styles.submitButtonText, !phoneNumber && styles.submitButtonTextDisabled]}>
            {isLoading ? 'Processing...' : 'Submit Phone Number'}
          </Text>
        </TouchableOpacity>

        {/* Debug Info */}
        <View style={styles.debugSection}>
          <Text style={styles.debugTitle}>Debug Info:</Text>
          <Text style={styles.debugText}>
            Country Input: {countryInput}
          </Text>
          <Text style={styles.debugText}>
            Selected Country: {JSON.stringify(selectedCountry, null, 2)}
          </Text>
          <Text style={styles.debugText}>
            Phone Number: {phoneNumber}
          </Text>
          <Text style={styles.debugText}>
            Full Number: {getFullPhoneNumber()}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  autocompleteContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  countryInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    maxHeight: 200,
    zIndex: 1001,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionText: {
    fontSize: 16,
    color: '#111827',
  },
  phoneInputFull: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  hintText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  countryInfo: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
  },
  countryInfoText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  previewText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  submitButtonTextDisabled: {
    color: '#9CA3AF',
  },
  debugSection: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
});

export default PhoneInputScreen;
