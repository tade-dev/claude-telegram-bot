import type { MessageParam } from "@anthropic-ai/sdk/resources";

const MAX_HISTORY = 30;

const conversationHistory = new Map<number, MessageParam[]>();
const systemPrompts = new Map<number, string>();

export function getHistory(chatId: number): MessageParam[] {
  return conversationHistory.get(chatId) ?? [];
}

export function addMessage(chatId: number, message: MessageParam): void {
  const history = conversationHistory.get(chatId) ?? [];
  history.push(message);
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }
  conversationHistory.set(chatId, history);
}

export function clearHistory(chatId: number): void {
  conversationHistory.delete(chatId);
}

export function getSystemPrompt(chatId: number): string | undefined {
  return systemPrompts.get(chatId);
}

export function setSystemPrompt(chatId: number, prompt: string): void {
  systemPrompts.set(chatId, prompt);
}

export function clearSystemPrompt(chatId: number): void {
  systemPrompts.delete(chatId);
}
