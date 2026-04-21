# 生产部署 Runbook

域名: `blog.sealpi.cn`
服务器: `sealpi.cn`（root，22 端口）
部署目录: `/opt/sealpi-blog`
镜像仓库: `ghcr.io/seal-re/sealpi-blog-{backend,frontend}`
模式: A（env 常驻服务器，CI 不写入）
触发: push 到 `main` 自动部署

## 架构

```
浏览器 ─► blog.sealpi.cn:443 (已有 nginx + TLS)
                    │
                    ├─► /            → 127.0.0.1:13311 (Next.js)
                    ├─► /api/        → 127.0.0.1:13310 (Spring Boot)
                    └─► /minio/      → 127.0.0.1:13308 (MinIO 公开读桶)

内部 docker network:
    frontend → http://blog-start:8080 (SSR / BFF)
    blog-start → http://mysql:3306 + http://minio:9000
```

所有应用端口绑定 `127.0.0.1`，只能通过 nginx 对外，避免直接明文暴露。

---

## 一次性服务器初始化

### 1. 创建部署目录
```bash
mkdir -p /opt/sealpi-blog
cd /opt/sealpi-blog
```

### 2. 放置 env 文件（Mode A 关键步骤）

在本地把 `.env.backend.local` scp 到服务器：
```powershell
scp -i C:\Users\seal\Downloads\pentest.pem `
    D:\AgentWorkStation\SealPi-Blog\.env.backend.local `
    root@sealpi.cn:/opt/sealpi-blog/.env.backend.local
```

**生产值需要调整的 key**（登录服务器后 `nano /opt/sealpi-blog/.env.backend.local`）:
```
AUTH_URL=https://blog.sealpi.cn
NEXT_PUBLIC_BLOG_API_BASE_URL=https://blog.sealpi.cn
MINIO_PUBLIC_HOSTNAME=blog.sealpi.cn
MINIO_PUBLIC_BASE_URL=https://blog.sealpi.cn/minio/blog-assets
ADMIN_AUTH_ALLOW_LEGACY_JWT=true
```

GitHub OAuth App 的 Authorization callback URL 需设为:
```
https://blog.sealpi.cn/api/auth/callback/github
```

### 3. 配置 nginx（保留原有配置，追加 blog.sealpi.cn server 块）

`/etc/nginx/sites-available/blog.sealpi.cn`:
```nginx
server {
    listen 80;
    server_name blog.sealpi.cn;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name blog.sealpi.cn;

    # TLS (用你现有证书方案，例如 certbot)
    ssl_certificate     /etc/letsencrypt/live/blog.sealpi.cn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/blog.sealpi.cn/privkey.pem;

    # 允许上传大文件（画板 PNG + 内嵌图）
    client_max_body_size 20m;

    # Next.js 前端
    location / {
        proxy_pass http://127.0.0.1:13311;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Spring Boot 后端 API
    location /api/ {
        proxy_pass http://127.0.0.1:13310;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # MinIO 公开读桶（文章封面图、内嵌图）
    location /minio/ {
        rewrite ^/minio/(.*)$ /$1 break;
        proxy_pass http://127.0.0.1:13308;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_hide_header Server;
        # 静态资源长缓存
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

证书签发（首次）:
```bash
certbot --nginx -d blog.sealpi.cn
```

启用:
```bash
ln -s /etc/nginx/sites-available/blog.sealpi.cn /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 4. 登录 ghcr.io（拉私有镜像）

如果 repo 是 private，需要一次性登录：
```bash
# 在 GitHub Settings → Developer settings → Personal access tokens
# 新建 classic token，勾选 read:packages 权限
echo <YOUR_PAT> | docker login ghcr.io -u Seal-Re --password-stdin
```

如果 repo 是 public，镜像默认 public，可跳过此步。

---

## GitHub 仓库配置

### Secrets（Settings → Secrets and variables → Actions → New repository secret）

| 名称 | 值 |
|------|-----|
| `DEPLOY_HOST` | `sealpi.cn` |
| `DEPLOY_USER` | `root` |
| `DEPLOY_SSH_KEY` | 粘贴 `C:\Users\seal\Downloads\pentest.pem` 全文（包含 `-----BEGIN/END-----` 行） |

`GITHUB_TOKEN` 由 Actions 自动注入，无需手动配置。

### Workflow Permissions（Settings → Actions → General → Workflow permissions）

勾选 **Read and write permissions**（让 Actions 能推镜像到 ghcr.io）。

