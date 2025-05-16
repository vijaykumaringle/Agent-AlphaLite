import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { GOOGLE_SHEET_ID, DEFAULT_STOCK_SHEET, DEFAULT_ORDERS_SHEET, DEFAULT_STOCK_RANGE, DEFAULT_ORDERS_RANGE } from '@/config/google-drive-config';

export async function GET(request: Request) {
  try {
    // Initialize OAuth2 client
    const auth = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    });

    // Set credentials with refresh token
    auth.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    // Initialize Google Sheets API
    const sheets = google.sheets({
      version: 'v4',
      auth,
    });

    // First, get all sheet names to verify they exist
    const sheetsResponse = await sheets.spreadsheets.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      fields: 'sheets.properties.title',
    });
    
    const sheetNames = sheetsResponse.data.sheets?.map(sheet => sheet.properties?.title) || [];
    console.log('Available sheet names:', sheetNames);

    // Check if our sheets exist
    if (!sheetNames.includes(DEFAULT_STOCK_SHEET)) {
      throw new Error(`Sheet '${DEFAULT_STOCK_SHEET}' not found in the spreadsheet`);
    }
    if (!sheetNames.includes(DEFAULT_ORDERS_SHEET)) {
      throw new Error(`Sheet '${DEFAULT_ORDERS_SHEET}' not found in the spreadsheet`);
    }

    // Log the exact request parameters
    console.log('Fetching stock data with parameters:', {
      spreadsheetId: GOOGLE_SHEET_ID,
      sheetName: DEFAULT_STOCK_SHEET,
      range: `${DEFAULT_STOCK_SHEET}!A:Z`
    });

    // Fetch stock data
    console.log(`Fetching data from sheet: ${DEFAULT_STOCK_SHEET}`);
    const stockResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${DEFAULT_STOCK_SHEET}!${DEFAULT_STOCK_RANGE}`,
    });

    // Log the complete response
    console.log('Stock response:', {
      status: stockResponse.status,
      headers: stockResponse.headers,
      data: stockResponse.data
    });

    // Check for errors in the response
    if (!stockResponse.data.values || stockResponse.data.values.length === 0) {
      console.error('Stock data empty:', {
        values: stockResponse.data.values,
        response: stockResponse.data
      });
      throw new Error('No data returned from stock sheet');
    } else {
      console.log('Stock data received:', {
        header: stockResponse.data.values[0],
        firstRow: stockResponse.data.values[1],
        rowCount: stockResponse.data.values.length
      });
    }
    
    // Log the complete stock response for debugging
    console.log('Stock response:', {
      status: stockResponse.status,
      data: stockResponse.data,
      values: stockResponse.data.values,
      valuesLength: stockResponse.data.values?.length
    });

    // Log the exact request parameters
    console.log('Fetching orders data with parameters:', {
      spreadsheetId: GOOGLE_SHEET_ID,
      sheetName: DEFAULT_ORDERS_SHEET,
      range: `${DEFAULT_ORDERS_SHEET}!A:Z`
    });

    // Fetch orders data
    console.log(`Fetching data from sheet: ${DEFAULT_ORDERS_SHEET}`);
    const ordersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${DEFAULT_ORDERS_SHEET}!${DEFAULT_ORDERS_RANGE}`,
    });

    // Log the complete response
    console.log('Orders response:', {
      status: ordersResponse.status,
      headers: ordersResponse.headers,
      data: ordersResponse.data
    });

    // Check for errors in the response
    if (!ordersResponse.data.values || ordersResponse.data.values.length === 0) {
      console.error('Orders data empty:', {
        values: ordersResponse.data.values,
        response: ordersResponse.data
      });
      throw new Error('No data returned from orders sheet');
    } else {
      console.log('Orders data received:', {
        header: ordersResponse.data.values[0],
        firstRow: ordersResponse.data.values[1],
        rowCount: ordersResponse.data.values.length
      });
    }
    
    // Log the complete orders response for debugging
    console.log('Orders response:', {
      status: ordersResponse.status,
      data: ordersResponse.data,
      values: ordersResponse.data.values,
      valuesLength: ordersResponse.data.values?.length
    });

    // Parse stock data
    const stockValues = stockResponse.data.values;
    
    // Add more detailed logging
    if (!stockValues) {
      console.error('No stock values returned from API');
    } else {
      console.log('Stock values:', {
        count: stockValues.length,
        header: stockValues[0],
        firstRow: stockValues[1],
        lastRow: stockValues[stockValues.length - 1]
      });
    }

    const parsedStockData = stockValues && stockValues.length > 1 
      ? parseSheetData(stockValues)
      : [];

    // Log parsed data
    console.log('Parsed stock data:', parsedStockData);

    // Parse orders data
    const ordersValues = ordersResponse.data.values;
    const parsedOrdersData = ordersValues && ordersValues.length > 1 
      ? parseSheetData(ordersValues)
      : [];

    return NextResponse.json({
      stockData: parsedStockData,
      ordersData: parsedOrdersData,
      message: `Successfully fetched data for stock (${parsedStockData.length} items) and orders (${parsedOrdersData.length} items) from '${GOOGLE_SHEET_ID}'`
    });
  } catch (error) {
    console.error('Error fetching data from Google Sheets:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}

// Helper function to parse sheet data
function parseSheetData(values: any[][]) {
  if (!values || values.length < 2) {
    console.warn('Invalid data: values array is empty or has less than 2 rows');
    return [];
  }

  const header = values[0];
  const parsedData = [];

  // Log header for debugging
  console.log('Header row:', header);

  // Check if we have all required columns for stock data
  const requiredStockColumns = ['PRODUCT', 'SIZE', 'Quantity', 'CBM', 'MOTOR BAG'];
  const hasAllStockColumns = requiredStockColumns.every(col => header.includes(col));
  
  // Check if we have all required columns for orders data
  const requiredOrdersColumns = ['SR NO', 'DATE', 'SALES PERSON', 'CUSTOMR NAME', 'LOCATION', 'SIZE', 'QNTY', 'CBM'];
  const hasAllOrdersColumns = requiredOrdersColumns.every(col => header.includes(col));

  // Log which data type we're parsing
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

    // Map header to row values
    header.forEach((col, index) => {
      const value = row[index];
      item[col] = value;
    });

    try {
      // Validate and transform data
      if (hasAllStockColumns) {
        // This is stock data
        parsedData.push({
          PRODUCT: item.PRODUCT?.toString().trim() || '',
          SIZE: item.SIZE?.toString().trim() || '',
          Quantity: Number(item.Quantity) || 0,
          CBM: Number(item.CBM) || 0,
          'MOTOR BAG': item['MOTOR BAG']?.toString().trim() || 'No'
        });
      } else if (hasAllOrdersColumns) {
        // This is orders data
        parsedData.push({
          'SR NO': Number(item['SR NO']) || 0,
          DATE: item.DATE?.toString().trim() || '',
          'SALES PERSON': item['SALES PERSON']?.toString().trim() || '',
          'CUSTOMER NAME': item['CUSTOMR NAME']?.toString().trim() || '',
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

  // Log parsed data count
  console.log(`Parsed ${parsedData.length} items`);
  
  return parsedData;
}
