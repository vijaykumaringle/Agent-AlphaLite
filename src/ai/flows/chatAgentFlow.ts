// src/ai/flows/chatAgentFlow.ts
'use server';
/**
 * @fileOverview A conversational agent for StockPilot.
 *
 * - chatAgentFlow - Handles conversational interactions, including optional file attachments.
 * - ChatAgentInput - Input type for the chatAgentFlow.
 * - ChatAgentOutput - Output type for the chatAgentFlow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ChatMessageSchema = z.object({
  id: z.string(),
  sender: z.enum(['user', 'agent']),
  text: z.string(),
  timestamp: z.string().datetime(),
});

const ChatAgentInputSchema = z.object({
  message: z.string().describe('The latest message from the user.'),
  history: z.array(ChatMessageSchema).optional().describe('The conversation history up to this point.'),
  fileName: z.string().optional().describe('The name of the text-based file attached by the user, if any.'),
  fileContent: z.string().optional().describe('The content of the text-based file attached by the user, if any.'),
});
export type ChatAgentInput = z.infer<typeof ChatAgentInputSchema>;

const ChatAgentOutputSchema = z.object({
  reply: z.string().describe('The agent\'s response to the user\'s message.'),
});
export type ChatAgentOutput = z.infer<typeof ChatAgentOutputSchema>;


export async function chatAgentFlow(input: ChatAgentInput): Promise<ChatAgentOutput> {
  const { message, history, fileName, fileContent } = input;

  let promptText = `The user said: "${message}".\n\n`;

  if (history && history.length > 0) {
    promptText += "Conversation History:\n";
    history.forEach(msg => {
      promptText += `${msg.sender === 'user' ? 'User' : 'Agent'}: ${msg.text}\n`;
    });
    promptText += "\n";
  }
  
  if (fileName && fileContent) {
    promptText += `The user also attached a file named "${fileName}". Its content is:\n"""\n${fileContent}\n"""\n\n`;
    promptText += `Take the content of the attached file into account when responding. `;
  }

  promptText += `Based on this, provide a helpful response.
  If the user asks to add stock or an order, acknowledge it and say you'll be able to do that soon.
  If they ask to generate a dispatch plan, tell them to use the "Data Input" tab for now, but you'll assist with that soon.
  For any other query, try to be a helpful assistant for an inventory management app called StockPilot.
  If a file was attached, acknowledge its presence and briefly mention its name or how its content might be used.
  Keep responses concise.`;

  const llmResponse = await ai.generate({
    prompt: promptText,
    // model: 'googleai/gemini-pro', 
    // config: { temperature: 0.7 }
  });
  
  return {
    reply: llmResponse.text ?? "I'm sorry, I couldn't generate a response.",
  };
}
