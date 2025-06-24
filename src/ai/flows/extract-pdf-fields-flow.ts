'use server';
/**
 * @fileOverview Extracts structured data from a PDF document.
 *
 * - extractPdfFields - A function that takes a PDF and returns structured JSON data.
 * - ExtractPdfFieldsInput - The input type for the extractPdfFields function.
 * - ExtractPdfFieldsOutput - The return type for the extractPdfFields function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const ExtractPdfFieldsInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "A PDF file encoded as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:application/pdf;base64,<encoded_data>'."
    ),
});
export type ExtractPdfFieldsInput = z.infer<typeof ExtractPdfFieldsInputSchema>;

const ExtractPdfFieldsOutputSchema = z.object({
  jsonData: z.string().describe('The structured data extracted from the PDF, formatted as a JSON string.'),
});
export type ExtractPdfFieldsOutput = z.infer<typeof ExtractPdfFieldsOutputSchema>;

export async function extractPdfFields(input: ExtractPdfFieldsInput): Promise<ExtractPdfFieldsOutput> {
  return extractPdfFieldsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractPdfFieldsPrompt',
  input: {schema: ExtractPdfFieldsInputSchema},
  output: {schema: ExtractPdfFieldsOutputSchema},
  // Use a model that can handle PDF documents
  model: googleAI.model('gemini-1.5-flash-latest'),
  prompt: `You are an expert data extraction tool. Analyze the provided PDF document. Identify all meaningful fields, labels, and their corresponding values. Structure this extracted information into a single, clean JSON object.

If the document contains tables, represent each table as an array of JSON objects, where each object is a row.

If the document is unstructured text (like a letter or article), extract the main text content and place it in a single "content" field in the JSON.

Return ONLY the JSON string in the \`jsonData\` field.

The PDF is provided here: {{media url=pdfDataUri}}`,
});

const extractPdfFieldsFlow = ai.defineFlow(
  {
    name: 'extractPdfFieldsFlow',
    inputSchema: ExtractPdfFieldsInputSchema,
    outputSchema: ExtractPdfFieldsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
