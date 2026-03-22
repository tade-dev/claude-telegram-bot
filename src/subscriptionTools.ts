import type { Tool } from "@anthropic-ai/sdk/resources";
import {
  addSubscription,
  listSubscriptions,
  getUpcomingRenewals,
  getCostSummary,
  deleteSubscription,
  updateSubscription,
  type BillingCycle,
} from "./subscriptions.js";

export const subscriptionTools: Tool[] = [
  {
    name: "add_subscription",
    description:
      "Add a new subscription to track. Use this when the user mentions a service they're paying for.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Service name, e.g. Netflix, Spotify" },
        amount: { type: "number", description: "Cost per billing cycle" },
        currency: { type: "string", description: "Currency code, e.g. USD, GBP, NGN. Default USD." },
        billing_cycle: {
          type: "string",
          enum: ["weekly", "monthly", "yearly"],
          description: "How often the user is billed",
        },
        renewal_date: {
          type: "string",
          description:
            "Next renewal date in YYYY-MM-DD format. If not specified by the user, infer it: monthly → 30 days from today, yearly → 1 year from today, weekly → 7 days from today. Never ask the user for this.",
        },
        category: {
          type: "string",
          description:
            "Category, e.g. entertainment, productivity, health, cloud, news, gaming",
        },
        notes: { type: "string", description: "Optional extra notes" },
      },
      required: ["name", "amount", "billing_cycle", "category"],
    },
  },
  {
    name: "list_subscriptions",
    description:
      "List all subscriptions for the user, optionally filtered by category.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          description: "Optional category filter",
        },
      },
      required: [],
    },
  },
  {
    name: "get_upcoming_renewals",
    description:
      "Get subscriptions that are renewing soon. Useful when the user asks what's due soon.",
    input_schema: {
      type: "object" as const,
      properties: {
        within_days: {
          type: "number",
          description: "Number of days to look ahead. Default 7.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_cost_summary",
    description:
      "Get total monthly and yearly subscription cost across all subscriptions.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "delete_subscription",
    description: "Remove a subscription by its ID.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The subscription ID to delete" },
      },
      required: ["id"],
    },
  },
  {
    name: "update_subscription",
    description:
      "Update details of an existing subscription (amount, renewal date, etc).",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The subscription ID to update" },
        name: { type: "string" },
        amount: { type: "number" },
        currency: { type: "string" },
        billing_cycle: { type: "string", enum: ["weekly", "monthly", "yearly"] },
        renewal_date: { type: "string", description: "YYYY-MM-DD" },
        category: { type: "string" },
        notes: { type: "string" },
      },
      required: ["id"],
    },
  },
];

export async function executeSubscriptionTool(
  chatId: number,
  name: string,
  input: Record<string, unknown>
): Promise<string | null> {
  switch (name) {
    case "add_subscription": {
      const sub = await addSubscription(
        chatId,
        input.name as string,
        input.amount as number,
        (input.currency as string) ?? "USD",
        input.billing_cycle as BillingCycle,
        input.renewal_date as string,
        input.category as string,
        input.notes as string | undefined
      );
      return JSON.stringify(sub);
    }
    case "list_subscriptions": {
      const subs = await listSubscriptions(chatId, input.category as string | undefined);
      return JSON.stringify(subs);
    }
    case "get_upcoming_renewals": {
      const days = (input.within_days as number) ?? 7;
      const subs = await getUpcomingRenewals(chatId, days);
      return JSON.stringify(subs);
    }
    case "get_cost_summary": {
      const summary = await getCostSummary(chatId);
      return JSON.stringify(summary);
    }
    case "delete_subscription": {
      const ok = await deleteSubscription(chatId, input.id as string);
      return JSON.stringify({ success: ok });
    }
    case "update_subscription": {
      const { id, ...updates } = input as Record<string, string | number>;
      const normalized: Parameters<typeof updateSubscription>[2] = {};
      if (updates.name) normalized.name = updates.name as string;
      if (updates.amount !== undefined) normalized.amount = updates.amount as number;
      if (updates.currency) normalized.currency = updates.currency as string;
      if (updates.billing_cycle) normalized.billingCycle = updates.billing_cycle as BillingCycle;
      if (updates.renewal_date) normalized.renewalDate = updates.renewal_date as string;
      if (updates.category) normalized.category = updates.category as string;
      if (updates.notes) normalized.notes = updates.notes as string;
      const updated = await updateSubscription(chatId, id as string, normalized);
      return JSON.stringify(updated ?? { error: "Subscription not found" });
    }
    default:
      return null;
  }
}
