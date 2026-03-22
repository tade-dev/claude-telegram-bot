import { randomUUID } from "crypto";
import { getDb } from "./db.js";

export type BillingCycle = "weekly" | "monthly" | "yearly";

export interface Subscription {
  id: string;
  chatId: number;
  name: string;
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  renewalDate: string; // ISO date "YYYY-MM-DD"
  category: string;
  notes?: string;
  createdAt: string;
}

function col() {
  return getDb().then((db) => db.collection<Subscription>("subscriptions"));
}

/** Convert any amount to a monthly equivalent for cost summaries */
export function toMonthlyAmount(amount: number, cycle: BillingCycle): number {
  if (cycle === "weekly") return (amount * 52) / 12;
  if (cycle === "yearly") return amount / 12;
  return amount;
}

function defaultRenewalDate(billingCycle: BillingCycle): string {
  const d = new Date();
  if (billingCycle === "weekly") d.setDate(d.getDate() + 7);
  else if (billingCycle === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export async function addSubscription(
  chatId: number,
  name: string,
  amount: number,
  currency: string,
  billingCycle: BillingCycle,
  renewalDate: string | undefined,
  category: string,
  notes?: string
): Promise<Subscription> {
  const sub: Subscription = {
    id: randomUUID(),
    chatId,
    name: name.trim(),
    amount,
    currency: currency.toUpperCase(),
    billingCycle,
    renewalDate: renewalDate || defaultRenewalDate(billingCycle),
    category: category.toLowerCase().trim(),
    notes: notes?.trim(),
    createdAt: new Date().toISOString(),
  };
  const c = await col();
  await c.insertOne(sub);
  return sub;
}

export async function listSubscriptions(
  chatId: number,
  category?: string
): Promise<Subscription[]> {
  const c = await col();
  const filter: Record<string, unknown> = { chatId };
  if (category) filter.category = { $regex: category.toLowerCase().trim(), $options: "i" };
  const subs = await c.find(filter).sort({ name: 1 }).toArray();
  // strip MongoDB _id
  return subs.map(({ _id, ...s }) => s as Subscription);
}

export async function getUpcomingRenewals(
  chatId: number,
  withinDays = 7
): Promise<Subscription[]> {
  const subs = await listSubscriptions(chatId);
  const now = new Date();
  const cutoff = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);
  return subs
    .filter((s) => {
      const d = new Date(s.renewalDate);
      return d >= now && d <= cutoff;
    })
    .sort(
      (a, b) =>
        new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime()
    );
}

export async function getCostSummary(chatId: number): Promise<{
  monthlyTotal: number;
  yearlyTotal: number;
  currency: string;
  count: number;
}> {
  const subs = await listSubscriptions(chatId);
  const monthlyTotal = subs.reduce(
    (sum, s) => sum + toMonthlyAmount(s.amount, s.billingCycle),
    0
  );
  const currencyCounts: Record<string, number> = {};
  for (const s of subs)
    currencyCounts[s.currency] = (currencyCounts[s.currency] ?? 0) + 1;
  const currency =
    Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "USD";
  return { monthlyTotal, yearlyTotal: monthlyTotal * 12, currency, count: subs.length };
}

export async function deleteSubscription(
  chatId: number,
  id: string
): Promise<boolean> {
  const c = await col();
  const result = await c.deleteOne({ id, chatId });
  return result.deletedCount > 0;
}

export async function updateSubscription(
  chatId: number,
  id: string,
  updates: Partial<
    Pick<
      Subscription,
      | "name"
      | "amount"
      | "currency"
      | "billingCycle"
      | "renewalDate"
      | "category"
      | "notes"
    >
  >
): Promise<Subscription | null> {
  const c = await col();
  const result = await c.findOneAndUpdate(
    { id, chatId },
    { $set: updates },
    { returnDocument: "after" }
  );
  if (!result) return null;
  const { _id, ...sub } = result;
  return sub as Subscription;
}
