# SealPi-Blog v1 验收 Runbook（可执行版）

> 目标：让验收人员“不看代码也能验收”，每一项都有明确操作与预期结果。

## 1. 环境准备

### 1.1 启动依赖服务（MySQL / MinIO / 后端）
在仓库根目录：

- 执行：`./start-local-test.ps1`
- 预期：
  - MySQL 端口可用（默认 `13307`）
  - MinIO 可访问（默认 `13308/13309`）
  - 后端可访问（默认 `13310`）

### 1.2 启动前端
进入 `tailwind-nextjs-starter-blog-sealpi/`：

- 执行：`npm run dev`（或项目约定的启动脚本）
- 预期：浏览器打开首页可渲染。

## 2. API 冒烟（curl）

### 2.1 公共文章分页
- 请求：`GET /api/v1/articles?pageIndex=1&pageSize=5`
- 预期：
  - HTTP 200
  - 返回结构包含 `data[]/totalCount/pageIndex/pageSize`

### 2.2 Slug 详情
- 前置：从分页结果任选一个 `url`（slug）
- 请求：`GET /api/v1/articles/slug/{slug}`
- 预期：
  - HTTP 200
  - 返回结构包含 `data.contentJson` 或 `data.draftJson`

## 3. 前台验收（动态内容）

### 3.1 首页（动态源）
- 打开：`/`
- 预期：
  - 展示最新文章列表
  - 列表项包含标题、摘要、日期、标签
  - 若存在封面，卡片可展示封面图

### 3.2 列表页与分页
- 打开：`/blog`
- 预期：分页正常、跳转正常
- 打开：`/blog/page/2`（若总页数 ≥ 2）
- 预期：可正确渲染下一页

### 3.3 详情页与 SEO
- 打开：`/blog/{slug}`
- 预期：
  - Excalidraw Viewer 正常渲染
  - 查看页面源代码（或 DevTools -> Elements）：
    - `og:image` 优先使用文章 `coverImageUrl`

## 4. Admin 验收（草稿、发布、资产治理）

### 4.1 登录与权限
- 打开：`/admin/login`
- 预期：能走 GitHub 登录
- 打开：`/admin`
- 预期：非管理员进入会被阻断并提示无权限

### 4.2 新建文章草稿分流
- 前置：系统中已有至少 1 篇草稿（`/admin/articles?status=draft` 可看到）
- 操作：点击“新建文章”
- 预期：弹窗提示“您有 N 篇未完成的草稿”，并提供：
  - 进入草稿箱
  - 创建新文章

### 4.3 编辑器 Rehydration（草稿回显）
- 操作：从草稿箱打开任意草稿进入编辑器
- 预期：
  - 标题/摘要/封面 URL 回显正确
  - 画布内容与上次编辑一致

### 4.4 草稿宽校验
- 操作：清空标题，仅编辑画布（加一个元素），等待自动保存或手动保存
- 预期：
  - 保存成功
  - 页面提示“最近保存于 HH:mm”

### 4.5 发布严校验
- 操作：标题为空或画布为空时点击“直接发布”
- 预期：
  - 阻断发布
  - 高亮提示缺失项

### 4.6 图片资产治理（禁止 Base64 内联）
- 操作：在编辑器粘贴/拖拽图片，触发保存
- 预期：
  - 保存/发布成功
  - 文章 JSON 中不再出现大段 `data:image/...;base64`
  - 失败时出现 Toast/Snackbar（不白屏）

### 4.7 发布封面兜底
- 操作：发布文章（无需手填封面 URL）
- 预期：
  - 后端保存 `coverImageUrl`
  - 前台列表卡片可展示封面
  - 详情页 `og:image` 使用封面

## 5. 后台列表页操作（删除/下线）

### 5.1 状态筛选
- 打开：`/admin/articles`
- 操作：切换筛选为“草稿/发布”
- 预期：列表结果随筛选变化

### 5.2 一键下线
- 前置：存在已发布文章
- 操作：点击“下线”
- 预期：
  - 按钮 loading，避免重复点击
  - 成功后该文章状态变为草稿

### 5.3 一键删除
- 操作：点击“删除”，确认弹窗
- 预期：
  - 成功后列表刷新
  - 失败时 Toast 提示错误原因

## 6. 封板前回归命令

### 6.1 前端
`cd tailwind-nextjs-starter-blog-sealpi && npm run lint -- --dir app --dir components --dir layouts --dir lib`

### 6.2 后端
`cd sealpi-blog && mvn -pl blog-client,blog-domain,blog-app,blog-adapter test -DskipITs`

