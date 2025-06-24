'use server';
/**
 * @fileOverview Explains why a certain string was flagged as PII.
 *
 * - explainPiiDetection - A function that takes a string and explains why it might be PII.
 * - ExplainPiiDetectionInput - The input type for the explainPiiDetection function.
 * - ExplainPiiDetectionOutput - The return type for the explainPiiDetection function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExplainPiiDetectionInputSchema = z.object({
  text: z.string().describe('The text to explain why it might be PII.'),
});
export type ExplainPiiDetectionInput = z.infer<typeof ExplainPiiDetectionInputSchema>;

const ExplainPiiDetectionOutputSchema = z.object({
  explanation: z.string().describe('The explanation of why the text might be PII.'),
});
export type ExplainPiiDetectionOutput = z.infer<typeof ExplainPiiDetectionOutputSchema>;

export async function explainPiiDetection(input: ExplainPiiDetectionInput): Promise<ExplainPiiDetectionOutput> {
  return explainPiiDetectionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'explainPiiDetectionPrompt',
  input: {schema: ExplainPiiDetectionInputSchema},
  output: {schema: ExplainPiiDetectionOutputSchema},
  prompt: `You are an expert in data privacy and security. Your task is to explain why a given piece of text might be considered Personally Identifiable Information (PII). Consider various PII types such as name, email, phone number, address, social security number, and other sensitive information.

Text: {{{text}}}

Explanation:`,
});

const explainPiiDetectionFlow = ai.defineFlow(
  {
    name: 'explainPiiDetectionFlow',
    inputSchema: ExplainPiiDetectionInputSchema,
    outputSchema: ExplainPiiDetectionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
