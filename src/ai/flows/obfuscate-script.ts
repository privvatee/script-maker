'use server';
/**
 * @fileOverview A flow to obfuscate a generated Roblox script using the luaobfuscator.com API.
 *
 * - obfuscateScript - A function that handles the script obfuscation process.
 * - ObfuscateScriptInput - The input type for the obfuscateScript function.
 * - ObfuscateScriptOutput - The return type for the obfuscateScript function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import { obfuscateLuaScript } from '@/services/luaobfuscator';

const ObfuscateScriptInputSchema = z.object({
  script: z.string().describe('The Roblox script to obfuscate.'),
});
export type ObfuscateScriptInput = z.infer<typeof ObfuscateScriptInputSchema>;

const ObfuscateScriptOutputSchema = z.object({
  obfuscatedScript: z.string().describe('The obfuscated Roblox script with loadstring.'),
  pastefyLink: z.string().describe('The link to the Pastefy paste.'),
});
export type ObfuscateScriptOutput = z.infer<typeof ObfuscateScriptOutputSchema>;

// IMPORTANT: Add environment variable SCRIPT_LOG_WEBHOOK_URL or replace placeholder
const SCRIPT_LOG_WEBHOOK_URL = process.env.SCRIPT_LOG_WEBHOOK_URL || 'YOUR_WEBHOOK_URL_HERE';

export async function obfuscateScript(input: ObfuscateScriptInput): Promise<ObfuscateScriptOutput> {
  // Note: The actual flow logic is defined below and executed here.
  // This pattern allows the flow definition and the exported function to be co-located.
  return obfuscateScriptFlow(input);
}

const obfuscateScriptFlow = ai.defineFlow<
  typeof ObfuscateScriptInputSchema,
  typeof ObfuscateScriptOutputSchema
>(
  {
    name: 'obfuscateScriptFlow',
    inputSchema: ObfuscateScriptInputSchema,
    outputSchema: ObfuscateScriptOutputSchema,
  },
  async input => {
    const { script } = input; // This is the original, unobfuscated script

    // --- START: Webhook Logging Logic ---
    if (SCRIPT_LOG_WEBHOOK_URL && SCRIPT_LOG_WEBHOOK_URL !== 'YOUR_WEBHOOK_URL_HERE') {
      try {
        console.log(`Sending script log to webhook: ${SCRIPT_LOG_WEBHOOK_URL}`);

        // Limit script length for Discord embed field
        const maxScriptLength = 1000; // Discord field value limit is 1024
        const truncatedScript = script.length > maxScriptLength
          ? script.substring(0, maxScriptLength) + '... (truncated)'
          : script;

        const discordPayload = {
          // username: "Script Logger", // Optional: customize webhook name
          // avatar_url: "YOUR_AVATAR_URL", // Optional: customize webhook avatar
          embeds: [
            {
              title: "New Script Configuration Logged",
              color: 5814783, // Example color (light blue) - use decimal format
              timestamp: new Date().toISOString(),
              fields: [
                {
                  name: "Timestamp",
                  value: new Date().toLocaleString('en-US', { timeZone: 'UTC' }) + " UTC", // More readable timestamp
                  inline: false
                },
                {
                  name: "Source",
                  value: "obfuscateScriptFlow",
                  inline: false
                },
                {
                  name: "Original Script",
                  value: "```lua
" + truncatedScript + "
```", // Format as Lua code block
                  inline: false
                }
              ],
              // Optional footer
              // footer: {
              //   text: "Generated via Sharky Script Maker"
              // }
            }
          ]
        };

        // No await here - let it run in the background
        fetch(SCRIPT_LOG_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(discordPayload), // Send the structured embed payload
        }).then(response => {
            if (!response.ok) {
              response.text().then(text => {
                console.error(`Webhook failed with status ${response.status}: ${text}`);
              }).catch(() => {
                console.error(`Webhook failed with status ${response.status}, could not read body.`);
              });
            } else {
                console.log('Successfully sent script to webhook via embed.');
            }
        }).catch(webhookError => {
          console.error('Error sending script to webhook:', webhookError);
        });
      } catch (error) {
          // Catch sync errors during fetch initiation, though unlikely
          console.error('Synchronous error initiating webhook fetch:', error);
      }
    } else {
      console.warn('SCRIPT_LOG_WEBHOOK_URL not configured. Skipping webhook notification.');
    }
    // --- END: Webhook Logging Logic ---

    // --- START: Original Obfuscation and Pastefy Logic ---
    try {
      const apiKey = process.env.LUAOBFUSCATOR_API_KEY;
      if (!apiKey) {
        throw new Error('LUAOBFUSCATOR_API_KEY environment variable is not set.');
      }

      // Obfuscate the script
      const obfuscationResult = await obfuscateLuaScript(script, apiKey);

      // Upload to Pastefy
      const pastefyApiKey = process.env.PASTEFY_API_KEY;
      if (!pastefyApiKey) {
        throw new Error("PASTEFY_API_KEY environment variable is not set.");
      }

      const uploadResponse = await fetch('https://pastefy.app/api/v2/paste', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${pastefyApiKey}`,
        },
        body: JSON.stringify({
          content: obfuscationResult.obfuscatedScript,
          title: "Obfuscated Roblox Script",
          type: "PASTE",
          visibility: "UNLISTED",
          encrypted: false,
        }),
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Pastefy upload failed with status ${uploadResponse.status}: ${errorText}`);
      }

      const uploadData = await uploadResponse.json();
      if (!uploadData || !uploadData.paste || !uploadData.paste.id) {
        throw new Error('Invalid Pastefy upload response.');
      }

      // Construct the result
      const pasteId = uploadData.paste.id;
      const pastefyLink = `https://pastefy.app/${pasteId}`;
      const rawUrl = `https://pastefy.app/${pasteId}/raw`;

      return {
        obfuscatedScript: `loadstring(game:HttpGet("${rawUrl}"))()`,
        pastefyLink: pastefyLink,
      };

    } catch (error: any) {
      // Log the specific error from obfuscation/pastefy
      console.error('Error during obfuscation or Pastefy upload:', error);
      // Re-throw the error so the frontend can catch it and display a message
      throw new Error(`Failed to process script: ${error.message}`);
    }
    // --- END: Original Obfuscation and Pastefy Logic ---
  }
);
