# AgentBento 代码知识库 (Qoder Repo Wiki)

> 本文档为 Qoder Repo Wiki 提供 AgentBento 代码库的索引和关键知识。

## 模块索引

### lib/ai-router.ts — AI 服务路由器
统一的 AI 服务调度中心，根据任务类型自动选择最优服务。

- `analyzeFloorPlan()` → Qwen → StepFun (fallback)
- `translate()` / `translateCareLogs()` → GMI Cloud
- `summarizeCareLog()` → GMI Cloud
- `identifyArtifacts()` → Qwen Cloud
- `runCheckIn()` → Daytona → fallback
- `getCareCulturalContext()` → ai&
- `evaluatePrivacy()` → ai&
- `getAllServiceStatus()` → 所有服务健康状态

### lib/adapters/qwen.ts — Qwen Cloud
阿里云 DashScope 多模态 API 封装。支持户型图识别和物品照片识别。
- 模型: `qwen-vl-max`
- API: `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`
- 环境变量: `QWEN_API_KEY`, `QWEN_BASE_URL`, `QWEN_VISION_MODEL`

### lib/adapters/gmi.ts — GMI Cloud
统一翻译和分析 API。支持日↔英↔中翻译和护理日志 AI 摘要。
- 环境变量: `GMI_API_KEY`, `GMI_BASE_URL`, `GMI_TRANSLATION_MODEL`, `GMI_ANALYSIS_MODEL`

### lib/adapters/daytona.ts — Daytona
隔离 Sandbox 执行环境。每个 care incident 启动独立 sandbox 执行爬取和验证。
- API: `https://api.daytona.io/api`
- Sandbox TTL: 5分钟 (可配置)
- 环境变量: `DAYTONA_API_KEY`, `DAYTONA_BASE_URL`, `DAYTONA_SANDBOX_TTL`

### lib/adapters/aiand.ts — ai&
日本国内 GPU 推理。处理数据不出境的敏感任务，包括日本文化语境理解和隐私安全评估。
- API: `https://api.ai-and.com/v1`
- 环境变量: `AIAND_API_KEY`, `AIAND_BASE_URL`, `AIAND_MODEL`

### lib/stepfun.ts (保留为 Fallback)
StepFun Step Plan API，当 Qwen Cloud 不可用时的降级方案。
- 模型: `step-3.7-flash`
- 环境变量: `STEPFUN_API_KEY`, `STEPFUN_BASE_URL`, `STEPFUN_VISION_MODEL`

## API 路由

| 路由 | 方法 | 用途 |
|------|------|------|
| `/api/floor-plan/analyze` | POST | 户型图分析 (AI Router → Qwen/StepFun) |
| `/api/service-status` | GET | 所有 AI 服务健康检查 |
| `/api/care-summary` | POST | GMI Cloud 生成护理摘要 |
| `/api/incident/check-in` | POST | 完整 incident check-in (Daytona + ai& + GMI) |

## 数据流

```
用户上传户型图
  → /api/floor-plan/analyze
    → ai-router.ts
      → Qwen Cloud (primary) / StepFun (fallback)
      → RoomRegion[] 返回

incident 触发
  → /api/incident/check-in
    → ai-router.ts (并行)
      → Daytona sandbox 爬取便当店
      → ai& 日本文化语境 + 敬语
      → ai& 隐私风险评估
```

## 关键设计原则

1. **智能降级**: 每个服务都有 fallback 策略
2. **数据合规**: 敏感数据通过 ai& 在日本境内处理
3. **隔离执行**: Daytona sandbox 确保爬取安全
4. **统一接口**: AI Router 对外提供一致的 API
