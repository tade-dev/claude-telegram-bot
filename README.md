# Claude Telegram Bot

A Telegram bot powered by Claude AI with full GitHub integration. Chat naturally, get streaming responses, and manage your GitHub repos — all from Telegram.

## Features

- **Chat with Claude** — Full conversation with memory across messages
- **Streaming replies** — Responses appear progressively as Claude generates them
- **Custom system prompts** — Configure Claude's persona per chat with `/system`
- **GitHub integration** — Read files, create/edit files, manage branches, list PRs

## Setup

### 1. Prerequisites

- Node.js v18+
- A Telegram bot token (from [@BotFather](https://t.me/BotFather))
- An Anthropic API key (from [console.anthropic.com](https://console.anthropic.com))
- *(Optional)* A GitHub Personal Access Token for repo access

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | From @BotFather — send `/newbot` |
| `ANTHROPIC_API_KEY` | From console.anthropic.com |
| `GITHUB_TOKEN` | GitHub PAT with `repo` + `contents` scope |
| `GITHUB_USERNAME` | Your GitHub username |

### 4. Run

```bash
# Development (ts-node, no build step)
npm run dev

# Production
npm run build
npm start
```

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message |
| `/help` | Show all commands |
| `/system <prompt>` | Set a custom system prompt for this chat |
| `/system` | Show the current system prompt |
| `/reset` | Clear conversation history |
| `/repos` | List your GitHub repositories |

## GitHub Capabilities

Just ask naturally — Claude will use the right tools:

- *"List my repos"* → lists all your repositories
- *"Read the README from my repo myproject"* → fetches and displays the file
- *"Create a file hello.txt in repo myproject with content Hello World"* → commits the file
- *"Create a branch feature/auth in repo myproject"* → creates the branch
- *"What are the open PRs in repo myproject?"* → lists pull requests

## Connect to GitHub (after creating the private repo)

```bash
git remote add origin https://github.com/<your-username>/claude-telegram-bot.git
git branch -M main
git push -u origin main
```
