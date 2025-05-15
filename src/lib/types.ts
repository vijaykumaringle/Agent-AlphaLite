import type { z } from 'zod';
import type { GenerateDispatchPlanInput, GenerateDispatchPlanOutput, summarizeInventory } from '@/ai/flows/generate-dispatch-plan';
import type { SummarizeInventoryOutput as AISummarizeInventoryOutput } from '@/ai/flows/summarize-inventory';


// Re-exporting AI schema types for convenience if needed directly
export type { GenerateDispatchPlanInput, GenerateDispatchPlanOutput };

// Frontend specific types, possibly derived or identical to AI schemas
// Using 'PARTIAL_' prefix for form inputs if not all fields are required initially or have different validation logic frontend-side

export const StockItemFormSchema = z.object({
  id: z.string().optional(), // For client-side list management
  PRODUCT: z.string().optional(),
  SIZE: z.string().min(1, "Size is required"),
  Quantity: z.coerce.number().min(0, "Quantity must be non-negative"),
  CBM: z.coerce.number().min(0, "CBM must be non-negative"),
  'MOTOR BAG': z.string().optional(),
});
export type StockItem = z.infer<typeof StockItemFormSchema>;

export const OrderItemFormSchema = z.object({
  id: z.string().optional(), // For client-side list management
  'SR NO': z.coerce.number().min(1, "SR NO is required"),
  DATE: z.date({ required_error: "Date is required" }),
  'SALES PERSON': z.string().optional(),
  CUSTOMER: z.string().min(1, "Customer name is required"),
  LOCATION: z.string().optional(),
  SIZE: z.string().min(1, "Size is required"),
  QNTY: z.coerce.number().min(1, "Quantity must be at least 1"),
  CBM: z.coerce.number().min(0, "CBM must be non-negative"),
  notes: z.string().optional(),
});
export type OrderItem = z.infer<typeof OrderItemFormSchema>;


// This mirrors the AI output structure for type safety on the client
export type DispatchPlanResult = GenerateDispatchPlanOutput;

// Type for stock items as expected by the AI flow (ensure keys match)
export interface AIStockItem {
  PRODUCT?: string;
  SIZE: string;
  Quantity: number;
  CBM: number;
  'MOTOR BAG'?: string;
}

// Type for order items as expected by the AI flow (ensure keys match)
export interface AIOrderItem {
  'SR NO': number;
  DATE: string; // AI expects date as string
  'SALES PERSON'?: string;
  CUSTOMER: string;
  LOCATION?: string;
  SIZE: string;
  QNTY: number;
  CBM: number;
  notes?: string;
}

export type SummarizeInventoryOutput = AISummarizeInventoryOutput;

