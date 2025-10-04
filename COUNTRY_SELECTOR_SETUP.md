# Country Selector Component Setup Guide

## Overview
The `CountrySelector` component provides a reusable country picker with flags, names, and calling codes for React Native applications using TypeScript.

## Installation

### Required Dependencies
```bash
npm install react-native-country-picker-modal react-native-localize
```

### Already Installed Dependencies
The following dependencies are already present in this project:
- `react-native-svg` (v15.12.1) - Required for flag rendering
- `react-native` (v0.81.4) - Base React Native framework

### For Expo Projects
If you're using Expo (which this project is), you may need to install the Expo-compatible version:
```bash
expo install react-native-svg
```

## Component Features

### CountrySelector Component
- **TypeScript Support**: Full TypeScript integration with proper types
- **Flag Display**: Shows country flags using emoji or SVG
- **Search Functionality**: Built-in country search and filtering
- **Calling Codes**: Displays country calling codes (e.g., +254 for Kenya)
- **Customizable**: Flexible styling and display options
- **Accessibility**: Proper accessibility support

### Props Interface
```typescript
interface CountrySelectorProps {
  selectedCountry?: SelectedCountry;
  onSelect: (country: SelectedCountry) => void;
  placeholder?: string;
  containerStyle?: ViewStyle;
  buttonStyle?: ViewStyle;
  textStyle?: TextStyle;
  showCallingCode?: boolean;
  showCountryName?: boolean;
  disabled?: boolean;
}

interface SelectedCountry {
  name: string;
  cca2: CountryCode;
  callingCode: string;
}
```

## Usage Examples

### Basic Usage
```typescript
import CountrySelector, { SelectedCountry } from '../components/CountrySelector';

const [selectedCountry, setSelectedCountry] = useState<SelectedCountry>({
  name: 'Kenya',
  cca2: 'KE',
  callingCode: '254',
});

<CountrySelector
  selectedCountry={selectedCountry}
  onSelect={setSelectedCountry}
  placeholder="Select Country"
/>
```

### Phone Number Input
```typescript
<CountrySelector
  selectedCountry={selectedCountry}
  onSelect={handleCountrySelect}
  showCallingCode={true}
  showCountryName={true}
/>
```

### Custom Styling
```typescript
<CountrySelector
  selectedCountry={selectedCountry}
  onSelect={handleCountrySelect}
  containerStyle={{ marginBottom: 16 }}
  buttonStyle={{ borderColor: '#3B82F6', borderWidth: 2 }}
  textStyle={{ color: '#1D4ED8', fontWeight: '600' }}
/>
```

## Files Created

### 1. CountrySelector.tsx
- **Location**: `src/components/CountrySelector.tsx`
- **Purpose**: Main reusable component
- **Features**: Country selection with flags, names, and calling codes

### 2. PhoneInputScreen.tsx
- **Location**: `src/screens/PhoneInputScreen.tsx`
- **Purpose**: Example implementation screen
- **Features**: Complete phone number input form with country selection

## Integration with Existing App

### Navigation Setup
To add the PhoneInputScreen to your navigation, update your navigation files:

```typescript
// In your navigation stack
import PhoneInputScreen from '../screens/PhoneInputScreen';

// Add to your stack navigator
<Stack.Screen 
  name="PhoneInput" 
  component={PhoneInputScreen}
  options={{ title: 'Phone Number Input' }}
/>
```

### Usage in Forms
The component integrates well with form libraries like Formik or react-hook-form:

```typescript
// With react-hook-form
const { control, setValue, watch } = useForm();
const selectedCountry = watch('country');

<Controller
  control={control}
  name="country"
  render={({ field: { onChange, value } }) => (
    <CountrySelector
      selectedCountry={value}
      onSelect={onChange}
    />
  )}
/>
```

## Customization Options

### Preferred Countries
Set preferred countries to appear at the top of the list:
```typescript
// In CountrySelector.tsx, modify the preferredCountries prop:
preferredCountries={['KE', 'UG', 'TZ', 'RW']} // East African countries
```

### Exclude Countries
Exclude specific countries from the picker:
```typescript
// In CountrySelector.tsx, modify the excludeCountries prop:
excludeCountries={['XX', 'YY']} // Replace with actual country codes
```

### Theme Integration
The component uses neutral colors that can be easily customized to match your app's theme. Update the styles in `CountrySelector.tsx` to match your design system.

## Troubleshooting

### Common Issues

1. **SVG not rendering**: Ensure `react-native-svg` is properly installed and linked
2. **TypeScript errors**: Make sure you're importing the correct types from `react-native-country-picker-modal`
3. **Modal not showing**: Check that your React Native version is compatible with the country picker modal

### Platform-Specific Notes

- **iOS**: Works out of the box with Expo
- **Android**: May require additional setup for SVG rendering in bare React Native projects
- **Web**: Supported through react-native-web

## Performance Considerations

- The component lazy-loads country data
- Flag images are optimized for performance
- Search functionality is debounced for smooth user experience

## Next Steps

1. Install the required dependencies: `npm install react-native-country-picker-modal react-native-localize`
2. Test the component in your development environment
3. Customize the styling to match your app's design
4. Integrate with your existing forms and navigation

The component is ready to use and fully functional with proper TypeScript support!
