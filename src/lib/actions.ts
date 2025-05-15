// src/lib/actions.ts
"use server";

import { generateDispatchPlan } from "@/ai/flows/generate-dispatch-plan";
import { chatAgentFlow } from "@/ai/flows/chatAgentFlow"; // Added
import type { AIStockItem, AIOrderItem, DispatchPlanResult, ChatMessage } from "./types"; // Added ChatMessage
import type { ChatAgentInput, ChatAgentOutput } from "@/ai/flows/chatAgentFlow"; // Added

interface GeneratePlanParams {
  stockData: AIStockItem[];
  pendingOrdersData: AIOrderItem[];
}

export async function runGenerateDispatchPlan(
  params: GeneratePlanParams
): Promise<DispatchPlanResult | { error: string }> {
  try {
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

// Added for Chat Agent
interface ChatAgentParams {
  message: string;
  history?: ChatMessage[]; // Assuming ChatMessage type is defined in ./types
}

export async function runChatAgentFlow(
  params: ChatAgentParams
): Promise<ChatAgentOutput | { error: string }> {
  try {
    // Transform ChatMessage timestamps to string if necessary for the AI flow
    const historyForAI: ChatAgentInput['history'] = params.history?.map(msg => ({
      ...msg,
      timestamp: msg.timestamp.toISOString(),
    }));

    const result = await chatAgentFlow({
      message: params.message,
      history: historyForAI,
    });
    return result;
  } catch (error) {
    console.error("Error in chat agent flow:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred with the chat agent.";
    return { error: `Chat agent failed: ${errorMessage}` };
  }
}
