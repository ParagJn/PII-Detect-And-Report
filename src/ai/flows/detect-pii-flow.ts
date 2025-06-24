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
    start: z.number().describe('The starting index of the PII value in the input data.'),
    end: z.number().describe('The ending index of the PII value in the input data.'),
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
  prompt: `You are an expert in detecting Personally Identifiable Information (PII) in data. Your task is to analyze the provided data and identify specific types of PII.

You MUST ONLY scan for and report on the following PII types: {{#each piiTypesToScan}}'{{{this}}}'{{#unless @last}}, {{/unless}}{{/each}}. Do not detect any other types of PII.

For each PII entity you find that matches the requested types, you must provide:
1.  \`type\`: The type of PII detected. This MUST be one of the exact strings from the list provided above (e.g., 'EMAIL', 'NAME').
2.  \`value\`: The exact PII value detected in the data.
3.  \`start\`: The starting character index of the value in the input data.
4.  \`end\`: The ending character index of the value in the input data.
5.  \`confidence\`: Your confidence level for this detection (high, medium, or low).

The final output MUST be a single JSON object with a 'piiEntities' key, containing an array of the PII entity objects you detected. If no PII is found from the requested list, this array MUST be empty.

Data to analyze:
{{{data}}}

Example Output:
{
  "piiEntities": [
    {
      "type": "EMAIL",
      "value": "test@example.com",
      "start": 10,
      "end": 25,
      "confidence": "high"
    }
  ]
}
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
      return {
        piiEntities: [],
      };
    }
    
    // Perform robust normalization and filtering to ensure consistency and correctness.
    const processedEntities = output.piiEntities
      .map((entity) => {
        // Normalize the type returned by the model to match our expected format.
        const normalizedType = entity.type.toUpperCase().replace('PII_', '').trim();
        return { ...entity, type: normalizedType };
      })
      .filter(
        (entity) =>
          // Only include entities that were requested by the user.
          input.piiTypesToScan.includes(entity.type) && 
          entity.value != null &&
          // Basic sanity check for indices
          entity.start >= 0 &&
          entity.end > entity.start
      );

    return {
      piiEntities: processedEntities,
    };
  }
);
