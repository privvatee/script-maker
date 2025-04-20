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

// --- Input Schema Update ---
const ObfuscateScriptInputSchema = z.object({
  script: z.string().describe('The Roblox script to obfuscate.'),
  discordUsername: z.string().optional().describe('The Discord username of the user generating the script.'), // <-- Added
});
export type ObfuscateScriptInput = z.infer<typeof ObfuscateScriptInputSchema>;

// --- Output Schema (Unchanged) ---
const ObfuscateScriptOutputSchema = z.object({
  obfuscatedScript: z.string().describe('The obfuscated Roblox script with loadstring.'),
  pastefyLink: z.string().describe('The link to the Pastefy paste.'),
});
export type ObfuscateScriptOutput = z.infer<typeof ObfuscateScriptOutputSchema>;

// --- Environment Variable (Unchanged) ---
const SCRIPT_LOG_WEBHOOK_URL = process.env.SCRIPT_LOG_WEBHOOK_URL || 'YOUR_WEBHOOK_URL_HERE';

// --- Exported Function (Unchanged signature, but uses updated flow) ---
export async function obfuscateScript(input: ObfuscateScriptInput): Promise<ObfuscateScriptOutput> {
  return obfuscateScriptFlow(input);
}

// --- Flow Definition Update ---
const obfuscateScriptFlow = ai.defineFlow<
  typeof ObfuscateScriptInputSchema, // <-- Updated Input Schema
  typeof ObfuscateScriptOutputSchema
>(
  {
    name: 'obfuscateScriptFlow',
    inputSchema: ObfuscateScriptInputSchema, // <-- Updated Input Schema
    outputSchema: ObfuscateScriptOutputSchema,
  },
  async input => {
    // <-- Destructure new input field
    const { script, discordUsername } = input;

    // --- START: Webhook Logging Logic ---
    if (SCRIPT_LOG_WEBHOOK_URL && SCRIPT_LOG_WEBHOOK_URL !== 'YOUR_WEBHOOK_URL_HERE') {
      try {
        console.log(`Sending script log to webhook: ${SCRIPT_LOG_WEBHOOK_URL}`);

        const maxScriptLength = 1000;
        const truncatedScript = script.length > maxScriptLength
          ? script.substring(0, maxScriptLength) + '... (truncated)'
          : script;

        // <-- Prepare fields, adding Discord Username if present
        const embedFields = [
          {
            name: "Timestamp",
            value: new Date().toLocaleString('en-US', { timeZone: 'UTC' }) + " UTC",
            inline: false
          },
          {
            name: "Source",
            value: "obfuscateScriptFlow",
            inline: false
          }
        ];

        if (discordUsername) {
          embedFields.push({
            name: "Discord User",
            value: discordUsername,
            inline: true // Display next to other info if space allows
          });
        }

        embedFields.push({
          name: "Original Script",
          value: `\`\`\`lua
${truncatedScript}
\`\`\``,
          inline: false
        });

        const discordPayload = {
          embeds: [
            {
              title: "New Script Configuration Logged",
              color: 5814783,
              timestamp: new Date().toISOString(),
              fields: embedFields // <-- Use the constructed fields array
            }
          ]
        };

        // Fetch logic (unchanged)
        fetch(SCRIPT_LOG_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(discordPayload),
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
          console.error('Synchronous error initiating webhook fetch:', error);
      }
    } else {
      console.warn('SCRIPT_LOG_WEBHOOK_URL not configured. Skipping webhook notification.');
    }
    // --- END: Webhook Logging Logic ---

    // --- START: Original Obfuscation and Pastefy Logic (Unchanged) ---
    try {
      const apiKey = process.env.LUAOBFUSCATOR_API_KEY;
      if (!apiKey) {
        throw new Error('LUAOBFUSCATOR_API_KEY environment variable is not set.');
      }

      const obfuscationResult = await obfuscateLuaScript(script, apiKey);

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

      const pasteId = uploadData.paste.id;
      const pastefyLink = `https://pastefy.app/${pasteId}`;
      const rawUrl = `https://pastefy.app/${pasteId}/raw`;

      return {
        obfuscatedScript: `loadstring(game:HttpGet("${rawUrl}"))()`,
        pastefyLink: pastefyLink,
      };

    } catch (error: any) {
      console.error('Error during obfuscation or Pastefy upload:', error);
      throw new Error(`Failed to process script: ${error.message}`);
    }
    // --- END: Original Obfuscation and Pastefy Logic ---
  }
);
