# =============================================================================
# SealPi-Blog — Next.js 前端容器
# 两阶段构建：builder（依赖安装 + next build）→ runner（最小运行时镜像）
# =============================================================================

# ---- Stage 1: Install deps + build ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies first (separate layer, cache-friendly)
COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile

# Copy source
COPY . .

# ---------------------------------------------------------------------------
# Build-time env vars
#
# NEXT_PUBLIC_* 变量在 next build 时被烘焙进 JS bundle，必须在此提供。
# 其余 SECRET 类变量在运行时通过容器 environment 注入，此处填占位值供
# next build 通过类型检查。运行时的真实值会覆盖这些占位。
# ---------------------------------------------------------------------------
ARG NEXT_PUBLIC_BLOG_API_BASE_URL=http://localhost:13310
ARG MINIO_PUBLIC_HOSTNAME=localhost
# Secrets — placeholder values here, overridden at runtime via docker-compose env
ARG AUTH_SECRET=build-placeholder-not-used-at-runtime
ARG ADMIN_JWT_SECRET=build-placeholder-not-used-at-runtime
ARG ADMIN_GITHUB_USERIDS=0
ARG BLOG_INTERNAL_SYNC_SECRET=build-placeholder-not-used-at-runtime

ENV NEXT_PUBLIC_BLOG_API_BASE_URL=$NEXT_PUBLIC_BLOG_API_BASE_URL
ENV MINIO_PUBLIC_HOSTNAME=$MINIO_PUBLIC_HOSTNAME
ENV AUTH_SECRET=$AUTH_SECRET
ENV ADMIN_JWT_SECRET=$ADMIN_JWT_SECRET
ENV ADMIN_GITHUB_USERIDS=$ADMIN_GITHUB_USERIDS
ENV BLOG_INTERNAL_SYNC_SECRET=$BLOG_INTERNAL_SYNC_SECRET

# next build (skips postbuild RSS which relies on contentlayer static MDX)
RUN npx next build

# ---- Stage 2: Minimal runtime image ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Non-root user
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Static assets
COPY --from=builder /app/public ./public

# Built output + runtime config
COPY --from=builder --chown=nextjs:nodejs /app/.next        ./.next
COPY --from=builder /app/node_modules                       ./node_modules
COPY --from=builder /app/package.json                       ./package.json
COPY --from=builder /app/next.config.js                     ./next.config.js
COPY --from=builder /app/data                               ./data

USER nextjs
EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
