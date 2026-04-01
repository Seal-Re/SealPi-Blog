# SealPi-Blog v1 本次开发执行清单

本文档用于承接当前这一轮开发实施，聚焦已确认但尚未闭环的内容链路，并将大计划拆成可逐项执行、可验收、可回写状态的任务。

## 1. 本轮开发范围

结合当前实现进度，本轮优先推进以下 6 项：

1. 梳理并补齐标签数据契约
2. 标签体系动态化
3. 前台文章标签展示改为真实数据
4. Excalidraw 图片上传链路接入
5. 后台与前台计划态文案清理
6. 补齐关键回归验证

---

## 2. 执行顺序与检查清单

### 任务 1：梳理并补齐标签数据契约

- [x] 确认后端已提供按文章分页查询能力，但未提供独立标签列表接口；前端当前通过文章分页结果聚合标签
- [x] 对照 [`tailwind-nextjs-starter-blog-sealpi/lib/public-blog-api.ts`](tailwind-nextjs-starter-blog-sealpi/lib/public-blog-api.ts) 与 [`tailwind-nextjs-starter-blog-sealpi/lib/blog-api-types.ts`](tailwind-nextjs-starter-blog-sealpi/lib/blog-api-types.ts) 明确前端需要的字段结构
- [x] 确认现有前端适配层已统一输出标签名、标签数量、标签 URL slug，但标签聚合范围仍受单页分页结果限制
- [x] 明确标签命名规范：展示名称保留原始大小写；URL slug 使用 [`slug()`](tailwind-nextjs-starter-blog-sealpi/lib/public-blog-api.ts:64) 生成；空白标签过滤；同 slug 标签按聚合计数合并

- **完成标准**
  - 前端已能通过统一的数据结构消费标签列表与标签筛选结果。

### 任务 2：完成标签页动态化【DONE】

- [x] [`tailwind-nextjs-starter-blog-sealpi/app/tags/page.tsx`](tailwind-nextjs-starter-blog-sealpi/app/tags/page.tsx) 已改为依赖 [`fetchPublishedTags()`](tailwind-nextjs-starter-blog-sealpi/lib/public-blog-api.ts:137)，不再读取静态 [`tailwind-nextjs-starter-blog-sealpi/app/tag-data.json`](tailwind-nextjs-starter-blog-sealpi/app/tag-data.json)
- [x] 改造标签详情分页页，避免继续通过 [`fetchPublishedArticlesForStaticPaths()`](tailwind-nextjs-starter-blog-sealpi/lib/public-blog-api.ts:133) 全量拉取后前端过滤
- [x] 为标签为空、接口失败、标签不存在等场景补充兜底展示（标签总表可用时不存在标签走 `notFound`，不可用时回退当前标签分页并展示“数据暂不可用”提示）
- [x] 评估 [`tailwind-nextjs-starter-blog-sealpi/app/tag-data.json`](tailwind-nextjs-starter-blog-sealpi/app/tag-data.json) 保留策略：当前作为历史静态链路兼容数据保留，但前台 `app/tags/**` 已不再引用

- **完成标准**
  - 标签列表页与标签文章列表页均由后端数据驱动，增删标签后页面展示同步更新。

### 任务 3：修正文章详情页标签展示

- [x] 已确认 [`tailwind-nextjs-starter-blog-sealpi/app/blog/[...slug]/page.tsx`](tailwind-nextjs-starter-blog-sealpi/app/blog/[...slug]/page.tsx) 当前未使用硬编码标签数组
- [x] 已确认文章详情页标签使用文章真实 `tags` 字段映射输出
- [x] 已确认标签为空时会回传空数组，不会主动构造演示标签
- [x] 已确认文章详情页的 Open Graph、摘要、封面逻辑与标签映射解耦，不受本项影响

- **完成标准**
  - 任意文章详情页展示的标签与后端文章数据一致，不再出现写死的演示标签。

### 任务 4：接入 Excalidraw 图片上传能力【DONE】

