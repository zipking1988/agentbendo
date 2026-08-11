# Agent Bento — NotebookLM 资料包

把本目录下的 Markdown 全部上传到 [NotebookLM](https://notebooklm.google.com) 作为一个笔记本的来源（Sources）。文档已按「可引用、可问答、可做 PPT」写好。

## 建议上传顺序

| 文件 | 用途 |
| --- | --- |
| `01-project-overview.md` | 项目是什么、为谁做、怎么工作、真假边界 |
| `02-ppt-deck.md` | 演示文稿逐页大纲 + 讲稿 |
| `03-notebooklm-faq.md` | 高频问答，方便 NotebookLM 生成 FAQ / Briefing / Quiz |
| `../AGENT.md` | 工程真相来源（Implemented / Simulated / Planned） |
| `../README.md` | 英文产品简介与本地运行说明（可选） |

## 在 NotebookLM 里怎么用

1. **新建笔记本**，名称建议：`Agent Bento`
2. **Add sources** → 上传上表文件（不要上传 `.env`、密钥、超大 `demo_frames.json`）
3. 常用提示词示例：
   - 「用中文写一段 90 秒电梯演讲」
   - 「根据 02-ppt-deck 生成 10 页幻灯片标题和每页三点」
   - 「区分 Implemented / Simulated / Planned，列一张表」
   - 「这是医疗设备吗？为什么不是？」
   - 「演示时如何操作 `/` 和 `/dashboard`」
4. 生成 **Slide Deck / Briefing Doc / FAQ** 时，要求模型：**不得把 Simulated 说成已上线硬件或真实下单**

## 文档语言与口径

- 产品名：**Agent Bento**（仓库名 AgentBento；演示故事里偶发「Bendo」为同一概念）
- 核心承诺：Notice unusual silence → send human care → escalate only when needed
- 不做：摄像头、麦克风录音、临床诊断、把演示当成真实出警

## 维护

改产品真相时，优先改 `AGENT.md`，再同步本目录三份文档，避免 NotebookLM 学到过期描述。
