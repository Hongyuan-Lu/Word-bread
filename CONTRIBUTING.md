# 🤝 贡献指南

感谢你对 WordBread 项目的关注！我们欢迎各种形式的贡献。

## 📋 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发流程](#开发流程)
- [提交规范](#提交规范)
- [问题反馈](#问题反馈)

## 行为准则

请尊重所有参与者，保持友善和专业的态度。我们致力于为每个人提供无骚扰的体验。

## 如何贡献

### 报告 Bug

1. 检查 [Issues](https://github.com/Hongyuan-Lu/Word-bread/issues) 确保问题未被报告
2. 创建新 Issue，包含：
   - 清晰的标题和描述
   - 复现步骤
   - 预期行为 vs 实际行为
   - 环境信息（浏览器、Node.js 版本等）

### 建议新功能

1. 在 Issues 中创建功能请求
2. 描述用例和预期效果
3. 等待讨论和确认

### 提交代码

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'feat: add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 创建 Pull Request

## 开发流程

### 环境设置

```bash
# 克隆你的 Fork
git clone https://github.com/your-username/Word-bread.git
cd Word-bread

# 安装依赖
pnpm install

# 复制环境变量
cp .env.example .env.local

# 配置 .env.local 后启动开发
pnpm dev
```

### 代码规范

- 使用 TypeScript 编写所有代码
- 遵循 ESLint 规则
- 组件使用函数式组件 + Hooks
- 保持代码简洁，添加必要注释

### 测试

提交前请确保：

```bash
# 代码检查通过
pnpm lint

# 构建成功
pnpm build
```

## 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `style` | 代码格式（不影响功能） |
| `refactor` | 重构 |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具链相关 |

### 示例

```
feat(reader): add CET4/CET6 mode switch

- Add mode toggle button in article reader
- Update token rendering based on selected mode
- Persist user preference in profile

Closes #123
```

## 项目架构要点

### 词汇等级判断规则

⚠️ **重要原则**: 词汇等级必须由 `words` 表确定，AI 不能判断 CET4/CET6 等级。

- `common`: 基础词汇，Level 0
- `CET4`: 四级词汇，根据用户目标显示 Level 1 或 Level 2
- `CET6`: 六级词汇，根据用户目标显示 Level 1 或 Level 2
- `out_of_syllabus`: 超纲词汇，Level 2

### Reader 渲染规则

- 必须基于结构化 token 渲染
- 禁止使用 `dangerouslySetInnerHTML`
- 禁止直接渲染 AI 生成的 HTML

### 安全规则

- 敏感 Key 只能在服务端使用
- API 路由必须验证用户身份
- 使用 RLS 保护数据

## 问题反馈

如有疑问，欢迎：

- 提交 [Issue](https://github.com/Hongyuan-Lu/Word-bread/issues)
- 发起 [Discussion](https://github.com/Hongyuan-Lu/Word-bread/discussions)

## 许可证

贡献即表示你同意你的代码将在 [MIT 许可证](LICENSE) 下发布。
