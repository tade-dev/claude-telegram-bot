import type { Context } from "telegraf";

export async function startCommand(ctx: Context): Promise<void> {
  await ctx.reply(
    `👋 *Welcome to Claude Bot!*\n\n` +
    `I'm powered by Claude AI and can help you with almost anything — including managing your GitHub repos and tracking your subscriptions.\n\n` +
    `*Commands:*\n` +
    `/help — Show all commands\n` +
    `/subs — View your subscriptions & total cost\n` +
    `/repos — List your GitHub repos\n` +
    `/system — Set a custom system prompt\n` +
    `/reset — Clear conversation history\n\n` +
    `Just send me a message to get started!`,
    { parse_mode: "Markdown" }
  );
}
