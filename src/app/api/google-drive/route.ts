
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { GOOGLE_SHEET_ID, DEFAULT_STOCK_SHEET, DEFAULT_ORDERS_SHEET, DEFAULT_STOCK_RANGE, DEFAULT_ORDERS_RANGE } from '@/config/google-drive-config';
import type { AIStockItem, AIOrderItem } from '@/lib/types'; // Assuming these types are defined for AI processing

function parseSheetData(values: any[][], type: 'stock' | 'orders'): AIStockItem[] | AIOrderItem[] {
  if (!values || values.length < 1) { // Can be 1 if only header
    console.warn(`No data rows found for ${type}. Values:`, values);
    return [];
  }

  const header = values[0].map(h => h.toString().trim().toUpperCase());
  const dataRows = values.slice(1);
  const parsedData: any[] = [];

  // Define expected headers for robust mapping
  const stockHeadersExpected = ['PRODUCT', 'SIZE', 'QUANTITY', 'CBM', 'MOTOR BAG'];
  const orderHeadersExpected = ['SR NO', 'DATE', 'SALES PERSON', 'CUSTOMER', 'LOCATION', 'SIZE', 'QNTY', 'CBM', 'NOTES'];

  dataRows.forEach((row, rowIndex) => {
    const item: any = {};
    let hasEssentialData = false;

    header.forEach((colName, index) => {
      if (row[index] !== undefined && row[index] !== null) {
        item[colName] = row[index];
      }
    });

    try {
      if (type === 'stock') {
        const stockItem: Partial<AIStockItem> = {
          PRODUCT: item['PRODUCT']?.toString().trim() || '',
          SIZE: item['SIZE']?.toString().trim(),
          Quantity: parseInt(item['QUANTITY'], 10),
          CBM: parseFloat(item['CBM']),
          'MOTOR BAG': item['MOTOR BAG']?.toString().trim() || 'No',
        };
        if (stockItem.SIZE && !isNaN(stockItem.Quantity) && !isNaN(stockItem.CBM)) {
          parsedData.push(stockItem as AIStockItem);
          hasEssentialData = true;
        } else if (Object.keys(item).length > 0) { // If row has some data but not valid stock
          console.warn(`Skipping invalid stock row ${rowIndex + 2}: Missing essential fields or invalid numbers. Data:`, item);
        }
      } else if (type === 'orders') {
        const orderItem: Partial<AIOrderItem> = {
          'SR NO': parseInt(item['SR NO'], 10),
          DATE: item['DATE']?.toString().trim(), // Date parsing/validation can be added
          'SALES PERSON': item['SALES PERSON']?.toString().trim() || '',
          CUSTOMER: item['CUSTOMER']?.toString().trim(),
          LOCATION: item['LOCATION']?.toString().trim() || '',
          SIZE: item['SIZE']?.toString().trim(),
          QNTY: parseInt(item['QNTY'], 10),
          CBM: parseFloat(item['CBM']),
          notes: item['NOTES']?.toString().trim() || '',
        };
        if (orderItem.CUSTOMER && orderItem.SIZE && !isNaN(orderItem['SR NO']) && !isNaN(orderItem.QNTY)) {
          parsedData.push(orderItem as AIOrderItem);
          hasEssentialData = true;
        } else if (Object.keys(item).length > 0) { // If row has some data but not valid order
            console.warn(`Skipping invalid order row ${rowIndex + 2}: Missing essential fields or invalid numbers. Data:`, item);
        }
      }
      if (!hasEssentialData && Object.keys(item).length > 0){
          // console.log(`Skipping empty or invalid row ${rowIndex + 2} of type ${type}. Data:`, item);
      }
    } catch (e) {
      console.warn(`Error parsing row ${rowIndex + 2} for ${type}:`, e, "Row data:", item);
    }
  });

  console.log(`Successfully parsed ${parsedData.length} ${type} items.`);
  return parsedData;
}


export async function GET() {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI || !process.env.GOOGLE_REFRESH_TOKEN) {
      throw new Error("Google API credentials or refresh token are not configured in .env.local");
    }
    if (GOOGLE_SHEET_ID === 'YOUR_GOOGLE_SHEET_ID_HERE') {
        throw new Error("Please configure your GOOGLE_SHEET_ID in /src/config/google-drive-config.ts");
    }


    const auth = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    });

    auth.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Fetch stock data
    console.log(`Fetching stock data from Sheet ID: ${GOOGLE_SHEET_ID}, Sheet: ${DEFAULT_STOCK_SHEET}, Range: ${DEFAULT_STOCK_RANGE}`);
    const stockResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${DEFAULT_STOCK_SHEET}!${DEFAULT_STOCK_RANGE}`,
    });
    const stockValues = stockResponse.data.values;
    const stockData = stockValues ? parseSheetData(stockValues, 'stock') : [];

    // Fetch orders data
    console.log(`Fetching orders data from Sheet ID: ${GOOGLE_SHEET_ID}, Sheet: ${DEFAULT_ORDERS_SHEET}, Range: ${DEFAULT_ORDERS_RANGE}`);
    const ordersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${DEFAULT_ORDERS_SHEET}!${DEFAULT_ORDERS_RANGE}`,
    });
    const ordersValues = ordersResponse.data.values;
    const ordersData = ordersValues ? parseSheetData(ordersValues, 'orders') : [];

    return NextResponse.json({
      stockData,
      ordersData,
      message: `Successfully fetched ${stockData.length} stock items and ${ordersData.length} order items.`,
    });

  } catch (error) {
    console.error('Error fetching data from Google Sheets:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred while fetching data from Google Sheets.';
    // Attempt to get more specific error from Google API if available
    // @ts-ignore
    const googleError = error.errors?.[0]?.message;
    return NextResponse.json({ error: googleError || message }, { status: 500 });
  }
}
