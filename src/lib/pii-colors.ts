import { cn } from "./utils";

// A distinct, business-friendly color mapping for each PII type.
const piiTypeToStyleMap: Record<string, string> = {
  // Sensitive data in red
  SSN: 'bg-destructive/70 text-destructive-foreground',
  
  // Contact info
  EMAIL: 'bg-chart-1/80 text-foreground', // Blue-ish
  PHONE: 'bg-chart-3/80 text-foreground', // Orange-ish
  
  // Personal Identifiers
  NAME: 'bg-chart-2/70 text-foreground', // Green-ish
  ADDRESS: 'bg-chart-4/70 text-foreground', // Purple-ish
  PASSPORT: 'bg-chart-5/80 text-foreground', // Pink-ish
  
  // Other IDs/Dates
  DOB: 'bg-primary/60 text-primary-foreground', // Theme primary
  AADHAAR: 'bg-accent/80 text-accent-foreground',   // Theme accent
  PAN: 'bg-secondary/90 text-secondary-foreground', // Theme secondary
};

const defaultStyle = 'bg-muted text-muted-foreground';

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