### GitHub Container Registry 可见性

首次运行 deploy 后:
- 访问 `https://github.com/Seal-Re?tab=packages`
- `sealpi-blog-backend` 和 `sealpi-blog-frontend` 默认 private
- 若想让服务器不用 PAT 就能 pull，改为 public（Settings → Change visibility → Public）

---

## 首次部署步骤

1. 完成上述一次性服务器初始化（env、nginx、证书）
2. 在 GitHub 仓库配置 3 个 Secrets
3. 调整 Workflow Permissions
4. push 一个 commit 到 `main`（或 Actions 面板手动 Run workflow）
5. 观察 Actions 运行结果
6. 首次成功后 `ssh root@sealpi.cn -p 22 -i pentest.pem`，确认:
   ```bash
   cd /opt/sealpi-blog
   docker compose -f docker-compose.prod.yml ps
   curl -sI https://blog.sealpi.cn/api/v1/articles | head -5
   curl -sI https://blog.sealpi.cn/           | head -5
   ```

---

## 日常运维

### 查看日志
```bash
ssh root@sealpi.cn -i pentest.pem
cd /opt/sealpi-blog
docker compose -f docker-compose.prod.yml logs -f --tail=200 blog-start
docker compose -f docker-compose.prod.yml logs -f --tail=200 frontend
```

### 改环境变量
```bash
nano /opt/sealpi-blog/.env.backend.local
docker compose -f docker-compose.prod.yml up -d  # 重启受影响容器
```

### 手动回滚到上一版本
```bash
# CI 每次构建会推 :latest 和 :<git-sha> 两个 tag
docker pull ghcr.io/seal-re/sealpi-blog-backend:<旧的短 sha>
docker tag  ghcr.io/seal-re/sealpi-blog-backend:<旧的短 sha> ghcr.io/seal-re/sealpi-blog-backend:latest
docker pull ghcr.io/seal-re/sealpi-blog-frontend:<旧的短 sha>
docker tag  ghcr.io/seal-re/sealpi-blog-frontend:<旧的短 sha> ghcr.io/seal-re/sealpi-blog-frontend:latest
docker compose -f docker-compose.prod.yml up -d
```

### 备份 MySQL
```bash
docker exec sealpi-mysql mysqldump -uroot -p${MYSQL_ROOT_PASSWORD} sealpi_blog \
  | gzip > /opt/sealpi-blog/backup/sealpi_blog-$(date +%F).sql.gz
```

建议加 cron:
```
0 3 * * * /opt/sealpi-blog/scripts/backup.sh
```

### 紧急停机
```bash
docker compose -f docker-compose.prod.yml down
```

---

## 故障排查

| 症状 | 可能原因 | 处理 |
|------|---------|------|
| Actions deploy 卡在 scp | SSH 密钥错 or `DEPLOY_HOST` 不可达 | 本地 `ssh -i pentest.pem root@sealpi.cn` 验证 |
| Actions push ghcr.io 403 | Workflow Permissions 没给写入 | Settings → Actions → Workflow permissions → Read and write |
| nginx 502 | 容器没起来 or 端口绑错 | `docker compose ps`, `ss -tlnp | grep 1331` |
| 登录后无限跳转 | `AUTH_URL` 与浏览器实际域名不一致 | 检查 `.env.backend.local` 的 `AUTH_URL=https://blog.sealpi.cn` |
| 图片 404 | `MINIO_PUBLIC_BASE_URL` 错 or nginx `/minio/` 路由错 | 浏览器 Network 看图片请求路径 |
| Flyway migration 失败 | 旧库无 schema history | 临时在 env 加 `SPRING_FLYWAY_BASELINE_ON_MIGRATE=true` 和 `SPRING_FLYWAY_BASELINE_VERSION=<当前版本>` |

---

## 安全备注

- `DEPLOY_SSH_KEY` 只给该 key 到 root 用户 `~/.ssh/authorized_keys`；考虑创建 `deploy` 用户并 `docker` 组加成员，降权
- `.env.backend.local` 在服务器权限设为 `chmod 600`
- MinIO console（13309）仅绑 `127.0.0.1`，不暴露公网；如需访问走 SSH tunnel: `ssh -L 13309:127.0.0.1:13309 root@sealpi.cn`
- MySQL 端口 13307 同上，仅 localhost
- `.env.backend.local` 绝不 commit 到 git（`.gitignore` 已覆盖）
