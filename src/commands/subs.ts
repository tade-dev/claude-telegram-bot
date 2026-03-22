import type { Context } from "telegraf";
import { listSubscriptions, getCostSummary, getUpcomingRenewals, toMonthlyAmount } from "../subscriptions.js";

export async function subsCommand(ctx: Context): Promise<void> {
  const chatId = ctx.chat!.id;

  const [subs, summary, upcoming] = await Promise.all([
    listSubscriptions(chatId),
    getCostSummary(chatId),
    getUpcomingRenewals(chatId, 7),
  ]);

  if (subs.length === 0) {
    await ctx.reply(
      `*Your Subscriptions*\n\nNo subscriptions tracked yet.\n\nJust tell me: _"Add Netflix $15/month, renews April 1st"_`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  // Group by category
  const byCategory: Record<string, typeof subs> = {};
  for (const s of subs) {
    if (!byCategory[s.category]) byCategory[s.category] = [];
    byCategory[s.category].push(s);
  }

  let msg = `*Your Subscriptions*\n\n`;

  for (const [cat, items] of Object.entries(byCategory).sort()) {
    msg += `*${capitalize(cat)}*\n`;
    for (const s of items) {
      const monthly = toMonthlyAmount(s.amount, s.billingCycle);
      const cycleLabel = s.billingCycle === "monthly" ? "/mo" : s.billingCycle === "yearly" ? "/yr" : "/wk";
      msg += `• ${s.name} — ${s.currency} ${s.amount}${cycleLabel}`;
      if (s.billingCycle !== "monthly") msg += ` (~${s.currency} ${monthly.toFixed(2)}/mo)`;
      msg += `\n  Renews: ${formatDate(s.renewalDate)}\n`;
    }
    msg += "\n";
  }

  msg += `💰 *Total: ${summary.currency} ${summary.monthlyTotal.toFixed(2)}/mo`;
  msg += ` (${summary.currency} ${summary.yearlyTotal.toFixed(2)}/yr)*\n`;
  msg += `📦 ${summary.count} subscription${summary.count !== 1 ? "s" : ""}\n`;

  if (upcoming.length > 0) {
    msg += `\n⏰ *Renewing in the next 7 days:*\n`;
    for (const s of upcoming) {
      msg += `• ${s.name} — ${formatDate(s.renewalDate)}\n`;
    }
  }

  await ctx.reply(msg, { parse_mode: "Markdown" });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
