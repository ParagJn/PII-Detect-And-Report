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

const DetectPiiOutputSchema = z.object({
  piiEntities: z.array(PiiEntitySchema).describe('An array of PII entities detected in the input data.'),
  summary: z.string().describe('A summary of the PII detected, including the number of each type of PII entity.'),
});
export type DetectPiiOutput = z.infer<typeof DetectPiiOutputSchema>;

export async function detectPii(input: DetectPiiInput): Promise<DetectPiiOutput> {
  // If no PII types are selected, return an empty result.
  if (input.piiTypesToScan.length === 0) {
    return {
        piiEntities: [],
        summary: "No PII types were selected for scanning."
    };
  }
  return detectPiiFlow(input);
}

const prompt = ai.definePrompt({
  name: 'detectPiiPrompt',
  input: {schema: DetectPiiInputSchema},
  output: {schema: DetectPiiOutputSchema},
  prompt: `You are an expert in detecting Personally Identifiable Information (PII) in data.

You will be provided with a data string, and your task is to identify all PII entities within the data for the following types: {{#each piiTypesToScan}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}.

For each PII entity detected, provide the type of PII, the value, the starting and ending indices within the data string, and a confidence level (high, medium, or low). The 'type' must be one of the provided types to scan for.

Also, provide a summary of the PII detected, including the number of each type of PII entity. If no PII is found, return an empty piiEntities array and a summary stating that no PII was found.

Data: {{{data}}}

Example Output:
{
  "piiEntities": [
    {
      "type": "EMAIL",
      "value": "test@example.com",
      "start": 10,
      "end": 25,
      "confidence": "high"
    },
    {
      "type": "NAME",
      "value": "John Doe",
      "start": 0,
      "end": 8,
      "confidence": "medium"
    }
  ],
  "summary": "Detected 1 EMAIL and 1 NAME."
}

Return a JSON object with the piiEntities array and the summary string."`,
});

const detectPiiFlow = ai.defineFlow(
  {
    name: 'detectPiiFlow',
    inputSchema: DetectPiiInputSchema,
    outputSchema: DetectPiiOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      return {
        piiEntities: [],
        summary: 'No PII was detected in the provided data.',
      };
    }
    // The model can be inconsistent and return 'PII_EMAIL' instead of 'EMAIL'.
    // We normalize the type before filtering to ensure all entities are processed correctly.
    const processedEntities = output.piiEntities
      .map((entity) => {
        const normalizedType = entity.type.startsWith('PII_')
          ? entity.type.substring(4)
          : entity.type;
        return { ...entity, type: normalizedType };
      })
      .filter(
        (entity) =>
          input.piiTypesToScan.includes(entity.type) && entity.value != null
      );

    return {
      ...output,
      piiEntities: processedEntities,
    };
  }
);
