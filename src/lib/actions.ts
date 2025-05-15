// src/lib/actions.ts
"use server";

import { generateDispatchPlan } from "@/ai/flows/generate-dispatch-plan";
import { chatAgentFlow } from "@/ai/flows/chatAgentFlow";
import type { AIStockItem, AIOrderItem, DispatchPlanResult, ChatMessage } from "./types";
import type { ChatAgentInput, ChatAgentOutput } from "@/ai/flows/chatAgentFlow";

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

interface AttachedFilePayload {
  fileName: string;
  fileContent?: string;
  fileDataUri?: string;
}

interface ChatAgentParams {
  message: string;
  history?: ChatMessage[];
  files?: AttachedFilePayload[]; // Updated to handle multiple files
}

export async function runChatAgentFlow(
  params: ChatAgentParams
): Promise<ChatAgentOutput | { error: string }> {
  try {
    const historyForAI: ChatAgentInput['history'] = params.history?.map(msg => ({
      sender: msg.sender,
      text: msg.text,
      timestamp: msg.timestamp.toISOString(),
    }));

    const inputForAI: ChatAgentInput = {
      message: params.message,
      history: historyForAI,
      files: params.files // Pass the array of files
    };

    const result = await chatAgentFlow(inputForAI);
    return result;
  } catch (error) {
    console.error("Error in chat agent flow:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred with the chat agent.";
    return { error: `Chat agent failed: ${errorMessage}` };
  }
}
