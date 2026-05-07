# Jovida Tool Demo — 万物教练 API Demos

A local demo server showcasing 7 real-data tools for a personal life/health coaching Agent.

## Tools

| Tool | Data Source | Type |
|------|------------|------|
| 英语教练 (YouTube) | YouTube Search + Transcript | Apify |
| PubMed 文献 | NCBI E-utilities | Free API |
| Reddit 讨论 | Reddit Scraper | Apify |
| Wikipedia 百科 | Wikipedia REST API | Free API |
| 商品搜索 | Amazon Search | Apify |
| 食品成分 | Open Food Facts | Free API |
| 动作库 | wger.de Exercise DB | Free API |

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure API token

Copy `.env.example` to `.env` and fill in your [Apify token](https://console.apify.com/settings/integrations):

```bash
cp .env.example .env
# Edit .env and set APIFY_TOKEN=your_token
```

### 3. Start server

```bash
node server.cjs
```

Open [http://localhost:3456](http://localhost:3456)

## Requirements

- Node.js 18+
- Apify account (free tier works)
