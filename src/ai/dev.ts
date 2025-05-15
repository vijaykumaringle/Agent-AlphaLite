import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-inventory.ts';
import '@/ai/flows/generate-dispatch-plan.ts';
import '@/ai/flows/chatAgentFlow.ts';
import '@/ai/tools/google-drive-tools.ts'; // Added new tools file
