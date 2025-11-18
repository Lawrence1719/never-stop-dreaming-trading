export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};

export const validatePhoneNumber = (phone: string): boolean => {
  return /^\+?1?\d{10}$/.test(phone.replace(/\D/g, ""));
};

export const validateZipCode = (zip: string): boolean => {
  return /^\d{5}(-\d{4})?$/.test(zip);
};
