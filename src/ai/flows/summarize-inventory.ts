// SummarizeInventory.ts
'use server';

/**
 * @fileOverview Summarizes the inventory, including total CBM and sizes with zero stock.
 *
 * - summarizeInventory - A function that summarizes the inventory.
 * - SummarizeInventoryInput - The input type for the summarizeInventory function.
 * - SummarizeInventoryOutput - The return type for the summarizeInventory function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeInventoryInputSchema = z.object({
  stockData: z
    .string()
    .describe('A table showing the available quantity of each AAC block size.'),
});

export type SummarizeInventoryInput = z.infer<typeof SummarizeInventoryInputSchema>;

const SummarizeInventoryOutputSchema = z.object({
  totalCBM: z.number().describe('The total CBM of the current stock.'),
  zeroStockSizes: z
    .array(z.string())
    .describe('A list of sizes with zero stock.'),
});

export type SummarizeInventoryOutput = z.infer<typeof SummarizeInventoryOutputSchema>;

export async function summarizeInventory(input: SummarizeInventoryInput): Promise<SummarizeInventoryOutput> {
  return summarizeInventoryFlow(input);
}

const summarizeInventoryPrompt = ai.definePrompt({
  name: 'summarizeInventoryPrompt',
  input: {schema: SummarizeInventoryInputSchema},
  output: {schema: SummarizeInventoryOutputSchema},
  prompt: `You are an expert inventory analyst.

  Analyze the following stock data and provide a summary including the total CBM and a list of sizes with zero stock.
  Make sure the total CBM is a number.

  Stock Data:
  {{stockData}}`,
});

const summarizeInventoryFlow = ai.defineFlow(
  {
    name: 'summarizeInventoryFlow',
    inputSchema: SummarizeInventoryInputSchema,
    outputSchema: SummarizeInventoryOutputSchema,
  },
  async input => {
    const {output} = await summarizeInventoryPrompt(input);
    return output!;
  }
);
