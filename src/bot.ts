import { Telegraf } from "telegraf";
import { chat } from "./claude.js";
import { startCommand } from "./commands/start.js";
import { helpCommand } from "./commands/help.js";
import { systemCommand } from "./commands/system.js";
import { resetCommand } from "./commands/reset.js";
import { reposCommand } from "./commands/repos.js";

export function createBot(token: string): Telegraf {
  const bot = new Telegraf(token);

  // Commands
  bot.command("start", startCommand);
  bot.command("help", helpCommand);
  bot.command("system", systemCommand);
  bot.command("reset", resetCommand);
  bot.command("repos", reposCommand);

  // Handle all text messages
  bot.on("text", async (ctx) => {
    const chatId = ctx.chat.id;
    const userText = ctx.message.text;

    // Ignore commands (already handled above)
    if (userText.startsWith("/")) return;

    // Send typing indicator
    await ctx.sendChatAction("typing");

    const placeholder = await ctx.reply("...");
    let lastText = "";

    try {
      const final = await chat(chatId, userText, async (partial) => {
        lastText = partial;
        try {
          await ctx.telegram.editMessageText(
            chatId,
            placeholder.message_id,
            undefined,
            partial,
            { parse_mode: "Markdown" }
          );
        } catch {
          // Ignore edit errors (rate limit, message unchanged, etc.)
        }
      });

      // Do a final edit if the last partial wasn't the complete response
      if (final !== lastText || lastText === "") {
        try {
          await ctx.telegram.editMessageText(
            chatId,
            placeholder.message_id,
            undefined,
            final || "(no response)",
            { parse_mode: "Markdown" }
          );
        } catch {
          // If markdown fails, send as plain text
          try {
            await ctx.telegram.editMessageText(
              chatId,
              placeholder.message_id,
              undefined,
              final || "(no response)"
            );
          } catch {
            await ctx.reply(final || "(no response)");
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await ctx.telegram.editMessageText(
        chatId,
        placeholder.message_id,
        undefined,
        `Error: ${msg}`
      );
    }
  });

  return bot;
}
