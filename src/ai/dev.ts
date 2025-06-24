import { config } from 'dotenv';
config();

import '@/ai/flows/detect-pii-flow.ts';
import '@/ai/flows/explain-pii-detection-flow.ts';
import '@/ai/flows/summarize-pii-flow.ts';
import '@/ai/flows/generate-pii-schema-flow.ts';