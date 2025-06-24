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
2.  **Strict Typing:** The \`type\` field in your output for each finding MUST EXACTLY match one of the strings from the list above. Do not invent new types or alter the casing.
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

    // The prompt is now much stricter, but we'll still normalize the type as a final safeguard.
    // We trust the model to only return the requested types, as per the prompt.
    const processedEntities = output.piiEntities
      .map((entity) => ({
        ...entity,
        type: entity.type.toUpperCase().replace('PII_', '').trim(),
      }))
      .filter(
        (entity) =>
          entity.value != null && entity.start >= 0 && entity.end > entity.start
      ); // Basic sanity checks

    return {
      piiEntities: processedEntities,
    };
  }
);
