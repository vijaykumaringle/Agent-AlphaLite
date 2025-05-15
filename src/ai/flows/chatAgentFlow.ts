
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
import { fetchDataFromGoogleSheetTool } from '@/ai/tools/google-drive-tools'; // Import the new tool

const OriginalChatMessageSchema = z.object({ 
  sender: z.enum(['user', 'agent']),
  text: z.string(),
  timestamp: z.string().datetime().describe("Timestamp of the message in ISO format"),
});

const OriginalAttachedFileSchema = z.object({ 
  fileName: z.string().describe('The name of the file attached by the user.'),
  fileContent: z.string().optional().describe('The text content of the attached file (for text, csv, md, or simple text from Excel).'),
  fileDataUri: z.string().optional().describe("The Data URI of the attached image file (for png, jpeg). Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});

const ChatAgentInputSchema = z.object({
  message: z.string().describe('The latest message from the user.'),
  history: z.array(OriginalChatMessageSchema).optional().describe('The conversation history up to this point.'),
  files: z.array(OriginalAttachedFileSchema).optional().describe('An array of files attached by the user, if any.'),
});
export type ChatAgentInput = z.infer<typeof ChatAgentInputSchema>;

const PromptHistoryItemSchema = z.object({
  text: z.string(),
  isUser: z.boolean(),
});

const PromptFileItemSchema = z.object({
  fileName: z.string(),
  fileContent: z.string().optional(),
  fileDataUri: z.string().optional(),
  displayIndex: z.number(), 
});

const ChatAgentPromptDataSchema = z.object({
  message: z.string(),
  history: z.array(PromptHistoryItemSchema).optional(),
  files: z.array(PromptFileItemSchema).optional(),
});
type ChatAgentPromptData = z.infer<typeof ChatAgentPromptDataSchema>;


const ChatAgentOutputSchema = z.object({
  reply: z.string().describe("The agent's response to the user's message."),
});
export type ChatAgentOutput = z.infer<typeof ChatAgentOutputSchema>;


export async function chatAgentFlow(input: ChatAgentInput): Promise<ChatAgentOutput> {
  return internalChatAgentFlow(input);
}

const chatAgentPrompt = ai.definePrompt({
  name: 'chatAgentPrompt',
  input: {schema: ChatAgentPromptDataSchema}, 
  output: {schema: ChatAgentOutputSchema},
  tools: [fetchDataFromGoogleSheetTool], // Make the tool available to the AI
  prompt: `You are AlphaLite, a helpful and conversational AI assistant for StockPilot, an inventory management application.
Your primary goal is to understand the user's needs based on their current message, the ongoing conversation history, and any files they've attached or data they ask to load.
Strive to provide a single, comprehensive, and coherent response after processing all available details.
Ensure your response synthesizes all relevant information from the user's message, the conversation history, and any provided files before replying.

The user's latest message is: "{{message}}".

{{#if files.length}}
The user attached the following files. Analyze their content to help respond to the user's message:
{{#each files}}
File ({{this.displayIndex}}/{{../files.length}}): "{{this.fileName}}"
  {{#if this.fileDataUri}}
    This file is an IMAGE: {{media url=this.fileDataUri}}. Describe or analyze it if the user's query relates to an image.
  {{else if this.fileContent}}
    Consider the following instructions for "{{this.fileName}}":
    If "{{this.fileName}}" ends with '.xls' or '.xlsx', it is an Excel file. Its textual representation is:
    """
    {{{this.fileContent}}}
    """
    Attempt to analyze this text content if relevant to the user's query. Be aware that this is a simplified text version and might not capture all formatting or complex data structures. For precise Excel data processing, the 'Data Input' tab is recommended, or ask me to load data from a Google Sheet.
    Otherwise (if it's not an Excel file, e.g., .txt, .csv, .md), its text content is:
    """
    {{{this.fileContent}}}
    """
    Use this text content to inform your response.
  {{else}}
    This file "{{this.fileName}}" appears to be empty or of a format whose content could not be directly extracted for analysis. Acknowledge it by name.
  {{/if}}
{{/each}}
{{/if}}

{{#if history}}
Conversation History (oldest first, leading to the user's current message):
{{#each history}}
{{#if isUser}}User{{else}}Agent{{/if}}: {{text}}
{{/each}}
{{/if}}

Based on the user's current message, the full conversation history, and a thorough analysis of any attached file information, provide a helpful and concise response.
Maintain a natural conversational flow.

Key tasks for StockPilot as AlphaLite:
- If the user asks to load data from a Google Sheet or Google Drive (e.g., "load my inventory sheet", "refresh data from Google Drive named 'MyStockFile'"), use the 'fetchDataFromGoogleSheetTool' to get the data. Inform the user about the outcome of the tool call (e.g., "I've loaded data from 'SheetName'. It contains X stock items and Y orders. What would you like to do next?"). If the tool indicates an error, relay that information.
- Once data is conceptually loaded (either via the tool or if the user implies data is present from previous interactions), they can ask you questions about it or ask to generate a dispatch plan.
- If the user asks to add stock or an order: Acknowledge it and inform them you can help them prepare this data. For now, confirm the details with them. (Direct modification of live Google Sheets via chat is a future enhancement).
- If they ask to generate a dispatch plan:
    - If data has been 'loaded' via the fetchDataFromGoogleSheetTool, acknowledge you can use that data. Guide them to confirm they want to proceed or allow them to specify input data via the "Data Input" tab if they prefer. For now, you will not trigger the plan directly but confirm the data source.
    - If no data is loaded, guide them to use the "Data Input" tab or ask to load data from a Google Sheet.
- For general queries about inventory management or StockPilot: Be a helpful assistant.

Keep responses concise.
When responding about data loaded via the tool, summarize what was loaded (e.g., number of stock items, number of orders found).
`,
});

const internalChatAgentFlow = ai.defineFlow(
  {
    name: 'internalChatAgentFlow',
    inputSchema: ChatAgentInputSchema, 
    outputSchema: ChatAgentOutputSchema,
  },
  async (input: ChatAgentInput): Promise<ChatAgentOutput> => {
    const transformedHistory = input.history?.map(msg => ({
      text: msg.text,
      isUser: msg.sender === 'user',
    }));

    const transformedFiles = input.files?.map((file, index) => ({
      fileName: file.fileName,
      fileContent: file.fileContent,
      fileDataUri: file.fileDataUri,
      displayIndex: index + 1, 
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
    
    if (output.reply.trim() === "") {
      console.warn("AI model returned an empty reply for chatAgentFlow. Input was:", JSON.stringify(promptData));
      return { reply: "I received your message, but I don't have a specific response right now. Could you try rephrasing or asking something else?" };
    }
    return output;
  }
);

