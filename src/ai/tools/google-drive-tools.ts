
/**
 * @fileOverview Tools for interacting with Google Drive (via an internal API endpoint).
 *
 * - fetchDataFromGoogleSheetTool - A tool to fetch stock and order data from a Google Sheet.
 * - FetchDataFromGoogleSheetInput - Input schema for the tool.
 * - FetchDataFromGoogleSheetOutput - Output schema for the tool.
 */

import { z } from 'zod'; // Using Zod from 'zod' directly as this is not a 'use server' file anymore.
import type { AIStockItem, AIOrderItem } from '@/lib/types';

// Define schemas for the tool's input and output.
// These should align with what the API endpoint /api/google-drive expects/returns
// and what the generateDispatchPlan flow requires.

export const FetchDataFromGoogleSheetInputSchema = z.object({
  fileName: z.string().describe("The name of the Google Sheet file. The system will use a pre-configured Sheet ID for now, but this field is for future extension."),
  // Potentially add sheetNameStock, sheetNameOrders if you want the user to specify them via chat.
  // For now, they are taken from config on the server-side.
});
export type FetchDataFromGoogleSheetInput = z.infer<typeof FetchDataFromGoogleSheetInputSchema>;

// Define schemas for the items as they would be structured after parsing from the sheet
const StockItemSchema = z.object({
  PRODUCT: z.string().optional(),
  SIZE: z.string(),
  Quantity: z.number(),
  CBM: z.number(),
  'MOTOR BAG': z.string().optional(),
});

const OrderItemSchema = z.object({
  'SR NO': z.number(),
  DATE: z.string(), // Dates from sheets are often read as strings
  'SALES PERSON': z.string().optional(),
  CUSTOMER: z.string(),
  LOCATION: z.string().optional(),
  SIZE: z.string(),
  QNTY: z.number(),
  CBM: z.number(),
  notes: z.string().optional(),
});

export const FetchDataFromGoogleSheetOutputSchema = z.object({
  stockData: z.array(StockItemSchema).describe("Array of stock items fetched from the Google Sheet."),
  ordersData: z.array(OrderItemSchema).describe("Array of order items fetched from the Google Sheet."),
  message: z.string().describe("A message summarizing the outcome of the fetch operation, e.g., number of items fetched or any issues encountered."),
});
export type FetchDataFromGoogleSheetOutput = z.infer<typeof FetchDataFromGoogleSheetOutputSchema>;


export const fetchDataFromGoogleSheetTool = {
  name: 'fetchDataFromGoogleSheetTool',
  description: 'Fetches current stock and pending order data from the primary Google Sheet. Use this when the user asks to load, refresh, or get the latest data from their inventory spreadsheet.',
  inputSchema: FetchDataFromGoogleSheetInputSchema,
  outputSchema: FetchDataFromGoogleSheetOutputSchema,
  async execute(input: FetchDataFromGoogleSheetInput): Promise<FetchDataFromGoogleSheetOutput> {
    console.log(`Tool 'fetchDataFromGoogleSheetTool' called with input:`, input);
    try {
      // The tool now calls our internal API endpoint
      const response = await fetch('/api/google-drive', { // Assuming Next.js app is running on the same host
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to parse error response from API" }));
        console.error('API call failed:', response.status, errorData);
        return {
          stockData: [],
          ordersData: [],
          message: `Error fetching data from Google Drive: ${errorData.error || response.statusText}`,
        };
      }

      const data = await response.json();
      
      // Ensure the data matches the expected output schema, especially the message
      return {
        stockData: data.stockData || [],
        ordersData: data.ordersData || [],
        message: data.message || `Successfully fetched data. Stock items: ${data.stockData?.length || 0}, Order items: ${data.ordersData?.length || 0}.`,
      };

    } catch (error) {
      console.error('Error executing fetchDataFromGoogleSheetTool:', error);
      const message = error instanceof Error ? error.message : 'An unknown error occurred while trying to fetch data.';
      return {
        stockData: [],
        ordersData: [],
        message: `Failed to execute tool: ${message}`,
      };
    }
  }
};
