import type { Context } from "telegraf";

export async function helpCommand(ctx: Context): Promise<void> {
  await ctx.reply(
    `*Claude Bot — Commands*\n\n` +
    `/start — Welcome message\n` +
    `/help — Show this help\n` +
    `/system <prompt> — Set a system prompt for this chat\n` +
    `/system — Show the current system prompt\n` +
    `/reset — Clear conversation history\n` +
    `/repos — List your GitHub repositories\n` +
    `/subs — Show all your subscriptions & total cost\n\n` +
    `*Subscription tracking:*\n` +
    `Just tell me naturally — I can add, update, delete subscriptions and show upcoming renewals.\n` +
    `_Example: "Add Spotify $9.99/month, renews April 15th"_\n` +
    `_Example: "What subscriptions are renewing this week?"_\n` +
    `_Example: "How much am I spending on subscriptions?"_\n\n` +
    `*GitHub capabilities:*\n` +
    `Just ask me naturally — I can list repos, read files, create/edit files, manage branches, and view pull requests.\n` +
    `_Example: "Read the README from my repo myproject"_`,
    { parse_mode: "Markdown" }
  );
}
