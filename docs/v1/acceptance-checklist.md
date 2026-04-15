# SealPi-Blog v1 验收清单

## 0. 预检查
- [ ] 已配置 `.env.backend.local` 与前端 `.env`，关键密钥非空（`ADMIN_JWT_SECRET`、`AUTH_SECRET`、`BLOG_INTERNAL_SYNC_SECRET`）。
- [ ] 后端服务可访问：`/api/v1/articles` 返回 200。
- [ ] 前端可访问：`/`、`/blog`、`/admin/login`。

## 1. 前台动态内容链路
- [ ] 首页 `/` 显示动态文章，不依赖本地 MDX 才能看到内容。
- [ ] 列表页 `/blog` 与分页 `/blog/page/{n}` 可正常翻页。
- [ ] 详情页 `/blog/{slug}` 正常渲染 Excalidraw 内容。
- [ ] `og:image` 为文章封面（未配置时回退站点默认图）。
- [ ] 列表卡片可展示 `coverImageUrl`。

## 2. Admin 编辑器资产治理
- [ ] 在编辑器粘贴/拖拽图片后，保存草稿不报错。
- [ ] 提交后数据库中的 `draftJson/contentJson` 不出现大段 `data:image/...;base64`。
- [ ] 上传失败时出现友好错误提示（Toast/Snackbar）。

## 3. 草稿与发布业务规则
- [ ] 点击“新建文章”且存在草稿时，弹出“进入草稿箱 / 创建新文章”分流提示。
- [ ] 草稿箱打开旧草稿后，标题/摘要/封面/画布完整回显。
- [ ] 保存草稿（宽校验）：标题可空，能够保存成功。
- [ ] 发布（严校验）：标题或正文空时阻断发布并高亮提示。
- [ ] 发布成功后，详情页可见最新内容。

## 4. 后台管理页交互
- [ ] `/admin/articles` 可按状态筛选：全部 / 草稿 / 已发布。
- [ ] “删除”操作可执行，且有 loading 与结果提示。
- [ ] “下线”操作可执行，发布态文章可切回草稿态。
- [ ] 接口 403/5xx 时页面不白屏，出现可读错误提示。

## 5. 可用性与快捷操作
- [ ] 编辑器自动保存生效，显示“最近保存于 HH:mm”。
- [ ] `Ctrl+S` / `Cmd+S` 可触发保存草稿。
- [ ] 保存/发布/上传按钮在请求中会禁用，防止重复点击。

## 6. 回归命令（建议封板前执行）
- [ ] 前端 Lint  
  `cd tailwind-nextjs-starter-blog-sealpi && npm run lint -- --dir app --dir components --dir layouts --dir lib`
- [ ] 后端模块测试  
  `cd sealpi-blog && mvn -pl blog-client,blog-domain,blog-app,blog-adapter test -DskipITs`
- [ ] 后端模块编译（可选）  
  `cd sealpi-blog && mvn -pl blog-client,blog-domain,blog-app,blog-adapter -DskipTests compile`

## 7. 发布门禁（Go/No-Go）
- [ ] 上述所有勾选项通过。
- [ ] 新增/变更接口已同步到团队文档。
- [ ] 回滚路径已确认（恢复上一版本前后端镜像与配置）。
