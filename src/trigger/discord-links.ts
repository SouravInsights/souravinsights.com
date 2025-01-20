import { schedules, logger } from "@trigger.dev/sdk/v3";
import { Redis } from "@upstash/redis";
import {
  getChannels,
  getMessagesFromChannel,
  type DiscordMessage,
} from "@/app/curated-links/utils/discordApi";

// Initialize Upstash Redis client
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export const checkDiscordLinks = schedules.task({
  id: "check-discord-links",
  cron: "*/5 * * * *", // Run every 5 minutes
  run: async (payload) => {
    logger.info("Starting Discord links check");

    try {
      // Get all channels
      const channels = await getChannels();
      let hasNewMessages = false;

      // Check each channel for new messages
      for (const channel of channels) {
        const messages = await logger.trace("fetch-messages", async (span) => {
          span.setAttribute("channel.id", channel.id);
          span.setAttribute("channel.name", channel.name);
          return await getMessagesFromChannel(channel.id);
        });

        // Get the last checked message ID
        const lastMessageId = await redis.get(`last_message:${channel.id}`);

        // Check for new messages
        const newMessages = messages.filter((msg: DiscordMessage) => {
          const messageId = BigInt(msg.id);
          const lastId = lastMessageId
            ? BigInt(lastMessageId as string)
            : BigInt(0);
          return messageId > lastId && msg.content.includes("http");
        });

        if (newMessages.length > 0) {
          hasNewMessages = true;

          // Update the last message ID
          await redis.set(`last_message:${channel.id}`, messages[0].id);
          logger.info("Found new messages", {
            channelName: channel.name,
            count: newMessages.length,
          });
        }
      }

      // If new messages were found, trigger revalidation
      if (hasNewMessages) {
        logger.info("Triggering revalidation");

        const result = await logger.trace("revalidate-page", async (span) => {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL}/api/revalidate`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                secret: process.env.REVALIDATE_SECRET,
              }),
            }
          );

          if (!response.ok) {
            throw new Error("Failed to revalidate");
          }

          return await response.json();
        });

        logger.info("Revalidation complete", { result });
      }

      return { success: true, hasNewMessages };
    } catch (error) {
      logger.error("Error checking Discord links", { error });
      throw error;
    }
  },
});
