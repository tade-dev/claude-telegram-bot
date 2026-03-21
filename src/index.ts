import "dotenv/config";
import { createBot } from "./bot.js";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("ERROR: TELEGRAM_BOT_TOKEN is not set. Copy .env.example to .env and fill in the values.");
  process.exit(1);
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ERROR: ANTHROPIC_API_KEY is not set.");
  process.exit(1);
}

const bot = createBot(token);

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

bot.launch().then(() => {
  console.log("Claude Telegram Bot is running...");
  if (process.env.GITHUB_TOKEN) {
    console.log("GitHub integration: enabled");
  } else {
    console.log("GitHub integration: disabled (GITHUB_TOKEN not set)");
  }
}).catch((err) => {
  console.error("Failed to start bot:", err);
  process.exit(1);
});
