import Anthropic from "@anthropic-ai/sdk";
import type {
  MessageParam,
  ToolUseBlock,
  ContentBlock,
} from "@anthropic-ai/sdk/resources";
import { githubTools, executeTool } from "./github.js";
import { subscriptionTools, executeSubscriptionTool } from "./subscriptionTools.js";
import { getHistory, addMessage, getSystemPrompt } from "./memory.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-sonnet-4-6";
const DEFAULT_SYSTEM = `You are a helpful AI assistant accessible via Telegram. You have access to:
- GitHub tools: read repos, browse files, create/update files, manage branches and pull requests
- Subscription tools: add, list, update, delete subscriptions and get cost summaries and upcoming renewals

Use these tools proactively when relevant. For subscriptions, always confirm after adding or deleting. Format subscription lists and cost summaries clearly. Be concise and clear in your responses.`;

// Called with a streaming update callback so the bot can edit the message in real time
export async function chat(
  chatId: number,
  userText: string,
  onPartialText: (text: string) => Promise<void>
): Promise<string> {
  // Add user message to history
  addMessage(chatId, { role: "user", content: userText });

  const systemPrompt = getSystemPrompt(chatId) ?? DEFAULT_SYSTEM;

  let finalText = "";

  // Agentic loop: keep calling Claude until there are no more tool calls
  while (true) {
    const history = getHistory(chatId);

    let accumulatedText = "";
    let lastEditAt = 0;
    const EDIT_INTERVAL_MS = 800;

    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      tools: [...githubTools, ...subscriptionTools],
      messages: history,
    });

    const toolUseBlocks: ToolUseBlock[] = [];
    let currentToolUse: Partial<ToolUseBlock> & { input_json: string } | null = null;

    // Collect content blocks and stream text to caller
    const contentBlocks: ContentBlock[] = [];
    let currentTextBlock: { type: "text"; text: string; citations: never[] } | null = null;

    for await (const event of stream) {
      if (event.type === "content_block_start") {
        if (event.content_block.type === "text") {
          currentTextBlock = { type: "text", text: "", citations: [] };
        } else if (event.content_block.type === "tool_use") {
          currentToolUse = {
            type: "tool_use",
            id: event.content_block.id,
            name: event.content_block.name,
            input: {},
            input_json: "",
          };
        }
      } else if (event.type === "content_block_delta") {
        if (event.delta.type === "text_delta" && currentTextBlock) {
          currentTextBlock.text += event.delta.text;
          accumulatedText += event.delta.text;

          const now = Date.now();
          if (now - lastEditAt >= EDIT_INTERVAL_MS && accumulatedText.trim()) {
            lastEditAt = now;
            await onPartialText(accumulatedText);
          }
        } else if (event.delta.type === "input_json_delta" && currentToolUse) {
          currentToolUse.input_json += event.delta.partial_json;
        }
      } else if (event.type === "content_block_stop") {
        if (currentTextBlock) {
          contentBlocks.push(currentTextBlock);
          currentTextBlock = null;
        } else if (currentToolUse) {
          try {
            currentToolUse.input = JSON.parse(currentToolUse.input_json || "{}");
          } catch {
            currentToolUse.input = {};
          }
          const toolBlock: ToolUseBlock = {
            type: "tool_use",
            id: currentToolUse.id!,
            name: currentToolUse.name!,
            input: currentToolUse.input as Record<string, unknown>,
          };
          contentBlocks.push(toolBlock);
          toolUseBlocks.push(toolBlock);
          currentToolUse = null;
        }
      }
    }

    const finalMessage = await stream.finalMessage();
    const stopReason = finalMessage.stop_reason;

    // Add assistant turn to history
    addMessage(chatId, { role: "assistant", content: contentBlocks });

    if (stopReason !== "tool_use" || toolUseBlocks.length === 0) {
      // No more tool calls — we have the final response
      const textBlock = contentBlocks.find((b) => b.type === "text") as
        | { type: "text"; text: string }
        | undefined;
      finalText = textBlock?.text ?? accumulatedText;
      break;
    }

    // Execute all tool calls and collect results
    const toolResults: MessageParam["content"] = [];
    for (const toolUse of toolUseBlocks) {
      await onPartialText(
        accumulatedText + `\n\n_Using tool: \`${toolUse.name}\`..._`
      );
      const subResult = await executeSubscriptionTool(
        chatId,
        toolUse.name,
        toolUse.input as Record<string, unknown>
      );
      const result =
        subResult ??
        (await executeTool(
          toolUse.name,
          toolUse.input as Record<string, string | undefined>
        ));
      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: result,
      });
    }

    // Add tool results as a user turn and loop again
    addMessage(chatId, { role: "user", content: toolResults });
  }

  return finalText;
}
