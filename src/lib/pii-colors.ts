import { cn } from "./utils";

const piiTypeToStyleMap: Record<string, string> = {
  EMAIL: 'bg-chart-1 text-blue-900',
  NAME: 'bg-chart-2 text-green-900',
  SSN: 'bg-destructive text-destructive-foreground',
  PHONE: 'bg-chart-3 text-yellow-900',
  ADDRESS: 'bg-chart-4 text-purple-900',
  PASSPORT: 'bg-chart-5 text-pink-900',
  DOB: 'bg-chart-3 text-orange-900',
  'AADHAAR': 'bg-chart-2 text-lime-900',
  'PAN': 'bg-chart-1 text-cyan-900',
};

const defaultStyle = 'bg-accent text-accent-foreground';

export const getPiiStyle = (type: string): string => {
  const upperType = type.toUpperCase();
  const foundKey = Object.keys(piiTypeToStyleMap).find(key => upperType.includes(key));
  return cn("px-1.5 py-0.5 rounded-md", foundKey ? piiTypeToStyleMap[foundKey] : defaultStyle);
};

export const getPiiBadgeStyle = (type: string): string => {
  const upperType = type.toUpperCase();
  const foundKey = Object.keys(piiTypeToStyleMap).find(key => upperType.includes(key));
  return cn("border-transparent", foundKey ? piiTypeToStyleMap[foundKey] : defaultStyle);
}
