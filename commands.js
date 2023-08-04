import { DiscordRequest } from "./utils";

// Get the game choices from game.js
function createCommandChoices() {
    const choices = getRPSChoices();
    const commandChoices = [];
  
    for (let choice of choices) {
      commandChoices.push({
        name: capitalize(choice),
        value: choice.toLowerCase(),
      });
    }
  
    return commandChoices;
}

function createEventList() {
    // get all active events in the discord
}


