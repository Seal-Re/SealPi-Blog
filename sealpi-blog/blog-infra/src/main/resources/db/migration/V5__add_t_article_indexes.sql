-- V5: indexes to support published-list and adjacent-article queries.
--
-- t_article had only PK + UNIQUE(url). Every list / RSS / adjacent
-- query did filesort over the table:
--   WHERE draft = 1 ORDER BY date DESC
--   COUNT(*) WHERE draft = 1
--
-- Composite (draft, date DESC) covers WHERE + ORDER together; secondary
-- (date DESC) covers tag-filtered lists where draft predicate is dropped
-- and admin queries that don't filter by status.

-- MySQL 8.0+ supports DESC indexes natively.
CREATE INDEX idx_article_draft_date ON t_article (draft, date DESC);
CREATE INDEX idx_article_date ON t_article (date DESC);
