import type { Context } from "telegraf";

export async function helpCommand(ctx: Context): Promise<void> {
  await ctx.reply(
    `*Claude Bot — Commands*\n\n` +
    `/start — Welcome message\n` +
    `/help — Show this help\n` +
    `/system <prompt> — Set a system prompt for this chat\n` +
    `/system — Show the current system prompt\n` +
    `/reset — Clear conversation history\n` +
    `/repos — List your GitHub repositories\n\n` +
    `*GitHub capabilities:*\n` +
    `Just ask me naturally — I can list repos, read files, create/edit files, manage branches, and view pull requests.\n\n` +
    `_Example: "Read the README from my repo myproject"_`,
    { parse_mode: "Markdown" }
  );
}
