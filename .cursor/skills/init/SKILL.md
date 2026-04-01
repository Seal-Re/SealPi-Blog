---
name: init
description: Build a basic understanding of the current project by scanning source code and available docs. Use when user asks for /init, project onboarding, quick repo familiarization, or initial architecture context.
---

# Init

## Goal

快速读取当前目录项目源码与文档，建立可执行的“基础认知”，并给出后续可行动的切入点。

## Workflow

1. 建立项目轮廓：
   - 列出顶层目录与关键文件（如 `README*`、`docs/**`、`package.json`、`pyproject.toml`、`pom.xml`、`docker-compose*`）。
   - 识别主语言与构建/运行方式。

2. 读取文档优先：
   - 优先阅读 `README*`、`docs/**`、架构说明、部署说明、API 文档。
   - 提取：项目目标、模块划分、运行依赖、主要流程、已知约束。

3. 读取核心源码：
   - 按入口优先级读取：启动文件、路由层、核心服务层、数据访问层、任务编排层。
   - 识别关键实体：核心模块、主数据流、外部依赖、配置来源（环境变量/配置文件）。

4. 交叉验证：
   - 对照“文档声明”与“源码实现”是否一致。
   - 标注不确定项与需要进一步确认的点。

5. 输出初始化结论：
   - 用简洁结构输出“你已掌握的项目基础信息”。
   - 明确下一步建议（如先跑哪个服务、先看哪组模块、先补哪些文档）。

## Output Format

按以下结构输出：

```markdown
## 项目初始化概览
- 项目用途：
- 技术栈：
- 主要模块：
- 运行方式（开发/测试）：

## 核心流程（高层）
1.
2.
3.

## 关键文件与目录
- `path/to/file-or-dir`: 作用

## 文档与实现一致性
- 一致：
- 可能不一致/待确认：

## 建议下一步
- 先执行：
- 重点阅读：
- 风险或阻塞项：
```

## Constraints

- 先广后深：先覆盖全局再深入局部。
- 默认优先使用仓库内现有文档与源码事实，不臆测不存在的架构。
- 如信息不足，明确说明“已知/未知”边界，不把猜测当结论。
- 输出控制在“能指导下一步行动”的粒度，避免冗长背景科普。
