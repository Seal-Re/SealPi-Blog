# 后端性能调优 TODO

审计时间: 2026-05-03
源数据: `test/k6/results/PERF-20260503-192435.md`

## 真实拐点 (k6 实测)

| 并发 | 总 p95 | list p95 | detail p95 | 失败率 |
|----:|------:|---------:|-----------:|-------:|
| 1 (smoke) | 407ms | 401ms | 504ms | 0% |
| 20 (load 5min, 14714 reqs @ 49 r/s) | 472ms | 437ms | 554ms | 0% |
| **100 (stress abort)** | **1181ms** | **1315ms ❌** | 1016ms | 0% |
| 100 (spike burst) | 1394ms | 1674ms | 1085ms | 0% |

**瓶颈端点: `GET /api/v1/articles`** — 100 VU 时 p95 翻 3 倍, 其他端点尚可控。0% 失败 → 不崩, 只长尾。

---

## #1 [高] list SQL 拉 4 个 LONGTEXT 列, 上层再丢

**源码事实**:
- `blog-infra/.../impl/ArticleGatewayImpl.java:178` — `articleMapper.selectPage(pageRequest, queryWrapper)` 走 MyBatis-Plus `BaseMapper`, **默认 SELECT \***
- `blog-infra/.../po/ArticlePO.java:39-47` — PO 包含 4 个 LONGTEXT 字段:
  ```
  contentJson, draftJson, bodyMd, draftBodyMd
  ```
- `blog-app/.../assembler/ArticleAssembler.java:84-89` — `toPublicPageResponse` **加载完才把 bodyMd / contentJson 置 null**:
  ```java
  ArticleVO vo = toPublicVO(article);
  if (vo != null) {
      vo.setBodyMd(null);
      vo.setContentJson(null);
  }
  ```
  字段已经从磁盘读出 + 网络回传 + 反序列化, 应用层 set null 救不回来。

**真实代价** (推算):
- 4 LONGTEXT × 10 行 / 请求, 即便每篇仅 50KB Markdown + 100KB Excalidraw JSON, 单请求 ~6MB 行数据, 100 VU = 600MB/s 库回带宽
- list p95 翻 3 倍 (437→1315ms) 与 detail (504→1016ms, +100%) 对比, list 增长更陡 — 数据量是关键变量

**修法**:
```java
// ArticleGatewayImpl.PageQuery, line 148 之后
queryWrapper.select(
    ArticlePO::getArticleId,
    ArticlePO::getTitle,
    ArticlePO::getDate,
    ArticlePO::getLastmod,
    ArticlePO::getSummary,
    ArticlePO::getUrl,
    ArticlePO::getCoverImageUrl,
    ArticlePO::getCoverCaption,
    ArticlePO::getViewCount,
    ArticlePO::getDraft,
    ArticlePO::getCount
);
```
明确选列, 排除 4 个 LONGTEXT。`bodyMd` 单独留给 `findById`/`findBySlug` (详情接口需要)。

**预期收益**: list p95 降回接近 detail (~500ms @ 100 VU), 拐点上移到 200+ VU。

---

## #2 [高] t_article 无 (draft, date) 索引, 列表 ORDER BY 走 filesort

**源码事实**:
- `blog-infra/.../db/migration/V0__init_schema.sql:6-16` — `t_article` 仅:
  ```sql
  PRIMARY KEY (article_id)
  UNIQUE KEY uk_t_article_url (url)
  ```
- `V1__alter_t_article_add_v1_content_fields.sql` 仅加列, 无新索引
- `V3__alter_t_article_add_workbook_fields.sql` 同上
- `ArticleGatewayImpl.java:160-173` — list 实际 WHERE: `draft = 1` + `ORDER BY date DESC`
- `ArticleGatewayImpl.java:178` — MyBatis-Plus `selectPage` 触发 `SELECT COUNT(*) WHERE draft=1` + `SELECT ... ORDER BY date DESC LIMIT`

**真实代价**:
- COUNT 查询全表扫 t_article (无 draft 索引)
- 主查询全表扫后 filesort
- 当前数据 4 篇影响小; 100 篇时 filesort 耗时陡增, 100 VU 并发 → MySQL CPU 打满

**修法 (新建 V5 迁移)**:
```sql
-- V5__add_t_article_indexes.sql
CREATE INDEX idx_article_draft_date ON t_article (draft, date DESC);
CREATE INDEX idx_article_date ON t_article (date DESC);  -- 备用: 无 draft 过滤的查询
```

**为何复合 (draft, date)**:
- list/RSS 都是 `WHERE draft=1 ORDER BY date DESC`, 复合索引同时覆盖 WHERE + ORDER
- `findPrevPublished`/`findNextPublished` (`ArticleGatewayImpl.java:269-310`) 也是 `draft=1` + `date` 比较, 同索引收益
- `count_by_status` (`ArticleGatewayImpl.java:202-209`) 索引覆盖 COUNT

---

