# k6 负载测试设计 — blog.sealpi.cn

- 日期: 2026-05-03
- 目标: 对 SealPi-Blog 公开 API (`https://blog.sealpi.cn`) 做 5 类负载测试
- 脚本路径: `test/k6/`

## 1. 范围

仅压公开 API (无鉴权)。**不含**前端 SSR 页面、`/admin/*`、`/api/v1/internal/*`。

被压端点 (按权重):

| 权重 | 端点 | 备注 |
|-----:|------|------|
| 50% | `GET /api/v1/articles?page=&size=` | 列表分页, 主流量 |
| 30% | `GET /api/v1/articles/slug/{slug}` | 详情 |
| 10% | `GET /api/v1/articles/adjacent?slug=&tags=` | 上下篇 |
|  5% | `GET /api/v1/tags` | 标签列表 |
|  5% | `POST /api/v1/articles/{id}/view` | 阅读计数 |

加权随机抽取, 每 VU iteration 调 1 个, 用 `group()` 拆 metrics。

## 2. 数据池预取

**问题**: 随机 ID/slug 大概率 404, 污染指标。

**方案**: 一次性 `bootstrap.js` 拉真实数据写本地 JSON, 测试脚本通过 `SharedArray` 加载。

**bootstrap.js 流程**:
1. 翻页 `GET /api/v1/articles` 直到凑够 `POOL_SIZE` 条 (默认 30) 或耗尽
2. `GET /api/v1/tags` 拉所有 tag 名
3. 写入 `data/pool.json`:
   ```json
   {
     "generatedAt": "2026-05-03T...Z",
     "baseUrl": "https://blog.sealpi.cn",
     "articles": [{ "id": 12, "slug": "foo", "tags": ["k8s"] }],
     "tags": ["k8s", "go"]
   }
   ```
4. 池为空 → 退出码非 0

**重新生成**: `pwsh scripts/bootstrap.ps1 -Force` (默认仅当 `data/pool.json` 缺失时跑)。

## 3. 五个 Profile

| Profile | Executor | VU/时长 | 用途 |
|---------|----------|---------|------|
| smoke   | constant-vus | 1 vu / 30s | 上线探活 |
| load    | ramping-vus  | ramp 30s→20vu, 持 4m, ramp 30s→0 | 基线性能 |
| stress  | ramping-vus  | 步进 +20vu/min, 上限 `MAX_VU`(默认 200) | 找拐点 |
| spike   | ramping-vus  | 30s→5vu, 30s→100vu, 30s@100vu, 60s→5vu | 突发恢复 |
| soak    | constant-vus | 10 vu / 30m | 内存泄漏/资源累计 |

**stress 拐点检测** (写入 `lib/thresholds.js`):
```js
stress: {
  'http_req_failed':   [{ threshold: 'rate<0.01', abortOnFail: true, delayAbortEval: '30s' }],
  'http_req_duration': [{ threshold: 'p(99)<1000', abortOnFail: true, delayAbortEval: '30s' }],
}
```
`handleSummary` 检测测试是否在预期时长前结束 → 末 stage 的 `vus_max` 输出为 `BREAK_AT_VU=<N>`。

**stress 上限 200 跑稳时**: `BASE_URL=... MAX_VU=500 k6 run scenarios/stress.js` 重跑。README 注明。

## 4. 阈值 (per-profile)

集中在 `lib/thresholds.js`:

```js
export const thresholds = {
  smoke:  { 'http_req_failed': ['rate<0.05'], 'http_req_duration': ['p(95)<2000'] },
  load:   { 'http_req_failed': ['rate<0.01'], 'http_req_duration': ['p(95)<500','p(99)<1500'] },
  stress: { /* 见上, abortOnFail */ },
  spike:  { 'http_req_failed': ['rate<0.10'] },                                       // 仅记录
  soak:   { 'http_req_failed': ['rate<0.005'], 'http_req_duration': ['p(95)<600'] },  // 长跑严错误率
};
```

**为什么 spike 不严**: spike 本意观察恢复行为, 突发期间错误率高是可接受信号, 不是失败。

## 5. 输出

`lib/summary.js` 实现 `handleSummary`, 同时输出:
- stdout (彩色文本摘要)
- `results/<scenario>-<ISO>.json` (k6 完整 metrics)
- `results/<scenario>-<ISO>.html` (`k6-html-reporter` 生成)

