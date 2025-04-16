/**
 * @fileOverview Service to obfuscate Lua scripts using luaobfuscator.com API.
 */

/**
 * Represents the result of a Lua script obfuscation.
 */
export interface ObfuscationResult {
  /**
   * The obfuscated Lua script string.
   */
  obfuscatedScript: string;
}

/**
 * Defines the expected input structure for the obfuscation function.
 */
interface ObfuscateInput {
    script: string;
}

/**
 * Asynchronously obfuscates a Lua script using the luaobfuscator.com API.
 * Reads the API key from the LUAOBFUSCATOR_API_KEY environment variable.
 *
 * @param input An object containing the Lua script to obfuscate: { script: string }.
 * @returns A promise that resolves to an ObfuscationResult containing the obfuscated script.
 */
export async function obfuscateLuaScript(input: ObfuscateInput): Promise<ObfuscationResult> {
  // Destructure the script from the input object
  const { script } = input;

  // --- Read API Key from Environment Variable ---
  const apiKey = process.env.LUAOBFUSCATOR_API_KEY;
  if (!apiKey) {
    // Throw an error if the environment variable is not set
    throw new Error('LUAOBFUSCATOR_API_KEY environment variable is not set.');
  }
  // --- End API Key Handling ---

  const baseUrl = 'https://api.luaobfuscator.com/v1/obfuscator';
  let sessionId: string | null = null; // Keep track of session ID

  try {
    // Step 1: Create a new script session
    console.log("Creating Lua obfuscator session..."); // Added log
    const newScriptResponse = await fetch(`${baseUrl}/newscript`, {
      method: 'POST',
      headers: {
        'apikey': apiKey, // Use API key from environment variable
        'Content-Type': 'text/plain',
      },
      body: script, // Use the script from the input object
    });

    if (!newScriptResponse.ok) {
      const errorData = await newScriptResponse.text();
      console.error(`LuaObfuscator Error (newscript): Status ${newScriptResponse.status}, Body: ${errorData}`); // Log details
      throw new Error(`HTTP error creating session! status: ${newScriptResponse.status}`);
    }

    const newScriptData = await newScriptResponse.json();

    if (!newScriptData.sessionId) {
      console.error("LuaObfuscator Error (newscript): No session ID received.", newScriptData); // Log details
      throw new Error(`Failed to create session: ${newScriptData.message || 'Unknown error'}`);
    }

    sessionId = newScriptData.sessionId;
    console.log(`Lua obfuscator session created: ${sessionId}`); // Added log

    // Step 2: Obfuscate the script using the session ID
    console.log(`Requesting obfuscation for session: ${sessionId}`); // Added log
    const obfuscateResponse = await fetch(`${baseUrl}/obfuscate`, {
      method: 'POST',
      headers: {
        'apikey': apiKey, // Use API key from environment variable
        'sessionId': sessionId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Consider making these options configurable if needed
        MinifiyAll: true,
        Virtualize: true, // Enable virtualization
      }),
    });

     if (!obfuscateResponse.ok) {
      const errorData = await obfuscateResponse.text();
      console.error(`LuaObfuscator Error (obfuscate): Status ${obfuscateResponse.status}, Body: ${errorData}`); // Log details
      throw new Error(`HTTP error obfuscating script! status: ${obfuscateResponse.status}`);
    }

    // Check Content-Type before parsing JSON
    const contentType = obfuscateResponse.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
       const errorData = await obfuscateResponse.text();
       console.error(`LuaObfuscator Error (obfuscate): Non-JSON response received: ${errorData}`); // Log details
       throw new Error(`Non-JSON response received during obfuscation.`);
    }

    const obfuscateData = await obfuscateResponse.json();

    // Check if the 'code' property exists and is a string
    if (typeof obfuscateData.code !== 'string') { // Check includes null or missing
        console.error("LuaObfuscator Error (obfuscate): Obfuscation failed or 'code' missing/null.", obfuscateData); // Log details
        throw new Error(`Obfuscation failed: ${obfuscateData.message || 'No obfuscated code received'}`);
    }

    console.log("Lua obfuscation successful."); // Added log

    return {
      obfuscatedScript: obfuscateData.code,
    };

  } catch (error: any) {
    // Log the specific error encountered during the API calls
    console.error('Error calling luaobfuscator.com API:', error);
    // Re-throw a more generic error or the specific error if needed
    throw new Error(`Failed to obfuscate script: ${error.message}`);
  }
}
