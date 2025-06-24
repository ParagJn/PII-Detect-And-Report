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
  prompt: `You are a highly precise PII (Personally Identifiable Information) detection engine. Your single most important task is to analyze the provided text and return a JSON object containing every instance of the requested PII types.

**Accuracy is paramount. You must follow these instructions exactly:**

1.  **Targeted Scan:** Scan the data *only* for these PII types: {{#each piiTypesToScan}}'{{{this}}}'{{#unless @last}}, {{/unless}}{{/each}}. Ignore all other potential PII.
2.  **Exact Typing:** For each entity found, the \`type\` field in your JSON output MUST be an exact, case-sensitive match to one of the types from the list above. Do not use plurals or variations.
3.  **PERFECT INDEXING (CRITICAL):** The \`start\` and \`end\` character indices are the most critical part of your output. They MUST be perfectly accurate.
    *   \`data.substring(start, end)\` MUST equal the PII \`value\`.
    *   Pay extremely close attention to spaces, commas, newlines (\`\\n\`), and all other characters. An off-by-one error is a failure.
    *   Verify your indices before outputting them.
4.  **Complete Analysis:** You MUST analyze the entire text provided, from the first character to the last. Do not stop early.
5.  **JSON Format:** The output MUST be a single, valid JSON object matching the required schema. If no PII is found, return an object with an empty \`piiEntities\` array.
6.  **JSON Data Handling:** If the input data is in JSON format, be extra careful. The \`start\` and \`end\` indices must correspond to the position within the raw JSON string, including all quotes, spaces, and newlines. The \`value\` should be the raw string value, *without* the surrounding quotes.

**Example (CSV Input):**
*Input Data:*
\`name,email\\nAlice,alice@web.com\`

*Correct JSON Output:*
\`\`\`json
{
  "piiEntities": [
    {
      "type": "NAME",
      "value": "Alice",
      "start": 12,
      "end": 17,
      "confidence": "high"
    },
    {
      "type": "EMAIL",
      "value": "alice@web.com",
      "start": 18,
      "end": 31,
      "confidence": "high"
    }
  ]
}
\`\`\`

**Example (JSON Input):**
*Input Data:*
\`{\\n  "name": "Bob Smith",\\n  "contact": "bob@test.com"\\n}\`

*Correct JSON Output:*
\`\`\`json
{
  "piiEntities": [
    {
      "type": "NAME",
      "value": "Bob Smith",
      "start": 12,
      "end": 21,
      "confidence": "high"
    },
    {
      "type": "EMAIL",
      "value": "bob@test.com",
      "start": 37,
      "end": 49,
      "confidence": "high"
    }
  ]
}
\`\`\`

**Now, analyze the following data and provide the JSON output:**
\`\`\`text
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
        // Basic sanity check for presence of required fields.
        if (!entity.value || entity.start == null || entity.end == null || entity.end <= entity.start) {
            return null;
        }

        let normalizedType = entity.type.toUpperCase().replace('PII_', '').trim();
        // Apply corrections for common model mistakes (e.g., plurals)
        normalizedType = PII_TYPE_CORRECTIONS[normalizedType] || normalizedType;

        // Only include entities that are in the requested scan types
        if (!input.piiTypesToScan.includes(normalizedType)) {
          return null;
        }

        // A final validation to ensure the returned indices are plausible for the value.
        // This prevents crashes from completely incorrect indices.
        if (input.data.substring(entity.start, entity.end) !== entity.value) {
            // The model can be off by a few characters (quotes, spaces) with JSON.
            // A more advanced fix would be to search for entity.value near entity.start,
            // but for now, we will trust the model's value and indices if they are close.
            // A simple check is to see if the value is contained within a slightly larger substring.
            const substringWithPadding = input.data.substring(Math.max(0, entity.start - 2), Math.min(input.data.length, entity.end + 2));
            if (!substringWithPadding.includes(entity.value)) {
                console.warn('AI returned mismatched index for PII entity. Discarding.', {
                    expected: entity.value,
                    found: input.data.substring(entity.start, entity.end),
                    entity,
                });
                return null;
            }
        }
        
        return {
          ...entity,
          type: normalizedType,
        };
      })
      .filter((entity): entity is z.infer<typeof PiiEntitySchema> => entity !== null);

    return {
      piiEntities: processedEntities,
    };
  }
);
