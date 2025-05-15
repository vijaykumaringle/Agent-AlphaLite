
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
  sender: z.enum(['user', 'agent']),
  text: z.string(),
  timestamp: z.string().datetime().describe("Timestamp of the message in ISO format"),
});

const AttachedFileSchema = z.object({
  fileName: z.string().describe('The name of the file attached by the user.'),
  fileContent: z.string().optional().describe('The text content of the attached file (for text, csv, md, or simple text from Excel).'),
  fileDataUri: z.string().optional().describe("The Data URI of the attached image file (for png, jpeg). Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});

const ChatAgentInputSchema = z.object({
  message: z.string().describe('The latest message from the user.'),
  history: z.array(ChatMessageSchema).optional().describe('The conversation history up to this point.'),
  files: z.array(AttachedFileSchema).optional().describe('An array of files attached by the user, if any.'),
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
The user's latest message is: "{{message}}".

{{#if history}}
Conversation History (most recent last):
{{#each history}}
{{#if (eq sender "user")}}User{{else}}Agent{{/if}}: {{text}}
{{/each}}
{{/if}}

{{#if files.length}}
The user attached the following files:
{{#each files}}
File ({{@indexPlus1}}/{{../files.length}}): "{{this.fileName}}"
  {{#if this.fileDataUri}}
  This file is an image. Acknowledge that an image was attached. You cannot display or directly analyze the image content in this chat yet.
  {{else if this.fileContent}}
    Consider the following instructions for "{{this.fileName}}":
    If "{{this.fileName}}" ends with '.xls' or '.xlsx', it is an Excel file. Acknowledge it by name. Inform the user that you cannot process its content directly in this chat. Suggest they use the "Data Input" tab for structured data that might come from Excel.
    Otherwise (if it's not an Excel file like .txt, .csv, .md), its text content is:
    """
    {{{this.fileContent}}}
    """
    Take this text content into account.
  {{else}}
  This file "{{this.fileName}}" seems to be empty or of an unprocessable format for direct content review.
  {{/if}}
{{/each}}
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
    // Register Handlebars helpers
    const handlebars = (await import('handlebars')).default;
    handlebars.registerHelper('indexPlus1', function(index) {
      return index + 1;
    });
    handlebars.registerHelper('eq', function (a, b) {
      return a === b;
    });
    
    const { output } = await chatAgentPrompt(input);
    if (!output) {
      return { reply: "I'm sorry, I couldn't generate a response. The AI model did not return the expected output." };
    }
    return output;
  }
);

