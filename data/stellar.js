// Stellar (★) equipment and the Activation System. Made by hand from the Taiwan server's Activation System; Global doesn't have the
// Activation NPCs yet.
// The ★ weapons themselves come from data/equipment.js (the Global client has them). STAR_ROUTES: one row per activation:
// name, refine (levels it takes off), cert: [how many, which Forging Certificate], frag: Goblin Coin Fragments, tw (true: only on the Taiwan
// server's later updates so far)
const STAR_ROUTES=[
{name:"★ weapon to ★★",refine:7,cert:[100,"★ Forging Certificate"],frag:8},
{name:"★★ weapon to ★★★",refine:3,cert:[3,"★★ Forging Certificate"],frag:30,tw:true},
{name:"Armor, stable",refine:3,cert:[100,"★ Forging Certificate"],frag:30,tw:true},
{name:"Armor, aggressive",refine:7,cert:[10,"★ Forging Certificate"],frag:3,tw:true}];
// the NPCs, side by side in Prontera: [name, where, what they do]
const STAR_NPCS=[["Workshop Apprentice Nariya","prontera 272 264","a monster-drop weapon or armor for a ★ Forging Certificate of that item (Book for ★ Book's); an activated ★ weapon for a ★★ one"],
["Grandpa Taotao","prontera 272 260","activates the gear with the certificates and Goblin Coin Fragments"]];
