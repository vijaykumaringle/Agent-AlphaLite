import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-inventory.ts';
import '@/ai/flows/generate-dispatch-plan.ts';