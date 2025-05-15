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
import {z} from 'genkit'; // Using genkit's z (which is re-exported Zod)

const ChatMessageSchema = z.object({
  // id: z.string(), // Not strictly needed by the AI for history context
  sender: z.enum(['user', 'agent']),
  text: z.string(),
  timestamp: z.string().datetime().describe("Timestamp of the message in ISO format"),
});

const ChatAgentInputSchema = z.object({
  message: z.string().describe('The latest message from the user.'),
  history: z.array(ChatMessageSchema).optional().describe('The conversation history up to this point.'),
  fileName: z.string().optional().describe('The name of the file attached by the user, if any.'),
  fileContent: z.string().optional().describe('The text content of the attached file (for text, csv, md, or simple text from Excel).'),
  fileDataUri: z.string().optional().describe("The Data URI of the attached image file (for png, jpeg). Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type ChatAgentInput = z.infer<typeof ChatAgentInputSchema>;

const ChatAgentOutputSchema = z.object({
  reply: z.string().describe("The agent's response to the user's message."),
});
export type ChatAgentOutput = z.infer<typeof ChatAgentOutputSchema>;


// Exported function that client calls through server action
export async function chatAgentFlow(input: ChatAgentInput): Promise<ChatAgentOutput> {
  return internalChatAgentFlow(input);
}

const chatAgentPrompt = ai.definePrompt({
  name: 'chatAgentPrompt',
  input: {schema: ChatAgentInputSchema},
  output: {schema: ChatAgentOutputSchema},
  prompt: `You are a helpful assistant for StockPilot, an inventory management application.
The user said: "{{message}}".

{{#if history}}
Conversation History (most recent last):
{{#each history}}
{{#if (eq sender "user")}}User{{else}}Agent{{/if}}: {{text}}
{{/each}}

{{/if}}
{{#if fileName}}
The user also attached a file named "{{fileName}}".
{{#if fileDataUri}}
This file is an image. Acknowledge that an image was attached. You cannot display or directly analyze the image content yet.
{{else if fileContent}}
  {{#if (contains fileName ".xls")}}
This file appears to be an Excel file. Acknowledge it by name. Inform the user that you cannot process its content directly in this chat. They can use the "Data Input" tab for managing stock and order data, which can often originate from Excel files.
  {{else if (contains fileName ".xlsx")}}
This file appears to be an Excel file. Acknowledge it by name. Inform the user that you cannot process its content directly in this chat. They can use the "Data Input" tab for managing stock and order data, which can often originate from Excel files.
  {{else}}
Its content is provided below. Consider this text content in your response:
"""
{{{fileContent}}}
"""
  {{/if}}
{{/if}}
{{/if}}

Based on all the above, provide a helpful and concise response.
If the user asks to add stock or an order, acknowledge it and say you'll be able to do that soon.
If they ask to generate a dispatch plan, tell them to use the "Data Input" tab for now, but you'll assist with that soon.
For any other query, try to be a helpful assistant for an inventory management app called StockPilot.
Keep responses concise.`,
  // Custom Handlebars helpers like 'contains' are not standard in Genkit's basic prompt.
  // The LLM will need to infer based on the full prompt instructions.
  // Re-adjusting prompt to guide LLM without custom helpers.
  // The prompt needs to be re-written to be more explicit about checking filename extensions.
  // Let's try a more direct approach:
  // The prompt below will be simplified and rely on the LLM's ability to understand context.
  // Genkit's default Handlebars might not support complex helpers like 'contains'.
  // A simpler approach for the prompt without custom helpers:
  // Updated prompt:
  prompt: `You are a helpful assistant for StockPilot, an inventory management application.
The user's latest message is: "{{message}}".

{{#if history}}
Conversation History (most recent last):
{{#each history}}
{{#if (eq sender "user")}}User{{else}}Agent{{/if}}: {{text}}
{{/each}}
{{/if}}

{{#if fileName}}
The user attached a file: "{{fileName}}".
  {{#if fileDataUri}}
This file is an image. Acknowledge that an image was attached. You cannot display or directly analyze the image content in this chat yet.
  {{else if fileContent}}
    Consider the following instructions for "{{fileName}}":
    If "{{fileName}}" ends with '.xls' or '.xlsx', it is an Excel file. Acknowledge it by name. Inform the user that you cannot process its content directly in this chat. Suggest they use the "Data Input" tab for structured data that might come from Excel.
    Otherwise (if it's not an Excel file like .txt, .csv, .md), its text content is:
    """
    {{{fileContent}}}
    """
    Take this text content into account.
  {{/if}}
{{/if}}

Based on the message, history, and any attached file information, provide a helpful and concise response.
Key tasks for StockPilot:
- If the user asks to add stock or an order: Acknowledge it and inform them this feature will be available soon via chat.
- If they ask to generate a dispatch plan: Guide them to use the "Data Input" tab for now, mentioning you'll assist with this via chat soon.
- For general queries about inventory management or StockPilot: Be a helpful assistant.

Keep responses concise.
`,
});

// Internal Genkit flow
const internalChatAgentFlow = ai.defineFlow(
  {
    name: 'internalChatAgentFlow',
    inputSchema: ChatAgentInputSchema,
    outputSchema: ChatAgentOutputSchema,
  },
  async (input) => {
    const { output } = await chatAgentPrompt(input);
    if (!output) {
      return { reply: "I'm sorry, I couldn't generate a response. The AI model did not return the expected output." };
    }
    return output;
  }
);
