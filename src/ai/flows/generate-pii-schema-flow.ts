'use server';
/**
 * @fileOverview Generates a JSON schema with PII classification for data columns.
 *
 * - generatePiiSchema - A function that generates the PII schema.
 * - GeneratePiiSchemaInput - The input type for the generatePiiSchema function.
 * - GeneratePiiSchemaOutput - The return type for the generatePiiSchema function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePiiSchemaInputSchema = z.object({
  data: z
    .string()
    .describe('The data to analyze, in JSON, CSV, TXT, DOCX, or XLSX format.'),
});
export type GeneratePiiSchemaInput = z.infer<typeof GeneratePiiSchemaInputSchema>;

const GeneratePiiSchemaOutputSchema = z.object({
  schema: z.string().describe('The generated JSON schema with PII classification.'),
});
export type GeneratePiiSchemaOutput = z.infer<typeof GeneratePiiSchemaOutputSchema>;

export async function generatePiiSchema(input: GeneratePiiSchemaInput): Promise<GeneratePiiSchemaOutput> {
  return generatePiiSchemaFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePiiSchemaPrompt',
  input: {schema: GeneratePiiSchemaInputSchema},
  output: {schema: GeneratePiiSchemaOutputSchema},
  prompt: `You are an expert in data analysis and PII detection.

  Given the following data, generate a JSON schema that identifies potential PII fields.
  The schema should include the column name, detected PII type (e.g., PII_EMAIL, PII_NAME, PII_SSN), and a confidence level (high, medium, low).

  Data: {{{data}}}

  Example JSON Schema Output:
  \\\`\\\`\\\`json
  [
    {
      "column": "email_address",
      "detected_type": "PII_EMAIL",
      "confidence": "high"
    },
    {
      "column": "name",
      "detected_type": "PII_NAME",
      "confidence": "medium"
    }
  ]
  \\\`\\\`\\\`

  Ensure the output is a valid JSON format.
  `,config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const generatePiiSchemaFlow = ai.defineFlow(
  {
    name: 'generatePiiSchemaFlow',
    inputSchema: GeneratePiiSchemaInputSchema,
    outputSchema: GeneratePiiSchemaOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
