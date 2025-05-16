
/**
 * @fileOverview Tools for interacting with Google Drive.
 *
 * - fetchDataFromGoogleSheetTool - A conceptual tool to fetch stock and order data from a Google Sheet.
 * - FetchDataFromGoogleSheetInput - Input schema for the tool.
 * - FetchDataFromGoogleSheetOutput - Output schema for the tool.
 */

import {ai} from '@/ai/genkit';
import { z } from 'zod';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { GOOGLE_SHEET_ID, DEFAULT_STOCK_SHEET, DEFAULT_ORDERS_SHEET } from '@/config/google-drive-config';

// Define schemas similar to generateDispatchPlan for consistency
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

const FetchDataFromGoogleSheetInputSchema = z.object({
  fileName: z.string(),
  sheetNameStock: z.string().optional(),
  sheetNameOrders: z.string().optional(),
});

const FetchDataFromGoogleSheetOutputSchema = z.object({
  stockData: z.array(StockItemSchema),
  ordersData: z.array(OrderItemSchema),
  message: z.string(),
});

// Define types from schemas
type FetchDataFromGoogleSheetInput = z.infer<typeof FetchDataFromGoogleSheetInputSchema>;
type FetchDataFromGoogleSheetOutput = z.infer<typeof FetchDataFromGoogleSheetOutputSchema>;

export const fetchDataFromGoogleSheetTool = {
  name: 'fetchDataFromGoogleSheetTool',
  description: 'Fetches stock and order data from a configured Google Sheet via API',
  input: { schema: FetchDataFromGoogleSheetInputSchema },
  output: { schema: FetchDataFromGoogleSheetOutputSchema },
  execute: async (input: z.infer<typeof FetchDataFromGoogleSheetInputSchema>): Promise<z.infer<typeof FetchDataFromGoogleSheetOutputSchema>> => {
    try {
      const response = await fetch('/api/google-drive', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to fetch data from Google Drive: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching data from Google Drive:', error);
      throw new Error('Failed to fetch data from Google Drive');
    }
  }
};


// Helper function to parse sheet data
function parseSheetData(values: any[][], schema: z.ZodObject<any>): any[] {
  if (!values || values.length < 2) {
    console.warn('Invalid data: values array is empty or has less than 2 rows');
    return [];
  }

  const header = values[0];
  const parsedData = [];

  console.log('Header row:', header);

  const requiredStockColumns = ['PRODUCT', 'SIZE', 'Quantity', 'CBM', 'MOTOR BAG'];
  const hasAllStockColumns = requiredStockColumns.every(col => header.includes(col));
  
  const requiredOrdersColumns = ['SR NO', 'DATE', 'SALES PERSON', 'CUSTOMER', 'LOCATION', 'SIZE', 'QNTY', 'CBM'];
  const hasAllOrdersColumns = requiredOrdersColumns.every(col => header.includes(col));

  if (hasAllStockColumns) {
    console.log('Parsing stock data with columns:', requiredStockColumns);
  } else if (hasAllOrdersColumns) {
    console.log('Parsing orders data with columns:', requiredOrdersColumns);
  } else {
    console.error('Header does not match either stock or orders format:', header);
    return [];
  }

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const item: any = {};

    header.forEach((col, index) => {
      const value = row[index];
      item[col] = value;
    });

    try {
      if (hasAllStockColumns) {
        parsedData.push({
          PRODUCT: item.PRODUCT?.toString().trim() || '',
          SIZE: item.SIZE?.toString().trim() || '',
          Quantity: Number(item.Quantity) || 0,
          CBM: Number(item.CBM) || 0,
          'MOTOR BAG': item['MOTOR BAG']?.toString().trim() || 'No'
        });
      } else if (hasAllOrdersColumns) {
        parsedData.push({
          'SR NO': Number(item['SR NO']) || 0,
          DATE: item.DATE?.toString().trim() || '',
          'SALES PERSON': item['SALES PERSON']?.toString().trim() || '',
          CUSTOMER: item.CUSTOMER?.toString().trim() || '',
          LOCATION: item.LOCATION?.toString().trim() || '',
          SIZE: item.SIZE?.toString().trim() || '',
          QNTY: Number(item.QNTY) || 0,
          CBM: Number(item.CBM) || 0
        });
      }
    } catch (e) {
      console.warn(`Skipping row ${i + 1}: ${e instanceof Error ? e.message : 'Invalid data'}`);
      console.log('Row data:', row);
    }
  }

  console.log(`Parsed ${parsedData.length} items`);
  
  return parsedData;
}
