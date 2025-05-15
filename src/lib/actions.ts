// src/lib/actions.ts
"use server";

import { generateDispatchPlan } from "@/ai/flows/generate-dispatch-plan";
import type { AIStockItem, AIOrderItem, DispatchPlanResult } from "./types";

interface GeneratePlanParams {
  stockData: AIStockItem[];
  pendingOrdersData: AIOrderItem[];
}

export async function runGenerateDispatchPlan(
  params: GeneratePlanParams
): Promise<DispatchPlanResult | { error: string }> {
  try {
    // Ensure data matches the AI flow's input schema structure.
    // The types AIStockItem and AIOrderItem should align with GenerateDispatchPlanInput.
    const result = await generateDispatchPlan({
      stockData: params.stockData,
      pendingOrdersData: params.pendingOrdersData,
    });
    return result;
  } catch (error) {
    console.error("Error generating dispatch plan:", error);
    return { error: "Failed to generate dispatch plan. Please try again." };
  }
}
