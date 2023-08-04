const { Client, Events, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');

// Create client instance
const client = new Client({})