## #3 [中] 无任何 Caffeine / Spring Cache 基础设施

**源码事实**:
- `grep "caffeine\|spring-boot-starter-cache" sealpi-blog/*/pom.xml` → 0 命中
- `grep "@EnableCaching\|@Cacheable" blog-{app,adapter,start}/src` → 0 命中
- 列表内容变更稀疏 (publish/offline 事件触发, 阅读量除外)

**真实代价**:
- 49 r/s 持续负载 (load 测) 全部 hit DB, 无任何缓存
- 同请求 (page=1) 重复 fetch, 浪费 #1/#2 优化空间

**修法**:

a) `blog-start/pom.xml` 加依赖:
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-cache</artifactId>
</dependency>
<dependency>
    <groupId>com.github.ben-manes.caffeine</groupId>
    <artifactId>caffeine</artifactId>
</dependency>
```

b) `BlogStartApplication` 加 `@EnableCaching`, 配 CacheManager:
```java
@Bean
public CacheManager cacheManager() {
    CaffeineCacheManager mgr = new CaffeineCacheManager("articleList", "articleDetail", "tags");
    mgr.setCaffeine(Caffeine.newBuilder()
        .maximumSize(500)
        .expireAfterWrite(Duration.ofSeconds(60)));
    return mgr;
}
```

c) `ArticleServiceImpl.getPage` 加 `@Cacheable`:
```java
@Cacheable(cacheNames = "articleList",
    key = "#qry.pageIndex + ':' + #qry.pageSize + ':' + (#qry.tagId != null ? #qry.tagId : '') + ':' + (#qry.tag != null ? #qry.tag : '')",
    condition = "#qry.keyword == null && #qry.q == null")
public PageResponse<ArticleVO> getPage(ArticlePageQry qry) { ... }
```
**条件**: 跳过有 keyword 的查询 (搜索结果命中率低)。

d) 缓存清理 — `ArticleServiceImpl.create/update/publish/offline/archive/delete` 加:
```java
@CacheEvict(cacheNames = {"articleList", "tags"}, allEntries = true)
@CacheEvict(cacheNames = "articleDetail", key = "#articleId")
```

**预期收益**: TTL 60s, 列表查询 ~98% 命中 (假设每分钟 ≤1 篇文章变更), DB 流量降 50× 以上。

**为何放第三**: 缓存掩盖性能问题, 不解决根因。优先级在 #1 #2 之后。

---

## #4 [低] 阅读量自增是同步 UPDATE, 无批写

**源码事实**:
- `ArticleGatewayImpl.java:97-105`:
  ```java
  public void incrementViewCount(Integer articleId) {
      ...
      wrapper.eq(ArticlePO::getArticleId, articleId)
             .setSql("view_count = COALESCE(view_count, 0) + 1");
      articleMapper.update(null, wrapper);
  }
  ```
- 每次 `POST /api/v1/articles/{id}/view` 触发一次 SQL UPDATE
- 当前权重 5%, 100 VU 测 view 端点 p95=564ms 尚可控

**真实代价**:
- view 端点本身指标 OK (load 时 414ms / stress 时 564ms)
- 但每个 UPDATE 持锁该行 + 触发 #3 的列表缓存失效 (如 #3 落地后)

**修法 (做完 #1-#3 再评估)**:
- 短期: view 单独不缓存, 不在 list 缓存的 evict 范围 (view_count 不影响列表排序, 排序按 date)
- 中期: ConcurrentHashMap 累计 + 定时 flush (LongAdder), 1 秒批写一次

---

## 已被实测排除的"伪瓶颈"

### N+1 加载 tags
**误认为有问题, 实际已批量**:
- `ArticleGatewayImpl.java:184-190` — 列表查询完后, `loadTagsForArticles(resultIds)` 一次拿全部 tags:
  ```java
  Map<Integer, List<Tag>> tagsMap = loadTagsForArticles(resultIds);
  entities.forEach(a -> a.withTags(tagsMap.getOrDefault(...)));
  ```
- `loadTagsForArticles` (line 363-398) 仅 2 条 SQL: `t_rely WHERE article_id IN (...)` + `t_tag WHERE tag_id IN (...)`
- 即 10 文章列表 = 1 主查询 + 1 rely + 1 tag = **3 SQL 总**, 非 N+1

不需要修。

---

## 调优顺序

1. **#1 SELECT 列裁剪** (1 个文件, 几行代码, 无需迁移) → 跑 stress, 看拐点是否上移
2. **#2 加 (draft, date) 索引** (1 个 SQL 迁移) → 跑 stress, 看拐点是否再上移
3. **#3 Caffeine 缓存** (依赖 + 配置 + 注解) → 跑 load, 看 DB 流量降多少
4. **重测确认**: `pwsh test/k6/scripts/run-all.ps1 -MaxVu 500` + `pwsh test/k6/scripts/gen-report.ps1`, 与本文档头部表对比

每步独立提交, 失败可单独 revert。
