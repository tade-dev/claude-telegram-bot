import type { Context } from "telegraf";
import { clearHistory } from "../memory.js";

export async function resetCommand(ctx: Context): Promise<void> {
  clearHistory(ctx.chat!.id);
  await ctx.reply("Conversation history cleared. Fresh start!");
}
