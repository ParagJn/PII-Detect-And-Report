import { cn } from "./utils";

// A distinct, high-contrast, and reliable color mapping for each PII type.
const piiTypeToStyleMap: Record<string, string> = {
  // Sensitive data (reds/pinks)
  SSN: 'bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100',
  PASSPORT: 'bg-pink-200 text-pink-900 dark:bg-pink-800 dark:text-pink-100',

  // Identifiers (greens/teals)
  NAME: 'bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-100',
  AADHAAR: 'bg-teal-200 text-teal-900 dark:bg-teal-800 dark:text-teal-100',
  
  // Contact info (blues/indigos)
  EMAIL: 'bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-100',
  PHONE: 'bg-sky-200 text-sky-900 dark:bg-sky-800 dark:text-sky-100',
  ADDRESS: 'bg-indigo-200 text-indigo-900 dark:bg-indigo-800 dark:text-indigo-100',
  
  // Other info (yellows/grays)
  DOB: 'bg-yellow-200 text-yellow-900 dark:bg-yellow-700 dark:text-yellow-100',
  PAN: 'bg-slate-300 text-slate-900 dark:bg-slate-600 dark:text-slate-100',
};

const defaultStyle = 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100';

const getPiiClass = (type: string): string => {
    const upperType = type.toUpperCase().trim();
    return piiTypeToStyleMap[upperType] || defaultStyle;
}

export const getPiiStyle = (type: string): string => {
  return cn("px-1.5 py-0.5 rounded-md font-medium", getPiiClass(type));
};

export const getPiiBadgeStyle = (type: string): string => {
  return cn("border-transparent", getPiiClass(type));
}
