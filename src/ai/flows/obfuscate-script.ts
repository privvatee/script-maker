'use server';
/**
 * @fileOverview Flow to obfuscate a generated Roblox script, log the input script,
 * and upload the result to Pastefy.
 *
 * - obfuscateScript - Entry function calling the Genkit flow.
 * - ObfuscateScriptInput - Input schema (expects full script string).
 * - ObfuscateScriptOutput - Output type (obfuscated script loadstring + pastefy link).
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
// Assumes obfuscateLuaScript is in this path and expects { script: string } input
// and reads LUAOBFUSCATOR_API_KEY from process.env
import { obfuscateLuaScript, ObfuscationResult } from '@/services/luaobfuscator';

// --- Input Schema ---
const ObfuscateScriptInputSchema = z.object({
  script: z.string().describe('The complete, configured Roblox script to obfuscate.'),
});
export type ObfuscateScriptInput = z.infer<typeof ObfuscateScriptInputSchema>;

// --- Output Schema ---
const ObfuscateScriptOutputSchema = z.object({
  obfuscatedScript: z.string().describe('The obfuscated Roblox script with loadstring.'),
  pastefyLink: z.string().describe('The link to the Pastefy paste.'),
});
export type ObfuscateScriptOutput = z.infer<typeof ObfuscateScriptOutputSchema>;


// --- Main Exported Function (calls the flow) ---
export async function obfuscateScript(input: ObfuscateScriptInput): Promise<ObfuscateScriptOutput> {
   // Basic validation
   if (!input.script || typeof input.script !== 'string' || input.script.length === 0) {
       throw new Error("A valid script string is required.");
   }
   // Call the Genkit flow
   return obfuscateScriptFlow(input);
}


// --- Genkit Flow Definition ---
const obfuscateScriptFlow = ai.defineFlow<
  typeof ObfuscateScriptInputSchema,
  typeof ObfuscateScriptOutputSchema
>(
  {
    name: 'obfuscateScriptFlow',
    inputSchema: ObfuscateScriptInputSchema,
    outputSchema: ObfuscateScriptOutputSchema,
  },
  async (input) => {
    // Input is the object { script: "..." }
    const { script: configuredScript } = input; // Use the script passed from frontend

    try {
      // --- Step 1: Log the Configured Script (NEW) ---
      const adminLogWebhookUrl = process.env.ADMIN_LOG_WEBHOOK_URL;

      if (adminLogWebhookUrl) {
        // Use a fire-and-forget async function to avoid blocking the main flow
        (async () => {
          try {
            console.log("Sending script log to admin webhook...");
            const logPayload = {
              content: `Script Generated at ${new Date().toISOString()}:\n\`\`\`lua\n${configuredScript}\n\`\`\``,
              username: "Script Maker Logger"
            };
            // Limit content length for Discord
            if (logPayload.content.length > 1900) {
                logPayload.content = logPayload.content.substring(0, 1900) + "\n... (script truncated)";
            }

            const logResponse = await fetch(adminLogWebhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(logPayload),
            });
            if (!logResponse.ok) {
              console.error(`Failed to send log webhook: ${logResponse.status} ${logResponse.statusText}`, await logResponse.text());
            } else {
              console.log("Admin log webhook sent successfully.");
            }
          } catch (logError) {
            console.error("Error sending admin log webhook:", logError);
          }
        })(); // Immediately invoke the async function
      } else {
        console.warn("ADMIN_LOG_WEBHOOK_URL environment variable not set. Skipping script logging.");
      }
      // --- End Logging Step ---


      // --- Step 2: Call Lua Obfuscator Service ---
      // *** MODIFIED CALL: Pass object { script: ... } ***
      // Assumes obfuscateLuaScript now reads LUAOBFUSCATOR_API_KEY from process.env
      console.log("Calling obfuscateLuaScript service...");
      const obfuscationResult: ObfuscationResult = await obfuscateLuaScript({ script: configuredScript });
      console.log("Script obfuscated successfully.");


      // --- Step 3: Upload to Pastefy ---
      const pastefyApiKey = process.env.PASTEFY_API_KEY;
      if (!pastefyApiKey) {
        throw new Error("PASTEFY_API_KEY environment variable is not set.");
      }
      // Use the obfuscatedScript property from the result object
      const scriptContentForPastefy = obfuscationResult?.obfuscatedScript;
      if (!scriptContentForPastefy || typeof scriptContentForPastefy !== 'string') {
          throw new Error("Obfuscation service did not return a valid script string in result object.");
      }

      console.log("Calling Pastefy API...");
      const uploadResponse = await fetch('https://pastefy.app/api/v2/paste', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${pastefyApiKey}`,
        },
        body: JSON.stringify({
          content: scriptContentForPastefy, // Use the result from obfuscation
          title: "Obfuscated Roblox Script",
          type: "PASTE", visibility: "UNLISTED", encrypted: false,
        }),
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error("Pastefy API Error Response:", errorText);
        throw new Error(`Pastefy upload failed with status ${uploadResponse.status}: ${errorText}`);
      }
      const uploadData = await uploadResponse.json();
      if (!uploadData || !uploadData.paste || !uploadData.paste.id) {
        console.error("Invalid response from Pastefy API:", uploadData);
        throw new Error('Invalid Pastefy upload response.');
      }
      const pasteId = uploadData.paste.id;
      const pastefyLink = `https://pastefy.app/${pasteId}`;
      const rawUrl = `https://pastefy.app/${pasteId}/raw`;
      console.log("Pastefy upload successful:", pastefyLink);

      // --- Step 4: Return Final Result ---
      return {
        obfuscatedScript: `loadstring(game:HttpGet("${rawUrl}"))()`,
        pastefyLink: pastefyLink,
      };

    } catch (error: any) {
      console.error("Error in obfuscateScriptFlow:", error);
      throw error; // Re-throw for frontend/Vercel to catch
    }
  }
);
