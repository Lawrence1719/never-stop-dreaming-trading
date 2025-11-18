export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
};

export const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
};

export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length !== 10) return phone;
  return `+1 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
};
