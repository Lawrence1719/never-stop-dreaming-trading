/** Format number as Philippine Peso: ₱1,000.00 (peso sign + comma thousands + 2 decimals) */
export const formatPrice = (price: number): string => {
  const formatted = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(price);
  return formatted.replace(/^PHP\s*/, "₱");
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
export const formatRelativeTime = (date: string | Date): string => {
  const d = new Date(date);
  const now = new Date();
  const diffInMs = now.getTime() - d.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays < 1) return "Member for less than a day";
  if (diffInDays === 1) return "Member for 1 day";
  if (diffInDays < 7) return `Member for ${diffInDays} days`;
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks === 1) return "Member for 1 week";
  if (diffInWeeks < 4) return `Member for ${diffInWeeks} weeks`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths === 1) return "Member for 1 month";
  if (diffInMonths < 12) return `Member for ${diffInMonths} months`;
  
  const diffInYears = Math.floor(diffInDays / 365);
  if (diffInYears === 1) return "Member for 1 year";
  return `Member for ${diffInYears} years`;
};