- [x] 审查 [`tailwind-nextjs-starter-blog-sealpi/components/admin/AdminEditorClient.tsx`](tailwind-nextjs-starter-blog-sealpi/components/admin/AdminEditorClient.tsx) 当前图片处理链路
- [x] 接入 [`tailwind-nextjs-starter-blog-sealpi/lib/admin-api.ts`](tailwind-nextjs-starter-blog-sealpi/lib/admin-api.ts) 中的上传方法，打通前端到 [`sealpi-blog/blog-adapter/src/main/java/com/seal/blog/adapter/upload/AdminUploadController.java`](sealpi-blog/blog-adapter/src/main/java/com/seal/blog/adapter/upload/AdminUploadController.java) 的调用
- [x] 将编辑器中的图片资源从内联 Base64 调整为上传后 URL 引用（提交前统一上传并回写 `files[fileId].dataURL`）
- [x] 为上传失败、超大图片、重复提交增加用户提示或保护逻辑（体积上限、状态提示、按钮禁用、错误反馈）
- [x] 增加提交前校验：若仍检测到大段内联图片数据则阻止提交并提示

- **完成标准**
  - 编辑器新增图片后可自动上传并在文章数据中保留 URL 引用，保存与发布链路可正常工作。

### 任务 5：清理计划态文案与入口说明【DONE】

- [x] 审视 [`tailwind-nextjs-starter-blog-sealpi/app/admin/page.tsx`](tailwind-nextjs-starter-blog-sealpi/app/admin/page.tsx) 中已过时的“下一步接入”描述
- [x] 审视 [`tailwind-nextjs-starter-blog-sealpi/app/admin/articles/page.tsx`](tailwind-nextjs-starter-blog-sealpi/app/admin/articles/page.tsx) 中与当前实现不一致的占位文案
- [x] 补充更准确的当前状态说明，避免后台页面继续传递“尚未实现”的错误认知
- [x] 复核前台相关页面文案，未发现与当前能力明显冲突的计划态提示

- **完成标准**
  - 页面文案与当前真实功能状态一致，不再保留误导性的计划态描述。

### 任务 6：补齐最小验证闭环【DONE】

- [x] 为标签动态化链路补充至少一组可重复验证步骤
- [x] 为编辑器图片上传链路补充至少一组可重复验证步骤
- [x] 复用现有前端 lint 作为最小自动化断言，验证相关目录代码质量
- [x] 将验证结果回写到开发记录，便于后续继续推进文档中的其他任务

- **完成标准**
  - 本轮改动具备最小回归保障，后续继续开发时可快速确认关键链路未被破坏。

---

## 3. 推荐开发顺序

建议按以下顺序推进：

1. 先完成标签契约梳理与标签页动态化
2. 再修正文章详情页标签展示
3. 然后接入 Excalidraw 图片上传链路
4. 随后清理后台/前台计划态文案
5. 最后补回归验证并更新文档状态

这样可以先闭合“读链路”，再处理“写链路”，最后做文案与验证收尾，回归成本最低。

---

## 3.1 本轮最小验证记录（已执行）

### 标签动态化链路

1. 访问 `/tags`，确认标签列表由后端聚合结果渲染（无 `tag-data.json` 读取依赖）。
2. 访问 `/tags/{tag}` 与 `/tags/{tag}/page/2`，确认分页结果来自接口查询而非全量预取过滤。
3. 人工构造两类场景：
   - 标签总表可用且标签不存在：返回 `notFound`；
   - 标签总表暂不可用：页面回退为当前标签分页并展示“标签数据暂不可用”提示。

### 编辑器图片上传链路

1. 在 `/admin/editor` 粘贴或绘制含图片内容后执行“保存草稿/直接发布”。
2. 提交阶段校验前端行为：
   - 自动调用 `/api/v1/admin/upload` 上传内联图片；
   - 将 `fileId -> url` 回写至 Excalidraw `files`；
   - 超过上限时提示并阻止提交。
3. 关注提交后的 `draftJson`，确认无大段内联图片数据（命中保护会直接报错中断）。

### 自动化断言（本轮）

已执行：

```bat
cd tailwind-nextjs-starter-blog-sealpi
npm run lint -- --dir app/tags --dir app/admin --dir components/admin --dir lib
```

结果：

- `No ESLint warnings or errors`

---

## 4. 文档状态维护规则

- 执行中的大项，需要在 [`docs/v1/implementation-plan.md`](docs/v1/implementation-plan.md) 对应标题后添加 `【working】`
- 具体开发完成后，再将对应标题更新为 `【DONE】`
- 若本轮仅覆盖部分子项，不应提前把整个阶段标记为完成

---

## 5. 本轮对应计划映射

本轮执行清单主要对应以下原始计划条目：

- 阶段 B / B-2 Excalidraw 图片外置与 JSON 优化
- 阶段 B / B-3 列表 / 首页 / 详情接口统一（动态内容源）
- 阶段 B / B-4 标签体系动态化
- 阶段 D / D-1 自动化测试（单元 / 集成 / E2E）
