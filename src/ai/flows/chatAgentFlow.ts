
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
// handlebars import and helper registrations are removed as they are no longer needed.

const OriginalChatMessageSchema = z.object({ // Original schema for flow input
  sender: z.enum(['user', 'agent']),
  text: z.string(),
  timestamp: z.string().datetime().describe("Timestamp of the message in ISO format"),
});

const OriginalAttachedFileSchema = z.object({ // Original schema for flow input
  fileName: z.string().describe('The name of the file attached by the user.'),
  fileContent: z.string().optional().describe('The text content of the attached file (for text, csv, md, or simple text from Excel).'),
  fileDataUri: z.string().optional().describe("The Data URI of the attached image file (for png, jpeg). Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});

// Input schema for the exported chatAgentFlow function and internal Genkit flow
const ChatAgentInputSchema = z.object({
  message: z.string().describe('The latest message from the user.'),
  history: z.array(OriginalChatMessageSchema).optional().describe('The conversation history up to this point.'),
  files: z.array(OriginalAttachedFileSchema).optional().describe('An array of files attached by the user, if any. Currently, file attachments are disabled in the UI, so this will likely be empty or undefined.'),
});
export type ChatAgentInput = z.infer<typeof ChatAgentInputSchema>;

// Schema for data transformed and passed directly to the prompt
const PromptHistoryItemSchema = z.object({
  text: z.string(),
  isUser: z.boolean(),
  // timestamp is not used in the prompt template directly
});

const PromptFileItemSchema = z.object({
  fileName: z.string(),
  fileContent: z.string().optional(),
  fileDataUri: z.string().optional(),
  displayIndex: z.number(), // 1-based index for display
});

const ChatAgentPromptDataSchema = z.object({
  message: z.string(),
  history: z.array(PromptHistoryItemSchema).optional(),
  files: z.array(PromptFileItemSchema).optional(),
});
// Type for the data format expected by the prompt
type ChatAgentPromptData = z.infer<typeof ChatAgentPromptDataSchema>;


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
  input: {schema: ChatAgentPromptDataSchema}, // Uses the transformed data schema
  output: {schema: ChatAgentOutputSchema},
  prompt: `You are a helpful assistant for StockPilot, an inventory management application.
The user's latest message is: "{{message}}".

{{#if history}}
Conversation History (most recent last):
{{#each history}}
{{#if isUser}}User{{else}}Agent{{/if}}: {{text}}
{{/each}}
{{/if}}

{{#if files.length}}
The user attached the following files (Note: File attachment is currently disabled in the UI, but handling logic is present):
{{#each files}}
File ({{displayIndex}}/{{../files.length}}): "{{this.fileName}}"
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
    inputSchema: ChatAgentInputSchema, // Accepts the original input schema
    outputSchema: ChatAgentOutputSchema,
  },
  async (input: ChatAgentInput): Promise<ChatAgentOutput> => {
    // Transform data for the prompt
    const transformedHistory = input.history?.map(msg => ({
      text: msg.text,
      isUser: msg.sender === 'user',
    }));

    const transformedFiles = input.files?.map((file, index) => ({
      fileName: file.fileName,
      fileContent: file.fileContent,
      fileDataUri: file.fileDataUri,
      displayIndex: index + 1, // Create 1-based index
    }));

    const promptData: ChatAgentPromptData = {
      message: input.message,
      history: transformedHistory,
      files: transformedFiles,
    };

    const { output } = await chatAgentPrompt(promptData);

    if (!output || typeof output.reply !== 'string') {
      console.error("AI model did not return the expected output structure for chatAgentFlow. Output:", JSON.stringify(output));
      return { reply: "I'm sorry, I couldn't generate a response at this moment. The AI model's output was not in the expected format." };
    }
    return output;
  }
);
