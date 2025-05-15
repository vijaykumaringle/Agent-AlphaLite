// src/ai/flows/generate-dispatch-plan.ts
'use server';
/**
 * @fileOverview Generates a dispatch plan based on stock and order data.
 *
 * - generateDispatchPlan - A function that generates the dispatch plan.
 * - GenerateDispatchPlanInput - The input type for the generateDispatchPlan function.
 * - GenerateDispatchPlanOutput - The return type for the generateDispatchPlan function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const StockItemSchema = z.object({
  PRODUCT: z.string().optional(),
  SIZE: z.string(),
  Quantity: z.number(),
  CBM: z.number(),
  'MOTOR BAG': z.string().optional(),
});

const OrderItemSchema = z.object({
  'SR NO': z.number(),
  DATE: z.string(),
  'SALES PERSON': z.string().optional(),
  CUSTOMER: z.string(),
  LOCATION: z.string().optional(),
  SIZE: z.string(),
  QNTY: z.number(),
  CBM: z.number(),
  notes: z.string().optional(),
});

const GenerateDispatchPlanInputSchema = z.object({
  stockData: z.array(StockItemSchema).describe('A table showing the available quantity of each AAC block size.'),
  pendingOrdersData: z.array(OrderItemSchema).describe('A table listing customer orders that need to be fulfilled.'),
});
export type GenerateDispatchPlanInput = z.infer<typeof GenerateDispatchPlanInputSchema>;

const DispatchPlanItemSchema = z.object({
  'SR NO': z.number(),
  Date: z.string(),
  Customer: z.string(),
  Size: z.string(),
  'Ordered Quantity': z.number(),
  'Stock Before Allocation': z.number(),
  'Dispatched Quantity': z.number(),
  'Remaining Stock': z.number(),
  'Order Status': z.string(),
  Notes: z.string(),
});

const UpdatedStockItemSchema = z.object({
  SIZE: z.string(),
  'Remaining Quantity': z.number(),
});

const GenerateDispatchPlanOutputSchema = z.object({
  summary: z.string().describe('A summary of the total current stock CBM.'),
  dispatchPlan: z.array(DispatchPlanItemSchema).describe('A table showing the dispatch plan.'),
  updatedStockSummary: z.array(UpdatedStockItemSchema).describe('A table showing the remaining quantity for each size after executing the dispatch plan.'),
  zeroStockSizes: z.array(z.string()).describe('Sizes with 0 stock.'),
  pendingOrders: z.array(z.object({
    'SR NO': z.number(),
    Customer: z.string(),
    Size: z.string(),
    'Pending Quantity': z.number(),
    Reason: z.string(),
  })).describe('Pending orders with reasons.'),
  recommendedActions: z.string().describe('Recommended actions (production/procurement, follow-up, customer communication).'),
});
export type GenerateDispatchPlanOutput = z.infer<typeof GenerateDispatchPlanOutputSchema>;

export async function generateDispatchPlan(input: GenerateDispatchPlanInput): Promise<GenerateDispatchPlanOutput> {
  return generateDispatchPlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDispatchPlanPrompt',
  input: {schema: GenerateDispatchPlanInputSchema},
  output: {schema: GenerateDispatchPlanOutputSchema},
  prompt: `You are an Inventory and Order Management Agent named \"Agent AlphaLite\" specializing in AAC block stock and sales order fulfillment. Your goal is to provide clear, data-driven analysis and actionable plans based on the information I provide.

  You will receive data from Excel files, formatted as tables.

  Here is the current stock data:
  {{#each stockData}}
    PRODUCT: {{PRODUCT}}, SIZE: {{SIZE}}, Quantity: {{Quantity}}, CBM: {{CBM}}, MOTOR BAG: {{MOTOR BAG}}
  {{/each}}

  Here are the pending orders:
  {{#each pendingOrdersData}}
    SR NO: {{SR NO}}, DATE: {{DATE}}, SALES PERSON: {{SALES PERSON}}, CUSTOMER: {{CUSTOMER}}, LOCATION: {{LOCATION}}, SIZE: {{SIZE}}, QNTY: {{QNTY}}, CBM: {{CBM}}, notes: {{notes}}
  {{/each}}

  Process and understand the structure and content of both the Stock and Pending Orders data tables.
  Analyze the current stock levels for all listed SIZEs. Identify and report sizes with zero (0) quantity. Identify and report sizes with low stock relative to pending orders (if possible, or just list stock levels).
  Prioritize the Pending Orders strictly based on the DATE column (earliest date first). For orders with the same date, prioritize by the SR NO (lowest SR NO first).
  Create a prioritized dispatch plan by allocating available stock (Quantity from Stock) to the prioritized orders (QNTY from Pending Orders).
  Match stock to orders based on the SIZE. Allocate stock chronologically according to the prioritization.
  Track the remaining stock for each size after each allocation.
  If an order's QNTY for a specific SIZE is greater than the available stock for that SIZE, allocate the remaining stock quantity, mark the order as partially fulfilled, and note the remaining pending quantity for that size.
  If stock for a SIZE is zero, mark the entire order line for that size as pending. Identify and flag any SIZE listed in the Pending Orders that does not appear in the Stock data.

  Based on the analysis and dispatch plan, provide recommendations for necessary actions:
  Clearly list all pending order items (size, quantity, customer, SR NO, date) that could not be fulfilled from current stock. Specifically highlight the reasons for pending status (e.g., \"Stock 0 for this size,\" \"Stock ran out after fulfilling earlier orders,\" \"Unknown size/item\").
  Suggest which sizes require urgent production or procurement to fulfill the pending orders. Suggest following up on pending orders for unknown items/sizes. Recommend informing customers about the status of their pending orders.

  Start with a summary of the total current stock CBM.
  Present the Dispatch Plan in a clear table format, showing: SR NO, Date, Customer, Size, Ordered Quantity, Stock Before Allocation, Dispatched Quantity, Remaining Stock (of that size), Order Status (Fulfilled, Partially Fulfilled, Pending), and Notes (explaining pending status or partial fulfillment).
  Provide an Updated Stock Summary table showing the remaining quantity for each size after executing this dispatch plan.
  Use clear bullet points or a separate summary section for: Sizes with 0 stock. Pending orders (listing SR NO, Customer, Size, Pending Quantity, Reason).
  Recommended actions (production/procurement, follow-up, customer communication).

  Make sure you follow the output schema when providing the final response.
  `,
});

const generateDispatchPlanFlow = ai.defineFlow(
  {
    name: 'generateDispatchPlanFlow',
    inputSchema: GenerateDispatchPlanInputSchema,
    outputSchema: GenerateDispatchPlanOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
