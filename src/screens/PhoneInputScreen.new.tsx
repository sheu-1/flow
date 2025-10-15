import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';

// Country data for phone number input
const COUNTRIES = [
  { name: 'Kenya', code: 'KE', callingCode: '254', flag: '🇰🇪' },
  { name: 'United States', code: 'US', callingCode: '1', flag: '🇺🇸' },
  { name: 'United Kingdom', code: 'GB', callingCode: '44', flag: '🇬🇧' },
  { name: 'India', code: 'IN', callingCode: '91', flag: '🇮🇳' },
  { name: 'Nigeria', code: 'NG', callingCode: '234', flag: '🇳🇬' },
  { name: 'South Africa', code: 'ZA', callingCode: '27', flag: '🇿🇦' },
  { name: 'Canada', code: 'CA', callingCode: '1', flag: '🇨🇦' },
  { name: 'Australia', code: 'AU', callingCode: '61', flag: '🇦🇺' },
  { name: 'Germany', code: 'DE', callingCode: '49', flag: '🇩🇪' },
  { name: 'France', code: 'FR', callingCode: '33', flag: '🇫🇷' },
];

type Country = {
  name: string;
  code: string;
  callingCode: string;
  flag: string;
};

const PhoneInputScreen: React.FC = () => {
  const { colors } = useTheme();
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCountries = COUNTRIES.filter((country) =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.callingCode.includes(searchQuery)
  );

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setShowCountryPicker(false);
    setSearchQuery('');
  };

  const formatPhoneNumber = (text: string) => {
    // Remove non-numeric characters
    const cleaned = text.replace(/\D/g, '');
    setPhoneNumber(cleaned);
  };

  const getFullPhoneNumber = () => {
    if (!phoneNumber) return '';
    return `+${selectedCountry.callingCode}${phoneNumber}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="call" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Phone Number</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Enter your phone number to receive M-Pesa notifications
          </Text>
        </View>

        {/* Country Selector */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Country</Text>
          <TouchableOpacity
            style={[styles.countryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowCountryPicker(!showCountryPicker)}
          >
            <View style={styles.countryButtonContent}>
              <Text style={styles.flag}>{selectedCountry.flag}</Text>
              <Text style={[styles.countryName, { color: colors.text }]}>
                {selectedCountry.name}
              </Text>
              <Text style={[styles.callingCode, { color: colors.textSecondary }]}>
                +{selectedCountry.callingCode}
              </Text>
            </View>
            <Ionicons
              name={showCountryPicker ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {/* Country Picker Dropdown */}
          {showCountryPicker && (
            <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="search" size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Search countries..."
                  placeholderTextColor={colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
              <FlatList
                data={filteredCountries}
                keyExtractor={(item) => item.code}
                style={styles.countryList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.countryItem,
                      { borderBottomColor: colors.border },
                      item.code === selectedCountry.code && { backgroundColor: colors.primary + '10' },
                    ]}
                    onPress={() => handleCountrySelect(item)}
                  >
                    <Text style={styles.flag}>{item.flag}</Text>
                    <Text style={[styles.countryItemName, { color: colors.text }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.countryItemCode, { color: colors.textSecondary }]}>
                      +{item.callingCode}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>

        {/* Phone Number Input */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Phone Number</Text>
          <View style={[styles.phoneInputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.prefixContainer, { borderRightColor: colors.border }]}>
              <Text style={[styles.prefix, { color: colors.text }]}>
                +{selectedCountry.callingCode}
              </Text>
            </View>
            <TextInput
              style={[styles.phoneInput, { color: colors.text }]}
              placeholder="712345678"
              placeholderTextColor={colors.textMuted}
              value={phoneNumber}
              onChangeText={formatPhoneNumber}
              keyboardType="phone-pad"
              maxLength={15}
            />
          </View>
          {phoneNumber && (
            <Text style={[styles.fullNumber, { color: colors.textSecondary }]}>
              Full number: {getFullPhoneNumber()}
            </Text>
          )}
        </View>

        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
          <Ionicons name="information-circle" size={24} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>
              Why do we need your phone number?
            </Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              We use your phone number to automatically parse M-Pesa SMS messages and track your transactions.
              Your number is kept secure and never shared.
            </Text>
          </View>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            { backgroundColor: phoneNumber.length >= 9 ? colors.primary : colors.inactive },
          ]}
          disabled={phoneNumber.length < 9}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  countryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  countryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flag: {
    fontSize: 24,
  },
  countryName: {
    fontSize: 16,
    fontWeight: '500',
  },
  callingCode: {
    fontSize: 14,
  },
  dropdown: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 300,
    overflow: 'hidden',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  countryList: {
    maxHeight: 250,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  countryItemName: {
    flex: 1,
    fontSize: 16,
  },
  countryItemCode: {
    fontSize: 14,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  prefixContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRightWidth: 1,
  },
  prefix: {
    fontSize: 16,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  fullNumber: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
  },
  continueButton: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default PhoneInputScreen;
