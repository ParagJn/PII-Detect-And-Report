import { cn } from "./utils";

const piiTypeToStyleMap: Record<string, string> = {
  EMAIL:    'bg-chart-1/70 text-foreground',
  NAME:     'bg-chart-2/70 text-foreground',
  SSN:      'bg-destructive/70 text-destructive-foreground',
  PHONE:    'bg-chart-3/70 text-foreground',
  ADDRESS:  'bg-chart-4/70 text-foreground',
  PASSPORT: 'bg-chart-5/70 text-foreground',
  DOB:      'bg-chart-3/70 text-foreground',
  AADHAAR:  'bg-chart-2/70 text-foreground',
  PAN:      'bg-chart-1/70 text-foreground',
};

const defaultStyle = 'bg-accent text-accent-foreground';

const getPiiClass = (type: string): string => {
    const upperType = type.toUpperCase();
    // Use a direct lookup for efficiency and correctness.
    return piiTypeToStyleMap[upperType] || defaultStyle;
}

export const getPiiStyle = (type: string): string => {
  return cn("px-1.5 py-0.5 rounded-md", getPiiClass(type));
};

export const getPiiBadgeStyle = (type: string): string => {
  return cn("border-transparent", getPiiClass(type));
}