文件名通过 `__ENV.SCENARIO` 注入 (`run-all.ps1` 设置)。`results/` 加入 `.gitignore`。

## 6. 监控 (soak 必备)

k6 不采服务器侧指标。soak 长跑必须配套 VM 侧采样:

**`scripts/vm-monitor.sh`** (拷到 VM, Linux 跑):
```bash
#!/bin/bash
# Usage: ./vm-monitor.sh <java-pid> <duration-seconds>
PID=$1; DUR=$2
TS=$(date +%Y%m%d-%H%M%S)
mkdir -p logs
jstat -gcutil $PID 5000 > logs/jstat-$TS.log &
JSTAT_PID=$!
top -b -d 5 -p $PID > logs/top-$TS.log &
TOP_PID=$!
vmstat 5 > logs/vmstat-$TS.log &
VMSTAT_PID=$!
sleep $DUR
kill $JSTAT_PID $TOP_PID $VMSTAT_PID
echo "logs in $(pwd)/logs/"
```

**前置清单 (README 强调)**:
1. SSH 到 VM (Tencent VM `43.156.71.59`)
2. `pgrep -f BlogStartApplication` 取 Java pid
3. 确认 GC 日志已开 (启动参数 `-Xlog:gc*:file=gc.log`); 没开则补加重启
4. `bash vm-monitor.sh <pid> 1800` 后台跑 (留 5 分钟缓冲)
5. 本机另起终端: `pwsh scripts/run-all.ps1 -OnlySoak` (单跑 soak; 全跑用 `-IncludeSoak`)
6. 跑完 `scp -r vm:logs results/soak-monitor-<ts>/` 拉回本机归档

## 7. 目录结构

```
test/k6/
├── README.md                  # 跑法 + 前置清单
├── .gitignore                 # 忽略 data/ 和 results/
├── lib/
│   ├── config.js              # BASE_URL/POOL_SIZE/默认 headers
│   ├── pool.js                # SharedArray 加载 data/pool.json
│   ├── thresholds.js          # 各 profile 阈值
│   ├── weighted-pick.js       # 加权随机选端点
│   └── summary.js             # handleSummary → JSON+HTML
├── scenarios/
│   ├── bootstrap.js
│   ├── smoke.js
│   ├── load.js
│   ├── stress.js              # 含 abortOnFail
│   ├── spike.js
│   └── soak.js
├── scripts/
│   ├── vm-monitor.sh          # VM Linux 监控
│   ├── bootstrap.ps1          # 跑 bootstrap.js, -Force 强刷
│   └── run-all.ps1            # 顺序跑 (默认 skip soak); 支持 -IncludeSoak / -OnlySoak
├── data/                      # gitignore (bootstrap 生成)
└── results/                   # gitignore (报告输出)
```

## 8. 配置 (env)

| 变量 | 默认 | 作用 |
|------|------|------|
| `BASE_URL` | `https://blog.sealpi.cn` | API 基址 |
| `POOL_SIZE` | `30` | 数据池大小 (bootstrap) |
| `MAX_VU` | `200` | stress 上限 (仅 stress.js 读) |
| `SCENARIO` | (auto) | 输出文件名后缀 (run-all 注入) |

## 9. 验收标准

- [ ] `pwsh scripts/bootstrap.ps1` 生成 `data/pool.json` 含 ≥1 条 article + ≥1 个 tag
- [ ] `k6 run scenarios/smoke.js` 全绿 (404 率 0)
- [ ] `pwsh scripts/run-all.ps1` 顺序跑完 smoke→load→stress→spike, 各自生成 `results/*.json` + `*.html`
- [ ] stress.js 在 abort 时正确写出 `BREAK_AT_VU` 到 stdout
- [ ] HTML 报告浏览器打开能看分位数图表
- [ ] README 含 soak 6 步前置清单 + stress 上限调整说明

## 10. 范围外 (本次不做)

- InfluxDB/Prometheus push (Q4 选 c, 非 d)
- PowerShell SSH 一键跑 (Q6 选 b, 非 c)
- 前端 SSR / admin / internal 端点 (Q2 选 a)
- 测试结果回归对比 (后续可扩)
