package com.seal.blog.start.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import java.util.concurrent.TimeUnit;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Caffeine cache configuration for read-heavy public endpoints.
 *
 * <p>Caches:
 * <ul>
 *   <li>{@code articleList} — paginated public article list. TTL 60s, max 500
 *       entries (one per pageIndex/pageSize/tag combo).</li>
 *   <li>{@code articleTags} — tag list with counts. TTL 60s, max 1 entry.</li>
 * </ul>
 *
 * <p>Cache invalidation: any article create/update/delete/publish/offline/
 * archive evicts both caches via {@code @CacheEvict(allEntries = true)}.
 *
 * <p>NOT cached:
 * <ul>
 *   <li>Admin-mode list queries (filtered by keyword, draft state, etc.) —
 *       low cache-hit rate, high staleness risk.</li>
 *   <li>Single-article detail lookups — already cheap, infrequent compared
 *       to list traffic.</li>
 *   <li>View count writes — pass through directly.</li>
 * </ul>
 */
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager mgr = new CaffeineCacheManager("articleList", "articleTags");
        mgr.setCaffeine(Caffeine.newBuilder()
                .maximumSize(500)
                .expireAfterWrite(60, TimeUnit.SECONDS)
                .recordStats());
        return mgr;
    }
}
