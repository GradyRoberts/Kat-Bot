import 'dotenv/config';
import express from 'express';
import {
  InteractionType,
  InteractionResponseType,
} from 'discord-interactions';
import { VerifyDiscordRequest, DiscordRequest, getGuildScheduledEvents, updateGuildScheduledEvents } from './utils.js';

// Create an express app
const app = express();

// Parse request body and verifies incoming requests using discord-interactions package
app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));

/**
 * Warmer endpoint to prevent cold start (interactions must respond < 3s)
 */
app.get('/warmer', async function (_, res) {
  return res.send("Warming Lambda 🔥...");
});

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 */
app.post('/interactions', async function (req, res) {
  // Interaction type, data, and metadata
  const { type, token, guild_id, id, data } = req.body;

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  /**
   * Handle slash command requests
   */
  const { name } = data;
  if (type === InteractionType.APPLICATION_COMMAND) {
    if (name === 'test') {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
            content: 'hello world',
        },
      });
    } else if (name === 'mention_event') {
      const { options } = data;
      const [eventName, eventId] = options[0].value.split(':');
      const senderId = req.body.member.user.id;
      const message = options[1].value;
      
      // Get selected event users
      const event_users_res = await DiscordRequest(`guilds/${guild_id}/scheduled-events/${eventId}/users`, {});
      if (!event_users_res.ok) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "Error finding event, please check the name and try again",
            flags: 64
          },
        });
      }
      let event_users = await event_users_res.json();
      event_users = event_users.map((u) => `<@${u.user.id}>`);
      event_users = event_users.join(" ");
      
      // Create response with mentions and message
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
            content: `# ~ ${eventName} ~\n${event_users}\n\nFrom <@${senderId}>:\n> ${message}`,
        },
      });
    }
  } else if (type === InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE) {
    if (name === 'mention_event') {
      const { options } = data;
      const user_input = options[0].value.toUpperCase();

      try {
        // Get list of guild events from dynamoDB if TTL hasn't expired else pull from API
        let events = await getGuildScheduledEvents(guild_id);
        if (events.length == 0) {
          console.log("Getting events from API");  
          const events_res = await DiscordRequest(`guilds/${guild_id}/scheduled-events`, {});
          events = await events_res.json();
          events = events.map((e) => ({"name": e.name, "value": `${e.name}:${e.id}`}));
          
          // Push events to DB
          await updateGuildScheduledEvents(guild_id, events);
        }

        // Filter by startswith user input
        events = events.filter((event) => (event.name.toUpperCase().startsWith(user_input)));

        // Return events and their ids as options
        await DiscordRequest(`interactions/${id}/${token}/callback`, {
          method: 'POST',
          body: {
            type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
            data: {
              choices: events
            }
          }
        });
      } catch (error) {
        console.log(`ERROR: ${error}`);
      }
    }

  }
});

export default app;