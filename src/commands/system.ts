import type { Context } from "telegraf";
import { getSystemPrompt, setSystemPrompt } from "../memory.js";

export async function systemCommand(ctx: Context): Promise<void> {
  const message = ctx.message;
  if (!message || !("text" in message)) return;

  const chatId = ctx.chat!.id;
  // Strip the /system command prefix (handles /system and /system@botname)
  const text = message.text.replace(/^\/system(@\S+)?\s*/i, "").trim();

  if (!text) {
    const current = getSystemPrompt(chatId);
    if (current) {
      await ctx.reply(`*Current system prompt:*\n\n${current}`, { parse_mode: "Markdown" });
    } else {
      await ctx.reply(
        "No custom system prompt set. Use `/system <your prompt>` to set one.",
        { parse_mode: "Markdown" }
      );
    }
    return;
  }

  setSystemPrompt(chatId, text);
  await ctx.reply(
    `System prompt updated. I'll use this for all future messages in this chat.\n\n_Tip: Use /reset to clear conversation history if you want a fresh start with the new prompt._`,
    { parse_mode: "Markdown" }
  );
}
