export const validateEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  // Trim whitespace
  const trimmedEmail = email.trim();
  
  // Basic email regex - more permissive
  // Allows: local@domain.tld
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  // Additional checks
  if (trimmedEmail.length === 0 || trimmedEmail.length > 254) {
    return false;
  }
  
  // Check for consecutive dots or dots at start/end of local part
  const [localPart, domain] = trimmedEmail.split('@');
  if (!localPart || !domain) {
    return false;
  }
  
  if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return false;
  }
  
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
    return false;
  }
  
  return emailRegex.test(trimmedEmail);
};

export const validatePassword = (password: string): boolean => {
  // Basic check for existence and minimum length (permissive for login)
  return !!password && password.length >= 6;
};

/**
 * Strict password validation for new passwords (Registration, Reset, Change)
 * Requirements: 8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 symbol
 */
export const validatePasswordStrength = (password: string): { valid: boolean; error?: string } => {
  if (!password || password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  // Symbols/Special characters
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character/symbol (e.g. !@#$%^&*)' };
  }
  return { valid: true };
};

export const validatePhoneNumber = (phone: string): boolean => {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Philippine mobile format (after +63): 9XX XXX XXXX (Exactly 10 digits starting with 9)
  return cleaned.length === 10 && /^9\d{9}$/.test(cleaned);
};

/**
 * Validates Philippines zip code format (4 digits)
 */
export const validateZipCode = (zip: string): boolean => {
  if (!zip || typeof zip !== 'string') {
    return false;
  }
  // Philippines zip codes are 4 digits
  const cleaned = zip.trim().replace(/\s/g, '');
  return /^\d{4}$/.test(cleaned);
};

/**
 * Validates street address format
 * Rules:
 * - Minimum 5 characters
 * - Cannot be all numbers
 * - Cannot be all caps (suspicious)
 * - Must contain at least one letter
 */
export const validateStreetAddress = (address: string): { valid: boolean; error?: string } => {
  if (!address || typeof address !== 'string') {
    return { valid: false, error: 'Street address is required' };
  }

  const trimmed = address.trim();

  // Minimum length check
  if (trimmed.length < 5) {
    return { valid: false, error: 'Street address must be at least 5 characters' };
  }

  // Cannot be all numbers
  if (/^\d+$/.test(trimmed)) {
    return { valid: false, error: 'Street address cannot be all numbers' };
  }

  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(trimmed)) {
    return { valid: false, error: 'Street address must contain at least one letter' };
  }

  // Check for suspicious patterns (all caps with no spaces, or random characters)
  const allCapsNoSpaces = /^[A-Z0-9]{5,}$/.test(trimmed) && !/\s/.test(trimmed);
  if (allCapsNoSpaces && trimmed.length < 10) {
    return { valid: false, error: 'Please enter a valid street address' };
  }

  // Check for repeated characters (e.g., "aaaaa", "12345")
  const repeatedChars = /^(.)\1{4,}$/.test(trimmed);
  if (repeatedChars) {
    return { valid: false, error: 'Please enter a valid street address' };
  }

  return { valid: true };
};

/**
 * Validates city name
 * Rules:
 * - Minimum 2 characters
 * - Must contain at least one letter
 * - Cannot be all numbers
 */
export const validateCity = (city: string): { valid: boolean; error?: string } => {
  if (!city || typeof city !== 'string') {
    return { valid: false, error: 'City is required' };
  }

  const trimmed = city.trim();

  if (trimmed.length < 2) {
    return { valid: false, error: 'City must be at least 2 characters' };
  }

  if (/^\d+$/.test(trimmed)) {
    return { valid: false, error: 'City cannot be all numbers' };
  }

  if (!/[a-zA-Z]/.test(trimmed)) {
    return { valid: false, error: 'City must contain at least one letter' };
  }

  return { valid: true };
};

/**
 * Validates province name
 * Rules:
 * - Minimum 2 characters
 * - Must contain at least one letter
 * - Cannot be all numbers
 */
export const validateProvince = (province: string): { valid: boolean; error?: string } => {
  if (!province || typeof province !== 'string') {
    return { valid: false, error: 'Province is required' };
  }

  const trimmed = province.trim();

  if (trimmed.length < 2) {
    return { valid: false, error: 'Province must be at least 2 characters' };
  }

  if (/^\d+$/.test(trimmed)) {
    return { valid: false, error: 'Province cannot be all numbers' };
  }

  if (!/[a-zA-Z]/.test(trimmed)) {
    return { valid: false, error: 'Province must contain at least one letter' };
  }

  return { valid: true };
};

/**
 * Validates full name
 * Rules:
 * - Minimum 2 characters
 * - Must contain at least one letter
 * - Cannot be all numbers
 */
/**
 * Validates a name field (First, Middle, or Last)
 * Rules:
 * - Minimum 1 character (for required fields)
 * - Only letters (including accented/unicode), spaces, hyphens, and apostrophes
 */
export const validateName = (name: string, fieldName: string = 'Name'): { valid: boolean; error?: string } => {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: `${fieldName} is required` };
  }

  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: `${fieldName} is required` };
  }

  // Regex allows letters (including accented), spaces, hyphens, and apostrophes
  const nameRegex = /^[a-zA-ZÀ-ÖØ-öø-ÿ\s'\-]+$/;
  if (!nameRegex.test(trimmed)) {
    return { valid: false, error: `${fieldName} must contain letters only` };
  }

  return { valid: true };
};

export const validateFullName = (name: string): { valid: boolean; error?: string } => {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Full name is required' };
  }

  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return { valid: false, error: 'Full name must be at least 2 characters' };
  }

  if (/^\d+$/.test(trimmed)) {
    return { valid: false, error: 'Full name cannot be all numbers' };
  }

  if (!/[a-zA-Z]/.test(trimmed)) {
    return { valid: false, error: 'Full name must contain at least one letter' };
  }

  // Check for suspicious patterns (repeated characters)
  const repeatedChars = /^(.)\1{4,}$/.test(trimmed);
  if (repeatedChars) {
    return { valid: false, error: 'Please enter a valid name' };
  }

  return { valid: true };
};

/**
 * Validates Philippines zip code format and optionally checks against city/province
 */
export const validateZipCodeForLocation = (
  zip: string,
  city?: string,
  province?: string
): { valid: boolean; error?: string } => {
  // Basic format validation
  if (!validateZipCode(zip)) {
    return { valid: false, error: 'Zip code must be 4 digits (e.g., 1630)' };
  }

  // If city and province are provided, validate against known data
  if (city && province) {
    try {
      const { cityZipCodes } = require('@/lib/data/philippines-zip-codes');
      
      // Normalize city name for lookup (similar to getZipCodesForCity)
      const normalizedCity = city.replace(/city$/i, "").trim().toLowerCase();
      const cityKey = Object.keys(cityZipCodes).find(k => 
        k.toLowerCase().replace(/city$/i, "").trim() === normalizedCity
      );

      if (cityKey) {
        const validZipCodes = cityZipCodes[cityKey];
        if (!validZipCodes.includes(zip)) {
          return {
            valid: false,
            error: `Zip code ${zip} does not match ${city}. Please verify your zip code.`
          };
        }
      }
    } catch (err) {
      // If address data fails to load, just validate format
      console.warn('Failed to load zip code data for validation', err);
    }
  }

  return { valid: true };
};
