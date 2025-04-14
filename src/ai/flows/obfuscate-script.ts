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

export async function obfuscateScript(input: ObfuscateScriptInput): Promise<ObfuscateScriptOutput> {
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
    const { script } = input;

    try {
      // Retrieve API key from environment variables
      const apiKey = process.env.LUAOBFUSCATOR_API_KEY || '1179e31b-5118-5fd0-d81a-4e146600c3daab0'; // Providing a fallback value

      if (!apiKey) {
        throw new Error('LUAOBFUSCATOR_API_KEY environment variable is not set.');
      }
      const obfuscationResult = await obfuscateLuaScript(script, apiKey)

      // Upload the obfuscated script to pastefy.app as raw text
      const pastefyApiKey = "evzZk5KJWEmTEjvKDoMZ2ubVw6TjXuMEgvgqYrwolifn8pXvrbZ7Grl8WAsH"; // Provided API key
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

      // Construct the raw URL
      const pasteId = uploadData.paste.id;
      const pastefyLink = `https://pastefy.app/${pasteId}`;
      const rawUrl = `https://pastefy.app/${pasteId}/raw`;


      return {
        obfuscatedScript: `loadstring(game:HttpGet("${rawUrl}"))()`,
        pastefyLink: pastefyLink,
      };
    } catch (error: any) {
      throw error;
    }
  }
);
