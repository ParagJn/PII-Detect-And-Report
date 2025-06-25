import { cn } from "./utils";

// Google-inspired color palette for PII types
const piiColorMap: Record<string, { base: string; badge: string }> = {
  // Red for highly sensitive data
  SSN:      { base: 'bg-red-100 text-red-900 dark:bg-red-900/50 dark:text-red-200', badge: 'border-red-300 dark:border-red-700' },
  PASSPORT: { base: 'bg-red-100 text-red-900 dark:bg-red-900/50 dark:text-red-200', badge: 'border-red-300 dark:border-red-700' },
  AADHAAR:  { base: 'bg-red-100 text-red-900 dark:bg-red-900/50 dark:text-red-200', badge: 'border-red-300 dark:border-red-700' },
  PAN:      { base: 'bg-red-100 text-red-900 dark:bg-red-900/50 dark:text-red-200', badge: 'border-red-300 dark:border-red-700' },
  
  // Green for personal identifiers
  NAME:     { base: 'bg-green-100 text-green-900 dark:bg-green-900/50 dark:text-green-200', badge: 'border-green-300 dark:border-green-700' },
  ADDRESS:  { base: 'bg-green-100 text-green-900 dark:bg-green-900/50 dark:text-green-200', badge: 'border-green-300 dark:border-green-700' },
  
  // Blue for contact information
  EMAIL:    { base: 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-200', badge: 'border-blue-300 dark:border-blue-700' },
  PHONE:    { base: 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-200', badge: 'border-blue-300 dark:border-blue-700' },
  
  // Yellow for dates/other
  DOB:      { base: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-800/50 dark:text-yellow-200', badge: 'border-yellow-300 dark:border-yellow-600' },

  // Default fallback
  DEFAULT:  { base: 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-200', badge: 'border-gray-300 dark:border-gray-600' },
};

const getPiiClasses = (type: string): { base: string; badge: string } => {
    const upperType = type.toUpperCase().trim();
    return piiColorMap[upperType] || piiColorMap.DEFAULT;
}

export const getPiiStyle = (type: string): string => {
  return getPiiClasses(type).base;
};

export const getPiiBadgeStyle = (type: string): string => {
  const classes = getPiiClasses(type);
  return cn(classes.base, classes.badge);
}
