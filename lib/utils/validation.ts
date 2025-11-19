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
  return password.length >= 6;
};

export const validatePhoneNumber = (phone: string): boolean => {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Philippine phone number formats:
  // Mobile: 09XX XXX XXXX (11 digits starting with 09)
  // International: +63 9XX XXX XXXX (13 digits starting with +63)
  // Landline: 0XXX XXX XXXX (10-11 digits starting with 0)
  
  // Check for international format (+63)
  if (cleaned.startsWith('+63')) {
    const digits = cleaned.substring(3); // Remove +63
    // Should be 10 digits starting with 9 (mobile) or area code (landline)
    return /^9\d{9}$/.test(digits) || /^[2-8]\d{6,7}$/.test(digits);
  }
  
  // Check for local format (starts with 0)
  if (cleaned.startsWith('0')) {
    // Mobile: 09XX XXX XXXX (11 digits)
    if (cleaned.startsWith('09')) {
      return cleaned.length === 11 && /^09\d{9}$/.test(cleaned);
    }
    // Landline: 0XXX XXX XXXX (10-11 digits)
    return cleaned.length >= 10 && cleaned.length <= 11 && /^0\d{9,10}$/.test(cleaned);
  }
  
  // Check for digits only (without leading 0 or +)
  // Should be 10 digits (mobile without leading 0 or landline area code)
  if (/^\d+$/.test(cleaned)) {
    // Mobile: 9XX XXX XXXX (10 digits starting with 9)
    if (cleaned.startsWith('9') && cleaned.length === 10) {
      return true;
    }
    // Landline: Area code + 7 digits (9-10 digits total)
    if (cleaned.length >= 9 && cleaned.length <= 10) {
      return true;
    }
  }
  
  return false;
};

export const validateZipCode = (zip: string): boolean => {
  return /^\d{5}(-\d{4})?$/.test(zip);
};
