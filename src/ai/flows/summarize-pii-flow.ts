'use server';

/**
 * @fileOverview Summarizes the types and quantities of PII detected in data.
 *
 * - summarizePii - A function that handles the PII summarization process.
 * - SummarizePiiInput - The input type for the summarizePii function.
 * - SummarizePiiOutput - The return type for the summarizePii function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizePiiInputSchema = z.array(
  z.object({
    column: z.string().describe('The name of the column containing PII.'),
    detected_type: z.string().describe('The type of PII detected in the column.'),
    confidence: z.string().describe('The confidence level of the PII detection.'),
  })
).describe('An array of PII detections, each containing the column name, detected type, and confidence level.');

export type SummarizePiiInput = z.infer<typeof SummarizePiiInputSchema>;

const SummarizePiiOutputSchema = z.string().describe('A summary of the types and quantities of PII detected in the data.');

export type SummarizePiiOutput = z.infer<typeof SummarizePiiOutputSchema>;

export async function summarizePii(input: SummarizePiiInput): Promise<SummarizePiiOutput> {
  return summarizePiiFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizePiiPrompt',
  input: {schema: SummarizePiiInputSchema},
  output: {schema: SummarizePiiOutputSchema},
  prompt: `You are an expert data privacy consultant. You will receive a list of PII detections, each containing the column name, detected type, and confidence level. Your task is to generate a concise summary of the types and quantities of PII detected in the data.

  For example, if you receive the following input:
  [
    { "column": "email_address", "detected_type": "PII_EMAIL", "confidence": "high" },
    { "column": "email_address", "detected_type": "PII_EMAIL", "confidence": "high" },
    { "column": "name", "detected_type": "PII_NAME", "confidence": "medium" },
    { "column": "ssn", "detected_type": "PII_SSN", "confidence": "high" }
  ]

  Your summary should look like this:
  "Detected 2 email addresses, 1 name, and 1 SSN."

  Here is the input:
  {{#each this}}
    - Column: {{column}}, Type: {{detected_type}}, Confidence: {{confidence}}\n
  {{/each}}
  \nGenerate a summary of the PII types and quantities:
`,
});

const summarizePiiFlow = ai.defineFlow(
  {
    name: 'summarizePiiFlow',
    inputSchema: SummarizePiiInputSchema,
    outputSchema: SummarizePiiOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
