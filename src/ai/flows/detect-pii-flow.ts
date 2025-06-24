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
});
export type DetectPiiInput = z.infer<typeof DetectPiiInputSchema>;

const DetectPiiOutputSchema = z.object({
  piiEntities: z.array(
    z.object({
      type: z.string().describe('The type of PII detected (e.g., EMAIL, NAME, SSN).'),
      value: z.string().describe('The actual PII value that was detected.'),
      start: z.number().describe('The starting index of the PII value in the input data.'),
      end: z.number().describe('The ending index of the PII value in the input data.'),
      confidence: z.string().describe('The confidence level of the PII detection (e.g., high, medium, low).'),
    })
  ).describe('An array of PII entities detected in the input data.'),
  summary: z.string().describe('A summary of the PII detected, including the number of each type of PII entity.'),
});
export type DetectPiiOutput = z.infer<typeof DetectPiiOutputSchema>;

export async function detectPii(input: DetectPiiInput): Promise<DetectPiiOutput> {
  return detectPiiFlow(input);
}

const prompt = ai.definePrompt({
  name: 'detectPiiPrompt',
  input: {schema: DetectPiiInputSchema},
  output: {schema: DetectPiiOutputSchema},
  prompt: `You are an expert in detecting Personally Identifiable Information (PII) in data.

You will be provided with a data string, and your task is to identify all PII entities within the data.
PII includes, but is not limited to: names, phone numbers, email addresses, physical addresses, Social Security numbers (SSNs), Aadhaar numbers, PAN numbers, passport numbers, and dates of birth.

For each PII entity detected, provide the type of PII, the value, the starting and ending indices within the data string, and a confidence level (high, medium, or low).

Also, provide a summary of the PII detected, including the number of each type of PII entity.

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
  "summary": "1 EMAIL, 1 NAME"
}

Return a JSON object with the piiEntities array and the summary string."`,
});

const detectPiiFlow = ai.defineFlow(
  {
    name: 'detectPiiFlow',
    inputSchema: DetectPiiInputSchema,
    outputSchema: DetectPiiOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
