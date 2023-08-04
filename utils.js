import 'dotenv/config';
import fetch from 'node-fetch';
import { verifyKey } from 'discord-interactions';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ExecuteStatementCommand } from '@aws-sdk/lib-dynamodb';

export function VerifyDiscordRequest(clientKey) {
  return function (req, res, buf, encoding) {
    const signature = req.get('X-Signature-Ed25519');
    const timestamp = req.get('X-Signature-Timestamp');

    const isValidRequest = verifyKey(buf, signature, timestamp, clientKey);
    if (!isValidRequest) {
      res.status(401).send('Bad request signature');
      throw new Error('Bad request signature');
    }
  };
}

function getDynamoDBClient() {
  const client = new DynamoDBClient({"region": "us-east-1"});
  const docClient = DynamoDBDocumentClient.from(client);

  return docClient;
}

async function DynamoDBRequest(statement, parameters) {
  const client = getDynamoDBClient();
  const command = new ExecuteStatementCommand({
    TableName: 'DiscordScheduledEvents',
    Statement: statement,
    Parameters: parameters,
  });

  const response = await client.send(command);
  console.log(JSON.stringify(response));
  return response;
}

export async function getGuildScheduledEvents(guildId) {
  const events = await DynamoDBRequest("SELECT * FROM DiscordScheduledEvents WHERE guildId=?", [guildId]);
  console.log(`Got response from DB: ${JSON.stringify(events)}`);
  if (events.Items.length > 0) {
    return events.Items.map((e) => ({"name": e.eventName, "value": `${e.eventName}:${e.eventId}`}));
  } else {
    return []
  }
}

export async function updateGuildScheduledEvents(guildId, events) {
  console.log(`Submitting events ${JSON.stringify(events)}`);
  const expTime = Math.floor(Date.now()/1000) + 90; // 90 seconds TTL
  let response;
  for (let e of events) {
    console.log(JSON.stringify(e));
    response = await DynamoDBRequest(
      "INSERT INTO DiscordScheduledEvents value {'guildId':?, 'eventId':?, 'eventName':?, 'expTime':?}", 
      [guildId, e.value.split(":")[1], e.name, expTime]
    );
    console.log(JSON.stringify(response));
  }
}

export async function DiscordRequest(endpoint, options) {
  // append endpoint to root API URL
  const url = 'https://discord.com/api/v10/' + endpoint;
  console.log(`Making API request to ${url}`);
  // Stringify payloads
  if (options.body) options.body = JSON.stringify(options.body);
  // Use node-fetch to make requests
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'User-Agent': 'Kat Discord Bot',
      },
      ...options
    });

    // throw API errors
    if (!res.ok) {
      const data = await res.json();
      console.log(`${res.status} - ${JSON.stringify(data)}`);
      // throw new Error(JSON.stringify(data));
    }
    // return original response
    return res;
  } catch (error) {
    console.log(`ERROR: ${error}`);
    throw error; 
  }
}

export async function InstallGlobalCommands(appId, commands) {
  // API endpoint to overwrite global commands
  const endpoint = `applications/${appId}/commands`;

  try {
    // This is calling the bulk overwrite endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
    await DiscordRequest(endpoint, { method: 'PUT', body: commands });
  } catch (err) {
    console.error(err);
  }
}
