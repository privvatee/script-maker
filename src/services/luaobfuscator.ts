/**
 * Represents the result of a Lua script obfuscation.
 */
export interface ObfuscationResult {
  /**
   * The obfuscated Lua script.
   */
  obfuscatedScript: string;
}

/**
 * Asynchronously obfuscates a Lua script using the luaobfuscator.com API.
 *
 * @param script The Lua script to obfuscate.
 * @param apiKey The API key for luaobfuscator.com.
 * @returns A promise that resolves to an ObfuscationResult containing the obfuscated script.
 */
export async function obfuscateLuaScript(script: string, apiKey: string): Promise<ObfuscationResult> {
  const baseUrl = 'https://api.luaobfuscator.com/v1/obfuscator';

  try {
    // Step 1: Create a new script session
    const newScriptResponse = await fetch(`${baseUrl}/newscript`, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'text/plain',
      },
      body: script,
    });

    if (!newScriptResponse.ok) {
      const errorData = await newScriptResponse.text();
      throw new Error(`HTTP error creating session! status: ${newScriptResponse.status}, body: ${errorData}`);
    }

    const newScriptData = await newScriptResponse.json();

    if (!newScriptData.sessionId) {
      throw new Error(`Failed to create session: ${newScriptData.message || 'Unknown error'}`);
    }

    const sessionId = newScriptData.sessionId;

    // Step 2: Obfuscate the script using the session ID
    const obfuscateResponse = await fetch(`${baseUrl}/obfuscate`, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'sessionId': sessionId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        MinifiyAll: true,
        Virtualize: true, // Enable virtualization
      }),
    });

     if (!obfuscateResponse.ok) {
      const errorData = await obfuscateResponse.text();
      throw new Error(`HTTP error obfuscating script! status: ${obfuscateResponse.status}, body: ${errorData}`);
    }
    
    const contentType = obfuscateResponse.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const errorData = await obfuscateResponse.text();
          throw new Error(`Non-JSON response received: ${errorData}`);
        }

    const obfuscateData = await obfuscateResponse.json();

    if (obfuscateData.code === null) {
        throw new Error(`Obfuscation failed: ${obfuscateData.message || 'Unknown error'}`);
    }


    return {
      obfuscatedScript: obfuscateData.code,
    };
  } catch (error: any) {
    console.error('Error calling luaobfuscator.com API:', error);
    throw new Error(`Failed to obfuscate script: ${error.message}`);
  }
}
