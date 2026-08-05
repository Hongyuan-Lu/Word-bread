<div align="center">

# 🍞 WordBread 单词面包

**AI 驱动的英语新闻阅读器，专为 CET4/CET6 学习者设计**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel)](https://vercel.com)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-wordbread.xyz-brightgreen)](https://www.wordbread.xyz/)

[English](#english) | [中文](#中文)

</div>

---

## 中文

### 📖 项目简介

WordBread 是一个创新的英语学习工具，它将真实的英文新闻自动改写为适合 CET4/CET6 学习者的阅读材料。通过 AI 技术和结构化词表，系统能够智能标注词汇难度，帮助用户在阅读真实语境中自然积累考试词汇。

### 🌐 在线体验

🚀 **立即体验**: [https://www.wordbread.xyz](https://www.wordbread.xyz)

- Production: https://word-bread.vercel.app
- 自定义域名: https://www.wordbread.xyz

### ✨ 核心功能

| 功能 | 描述 |
|------|------|
| 🤖 **AI 新闻改写** | 使用 MiniMax API 将真实新闻改写为 CET4/CET6 难度的学习文章 |
| 📊 **智能词汇标注** | 基于结构化词表自动识别并高亮考试重点词汇 |
| 📚 **双难度模式** | 支持 CET4 和 CET6 两种学习目标切换 |
| 🎯 **专业领域筛选** | 16 个学科领域可选，推荐相关专业文章 |
| 💾 **词汇状态管理** | 标记已知/未知词汇，学习进度云端同步 |
| 🔍 **RAG 语境释义** | 基于上下文生成词汇释义，帮助理解一词多义 |
| 👤 **游客模式** | 无需注册即可浏览文章，体验核心功能 |

### 🛠️ 技术栈

- **前端**: Next.js 16 (App Router) + React 19 + TypeScript
- **样式**: Tailwind CSS + shadcn/ui
- **后端**: Supabase (PostgreSQL + Auth + RLS)
- **AI**: MiniMax API (通过 LangChain)
- **数据验证**: Zod
- **部署**: Vercel

### 🚀 快速开始

#### 前置要求

- Node.js 18+
- pnpm (推荐) 或 npm
- Supabase 账号
- MiniMax API Key

#### 安装步骤

1. **克隆仓库**
   ```bash
   git clone https://github.com/Hongyuan-Lu/Word-bread.git
   cd Word-bread
   ```

2. **安装依赖**
   ```bash
   pnpm install
   ```

3. **配置环境变量**
   ```bash
   cp .env.example .env.local
   ```
   
   编辑 `.env.local`，填入你的配置：
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   MINIMAX_API_KEY=your_minimax_api_key
   CRON_SECRET=your_random_secret
   ```

4. **初始化数据库**
   
   在 Supabase Dashboard 的 SQL Editor 中执行 `supabase/migrations/001_schema.sql`

5. **导入词表**（可选）
   ```bash
   pnpm tsx scripts/import-words.ts
   ```

6. **启动开发服务器**
   ```bash
   pnpm dev
   ```
   
   访问 http://localhost:3000 🎉

### 📁 项目结构

```
word-bread/
├── src/
│   ├── app/                    # Next.js App Router 页面
│   │   ├── api/                # API 路由
│   │   ├── articles/           # 文章列表和详情
│   │   ├── login/              # 登录页面
│   │   ├── onboarding/         # 新用户引导
│   │   ├── settings/           # 用户设置
│   │   └── vocab/              # 我的单词本
│   ├── components/             # React 组件
│   │   └── reader/             # 文章阅读器组件
│   ├── lib/                    # 核心库
│   │   ├── ai/                 # AI 相关 (MiniMax)
│   │   ├── rag/                # RAG 语境释义
│   │   ├── supabase/           # Supabase 客户端
│   │   └── vocab/              # 词汇处理 (分词/词形还原)
│   └── types/                  # TypeScript 类型定义
├── scripts/                    # 工具脚本
├── docs/                       # 项目文档
├── supabase/
│   └── migrations/             # 数据库迁移
└── public/                     # 静态资源
```

### 📝 核心脚本

每日内容生成流水线（北京时间 09:00 自动运行）：

```bash
# 一键执行全部步骤
pnpm tsx scripts/daily-generate.ts

# 或分步执行：
pnpm tsx scripts/cleanup-old-data.ts      # 清理过期数据
pnpm tsx scripts/fetch-news.ts             # 抓取新闻
pnpm tsx scripts/classify-news.ts          # AI 分类
pnpm tsx scripts/select-news.ts            # 选择文章
pnpm tsx scripts/rewrite-news.ts           # AI 改写
pnpm tsx scripts/tokenize-articles.ts      # 词汇标注
pnpm tsx scripts/generate-contextual-glosses.ts  # 生成释义
```

### 🗄️ 数据库表结构

| 表名 | 用途 | 数据保留策略 |
|------|------|-------------|
| `profiles` | 用户配置（学习目标、专业偏好） | 永久保留 |
| `words` | 词表（common/CET4/CET6 词汇及释义） | 永久保留 |
| `user_word_states` | 用户词汇状态（学习计划/较难单词） | 永久保留 |
| `news_candidates` | 原始候选新闻 | 1 天 |
| `articles` | AI 改写后的学习文章 | 7 天 |
| `article_tokens` | 文章的结构化 token | 随 articles 删除 |
| `read_articles` | 用户阅读记录 | 永久保留 |

### 🚢 部署

#### Vercel 部署

1. Fork 本仓库
2. 在 [Vercel](https://vercel.com) 导入项目
3. 配置环境变量
4. 部署

#### 环境变量说明

| 变量名 | 说明 | 是否公开 |
|--------|------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名 Key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务端 Key | ❌ |
| `MINIMAX_API_KEY` | MiniMax API Key | ❌ |
| `CRON_SECRET` | 定时任务密钥 | ❌ |

### 🤝 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详情。

### 📄 许可证

本项目基于 [MIT 许可证](LICENSE) 开源。

---

## English

### 📖 About

WordBread is an innovative English learning tool that automatically rewrites real news articles into study materials suitable for CET4/CET6 learners. Using AI technology and structured vocabulary lists, the system intelligently annotates vocabulary difficulty to help users naturally accumulate exam vocabulary through authentic reading contexts.

### 🌐 Live Demo

🚀 **Try it now**: [https://www.wordbread.xyz](https://www.wordbread.xyz)

- Production: https://word-bread.vercel.app
- Custom domain: https://www.wordbread.xyz

### ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI News Rewriting** | Uses MiniMax API to rewrite real news into CET4/CET6 level articles |
| 📊 **Smart Vocabulary Annotation** | Automatically identifies and highlights exam vocabulary based on structured word lists |
| 📚 **Dual Difficulty Modes** | Supports both CET4 and CET6 learning targets |
| 🎯 **Subject Filtering** | 16 academic disciplines to choose from |
| 💾 **Vocabulary State Management** | Mark known/unknown words with cloud sync |
| 🔍 **RAG Contextual Glosses** | Generate context-aware word definitions |
| 👤 **Guest Mode** | Browse articles without registration |

### 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **AI**: MiniMax API (via LangChain)
- **Validation**: Zod
- **Deployment**: Vercel

### 🚀 Quick Start

#### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Supabase account
- MiniMax API Key

#### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Hongyuan-Lu/Word-bread.git
   cd Word-bread
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your configuration:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   MINIMAX_API_KEY=your_minimax_api_key
   CRON_SECRET=your_random_secret
   ```

4. **Initialize database**
   
   Execute `supabase/migrations/001_schema.sql` in Supabase Dashboard SQL Editor

5. **Import word lists** (optional)
   ```bash
   pnpm tsx scripts/import-words.ts
   ```

6. **Start development server**
   ```bash
   pnpm dev
   ```
   
   Visit http://localhost:3000 🎉

### 📁 Project Structure

```
word-bread/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/                # API routes
│   │   ├── articles/           # Article list and details
│   │   ├── login/              # Login page
│   │   ├── onboarding/         # New user onboarding
│   │   ├── settings/           # User settings
│   │   └── vocab/              # My vocabulary
│   ├── components/             # React components
│   │   └── reader/             # Article reader components
│   ├── lib/                    # Core libraries
│   │   ├── ai/                 # AI related (MiniMax)
│   │   ├── rag/                # RAG contextual glosses
│   │   ├── supabase/           # Supabase client
│   │   └── vocab/              # Vocabulary processing
│   └── types/                  # TypeScript type definitions
├── scripts/                    # Utility scripts
├── docs/                       # Project documentation
├── supabase/
│   └── migrations/             # Database migrations
└── public/                     # Static assets
```

### 📝 Core Scripts

Daily content generation pipeline (runs at 09:00 Beijing time):

```bash
# Execute all steps at once
pnpm tsx scripts/daily-generate.ts

# Or execute step by step:
pnpm tsx scripts/cleanup-old-data.ts      # Clean up old data
pnpm tsx scripts/fetch-news.ts             # Fetch news
pnpm tsx scripts/classify-news.ts          # AI classification
pnpm tsx scripts/select-news.ts            # Select articles
pnpm tsx scripts/rewrite-news.ts           # AI rewriting
pnpm tsx scripts/tokenize-articles.ts      # Vocabulary annotation
pnpm tsx scripts/generate-contextual-glosses.ts  # Generate glosses
```

### 🗄️ Database Schema

| Table | Purpose | Retention Policy |
|-------|---------|------------------|
| `profiles` | User configuration (learning goals, major preferences) | Permanent |
| `words` | Word list (common/CET4/CET6 vocabulary with definitions) | Permanent |
| `user_word_states` | User vocabulary states (study plan/difficult words) | Permanent |
| `news_candidates` | Raw candidate news | 1 day |
| `articles` | AI-rewritten learning articles | 7 days |
| `article_tokens` | Structured article tokens | Cascade with articles |
| `read_articles` | User reading records | Permanent |

### 🚢 Deployment

#### Vercel Deployment

1. Fork this repository
2. Import project in [Vercel](https://vercel.com)
3. Configure environment variables
4. Deploy

#### Environment Variables

| Variable | Description | Public |
|----------|-------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | ❌ |
| `MINIMAX_API_KEY` | MiniMax API Key | ❌ |
| `CRON_SECRET` | Cron job secret | ❌ |

### 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### 📄 License

This project is licensed under the [MIT License](LICENSE).
