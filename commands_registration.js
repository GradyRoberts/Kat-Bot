import 'dotenv/config';
import { InstallGlobalCommands } from './utils.js';



// Simple test command
const TEST_COMMAND = {
  name: 'test',
  description: 'Basic command',
  type: 1,
};

// Mention voice channel
const MENTION_VOICE_COMMAND = {
  name: 'mention_voice',
  description: 'Mention all users currently in a voice channel',
  options: [
    {
      type: 7,
      name: 'channel',
      description: 'Choose channel [voice only]',
      required: true
    },
    {
      type: 3,
      name: 'message',
      description: 'Add a message to your mention',
      required: false
    }
  ],
  type: 1
}

const MENTION_EVENT_COMMAND = {
  name: 'mention_event',
  description: 'Mention all users interested in a server event',
  options: [
    {
      type: 3,
      name: 'event',
      description: 'Choose event',
      required: true,
      options: [],
      autocomplete: true
    },
    {
      type: 3,
      name: 'message',
      description: 'Add a message to your mention',
      required: false
    }
  ],
  type: 1
}

const ALL_COMMANDS = [TEST_COMMAND, MENTION_VOICE_COMMAND, MENTION_EVENT_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);