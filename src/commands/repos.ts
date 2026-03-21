import type { Context } from "telegraf";
import { chat } from "../claude.js";

export async function reposCommand(ctx: Context): Promise<void> {
  const chatId = ctx.chat!.id;
  const placeholder = await ctx.reply("Fetching your repos...");

  let lastText = "";
  const final = await chat(chatId, "List my GitHub repositories", async (partial) => {
    lastText = partial;
    try {
      await ctx.telegram.editMessageText(chatId, placeholder.message_id, undefined, partial, {
        parse_mode: "Markdown",
      });
    } catch {
      // ignore edit rate-limit errors
    }
  });

  if (final !== lastText) {
    try {
      await ctx.telegram.editMessageText(chatId, placeholder.message_id, undefined, final, {
        parse_mode: "Markdown",
      });
    } catch {
      await ctx.reply(final, { parse_mode: "Markdown" });
    }
  }
}
