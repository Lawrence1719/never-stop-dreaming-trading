# Address Validation Implementation

## Overview

This document describes the comprehensive address validation system implemented for the Never Stop Dreaming (NSD) e-commerce platform, specifically designed for the Philippines market (Metro Manila and surrounding areas).

## Features Implemented

### 1. Real-time Client-side Validation
- **Immediate feedback**: Fields are validated as users type (with debouncing for text fields)
- **Visual indicators**: 
  - Red borders and error messages for invalid fields
  - Green checkmarks for valid fields
  - Required field indicators (*)
- **Field-specific validation**:
  - Full Name: Minimum 2 characters, must contain letters, no repeated characters
  - Email: Standard email format validation
  - Phone: Philippine phone number formats (09XX XXX XXXX, +63, etc.)
  - Street Address: Minimum 5 characters, must contain letters, no all-numbers
  - City: Minimum 2 characters, must contain letters
  - Province: Dropdown selector with predefined provinces
  - Zip Code: 4-digit format, validated against city/province

### 2. Philippines-Specific Address Data
- **Location**: `lib/data/philippines-addresses.ts`
- **Coverage**: 
  - All Metro Manila cities (Taguig, Makati, Manila, Quezon City, Pasig, etc.)
  - Surrounding provinces (Rizal, Cavite)
  - Zip codes mapped to cities
  - Barangay data for Taguig (can be expanded)
- **Features**:
  - Province dropdown with all available provinces
  - City dropdown filtered by selected province
  - Zip code validation against city/province combination
  - Zip code suggestions displayed when city is selected

### 3. Enhanced Validation Rules

#### Street Address
- Minimum 5 characters
- Cannot be all numbers
- Must contain at least one letter
- Rejects suspicious patterns (all caps without spaces, repeated characters)

#### City & Province
- Minimum 2 characters
- Must contain letters
- Cannot be all numbers
- Dropdown selectors prevent invalid entries

#### Zip Code
- Must be exactly 4 digits (Philippines format)
- Validated against selected city/province
- Shows valid zip codes for selected city

#### Phone Number
- Supports multiple Philippine formats:
  - Mobile: `09XX XXX XXXX` (11 digits)
  - International: `+63 9XX XXX XXXX`
  - Landline: `0XXX XXX XXXX` (10-11 digits)

### 4. Server-side Validation API
- **Endpoint**: `/api/validate/address`
- **Method**: POST
- **Purpose**: Security layer - validates all address fields server-side
- **Returns**: 
  ```json
  {
    "valid": boolean,
    "isValid": { field: boolean },
    "errors": { field: string }
  }
  ```

### 5. User Experience Improvements

#### Form Enhancements
- **Placeholders**: Helpful examples (e.g., "0912 345 6789", "1630")
- **Tooltips**: Zip code suggestions shown when city is selected
- **Disabled states**: City dropdown disabled until province is selected
- **Visual feedback**: 
  - ✓ checkmarks for valid fields
  - Error messages with specific guidance
  - Required field indicators

#### Address Confirmation
- Enhanced review step with formatted address display
- Shows all address details (name, street, city, province, zip, phone, email)
- "Edit Address" button to return to shipping step
- Clear visual separation with border and background

## Validation Functions

### Location: `lib/utils/validation.ts`

#### New Functions Added:
1. `validateStreetAddress(address: string)` - Validates street address format
2. `validateCity(city: string)` - Validates city name
3. `validateProvince(province: string)` - Validates province name
4. `validateFullName(name: string)` - Validates full name
5. `validateZipCodeForLocation(zip, city?, province?)` - Validates zip code with location context

#### Updated Functions:
1. `validateZipCode(zip: string)` - Updated for Philippines 4-digit format (was US 5-digit)

## Address Data Structure

### Location: `lib/data/philippines-addresses.ts`

```typescript
interface City {
  name: string;
  province: string;
  zipCodes: string[];
  barangays?: string[];
}

interface Province {
  name: string;
  cities: City[];
}
```

### Helper Functions:
- `getAllCities()` - Returns all cities
- `getCitiesByProvince(province: string)` - Returns cities for a province
- `getProvinces()` - Returns all provinces
- `validateZipCodeForCity(zip, city, province)` - Validates zip against location
- `getZipCodesForCity(city, province)` - Returns valid zip codes for a city

## Implementation Details

### Checkout Page Updates
- Real-time validation on field blur and change events
- Debounced validation for text inputs (500ms delay)
- Immediate validation for selects and zip/phone fields
- State management for touched fields
- Dynamic city dropdown based on province selection
- Zip code validation with city/province context

### Error Handling
- Clear, actionable error messages
- Field-specific validation rules
- Prevents form submission with invalid data
- Visual feedback for all validation states

## Usage Example

```typescript
// In checkout form
const validateField = (name: string, value: string) => {
  switch (name) {
    case "street":
      const validation = validateStreetAddress(value);
      if (!validation.valid) {
        setError(validation.error);
      }
      break;
    // ... other fields
  }
};
```

## Future Enhancements

### Potential Additions:
1. **Google Places API Integration**: For address autocomplete
2. **Barangay Dropdown**: Expand barangay data for all cities
3. **Geolocation**: Pre-fill address for returning customers
4. **Address Verification Service**: Integration with PhilPost or similar
5. **Address Normalization**: Standardize address formats
6. **Delivery Zone Validation**: Check if address is within delivery area

## Testing Recommendations

1. **Test invalid inputs**:
   - Random strings ("xyz123", "asdfsdf")
   - All numbers
   - All caps without spaces
   - Repeated characters
   - Invalid zip codes for selected city

2. **Test valid inputs**:
   - Real Philippine addresses
   - Various phone number formats
   - Different cities and provinces

3. **Test edge cases**:
   - Empty fields
   - Very long inputs
   - Special characters
   - Province/city/zip mismatches

## Success Metrics

- ✅ Reduction in failed deliveries due to invalid addresses
- ✅ Decrease in customer service inquiries about address issues
- ✅ Improvement in first-time delivery success rate
- ✅ Better customer experience with clear validation feedback

## Files Modified/Created

1. **Created**:
   - `lib/data/philippines-addresses.ts` - Address data
   - `app/api/validate/address/route.ts` - Server-side validation
   - `docs/ADDRESS_VALIDATION.md` - This documentation

2. **Modified**:
   - `lib/utils/validation.ts` - Enhanced validation functions
   - `app/checkout/page.tsx` - Updated checkout form with validation

## Notes

- Address data currently focuses on Metro Manila and Taguig area as per business requirements
- Can be easily expanded to include more provinces and cities
- Validation is designed to be strict enough to prevent invalid addresses while remaining user-friendly
- Server-side validation provides security layer - never trust client-side validation alone










