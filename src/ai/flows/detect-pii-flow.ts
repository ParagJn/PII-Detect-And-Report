'use server';

/**
 * @fileOverview A PII detection AI agent.
 *
 * - detectPii - A function that handles the PII detection process.
 * - DetectPiiInput - The input type for the detectPii function.
 * - DetectPiiOutput - The return type for the detectPii function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetectPiiInputSchema = z.object({
  data: z
    .string()
    .describe("The data to scan for PII.  Can be structured (JSON, CSV) or unstructured (text)."),
  piiTypesToScan: z.array(z.string()).describe('The types of PII to scan for.'),
});
export type DetectPiiInput = z.infer<typeof DetectPiiInputSchema>;

const PiiEntitySchema = z.object({
    type: z.string().describe('The type of PII detected (e.g., EMAIL, NAME, SSN). This must be one of the types from the `piiTypesToScan` input array.'),
    value: z.string().describe('The actual PII value that was detected.'),
    start: z.number().describe('The starting character index of the PII value in the input data.'),
    end: z.number().describe('The ending character index of the PII value in the input data.'),
    confidence: z.string().describe('The confidence level of the PII detection (e.g., high, medium, or low).'),
});

// The output schema is now just an array of PII entities. The client will handle summarization.
const DetectPiiOutputSchema = z.object({
  piiEntities: z.array(PiiEntitySchema).describe('An array of PII entities detected in the input data.'),
});
export type DetectPiiOutput = z.infer<typeof DetectPiiOutputSchema>;

// A mapping to correct common AI model inconsistencies for PII types.
const PII_TYPE_CORRECTIONS: { [key: string]: string } = {
  'EMAILS': 'EMAIL',
  'EMAIL_ADDRESS': 'EMAIL',
  'EMAIL ADDRESS': 'EMAIL',
  'NAMES': 'NAME',
  'PERSON_NAME': 'NAME',
  'PERSON NAME': 'NAME',
  'PHONE_NUMBER': 'PHONE',
  'PHONE NUMBER': 'PHONE',
  'PHONES': 'PHONE',
  'ADDRESSES': 'ADDRESS',
  'ADDRESSS': 'ADDRESS', // Correction for observed error
  'DOBS': 'DOB',
  'DATE_OF_BIRTH': 'DOB',
  'SSNS': 'SSN',
  'SOCIAL_SECURITY_NUMBER': 'SSN',
  'PASSPORTS': 'PASSPORT',
  'AADHAARS': 'AADHAAR',
  'PANS': 'PAN',
};

export async function detectPii(input: DetectPiiInput): Promise<DetectPiiOutput> {
  // If no PII types are selected, return an empty result.
  if (input.piiTypesToScan.length === 0) {
    return {
        piiEntities: [],
    };
  }
  return detectPiiFlow(input);
}

const prompt = ai.definePrompt({
  name: 'detectPiiPrompt',
  input: {schema: DetectPiiInputSchema},
  output: {schema: DetectPiiOutputSchema},
  prompt: `You are an expert system for detecting Personally Identifiable Information (PII).
Your task is to analyze the provided text data and identify any instances of the specific PII types requested.

**CRITICAL INSTRUCTIONS:**
1.  **Scan ONLY for these types:** You MUST ONLY find and report PII of the following types: {{#each piiTypesToScan}}'{{{this}}}'{{#unless @last}}, {{/unless}}{{/each}}.
2.  **Strict Typing:** The \`type\` field in your output for each finding MUST EXACTLY match one of the strings from the list above. Do not invent new types or alter the casing. Use the singular form (e.g., "NAME", not "NAMES").
3.  **Accurate Indexing:** The \`start\` and \`end\` character indices MUST correspond precisely to the location of the \`value\` in the original data. \`data.substring(start, end)\` MUST equal \`value\`. Be very careful with this.
4.  **JSON Output:** Your entire output must be a single, valid JSON object that conforms to the required output schema, with a root key "piiEntities" containing an array of your findings. If you find no PII of the requested types, the "piiEntities" array MUST be empty.

Data to analyze:
\`\`\`
{{{data}}}
\`\`\`
`,
});

const detectPiiFlow = ai.defineFlow(
  {
    name: 'detectPiiFlow',
    inputSchema: DetectPiiInputSchema,
    outputSchema: DetectPiiOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);

    if (!output || !output.piiEntities) {
      return { piiEntities: [] };
    }

    const processedEntities = output.piiEntities
      .map((entity) => {
        let normalizedType = entity.type.toUpperCase().replace('PII_', '').trim();
        // Apply corrections for common model mistakes (e.g., plurals)
        normalizedType = PII_TYPE_CORRECTIONS[normalizedType] || normalizedType;

        // Only include entities that are in the requested scan types
        if (!input.piiTypesToScan.includes(normalizedType)) {
          return null;
        }

        // Final sanity check on the entity
        if (entity.value != null && entity.start >= 0 && entity.end > entity.start) {
            return {
              ...entity,
              type: normalizedType,
            };
        }
        return null;
      })
      .filter((entity): entity is z.infer<typeof PiiEntitySchema> => entity !== null);

    return {
      piiEntities: processedEntities,
    };
  }
);
