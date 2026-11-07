# PRD 驱动护栏流转验证（隔离演练）

任务：prd-guardrail-replay-2a92e668befcb4a1；实施者：coolm。本报告是指定候选的交付快照，当前规则以现行规格为准。

## 完成功能

包含当前未提交护栏修复的64份公开文件快照中，新无历史Agent从PRD自主建档并续接唯一项目任务，实际完成C0/C1、正式原件、公共pending、仅测试接受的complete与重开。lab同候选完整检查133/133、构建/smoke通过，补充真实DB/进程行为21/21；服务SIGKILL后新PID同会话读回同项目revision2。13条CLI观察验证拒绝/撤回/原请求恢复，complete原请求幂等，重开保留旧包并撤回新候选通过。主项目本轮仅澄清验收入口并发布验证报告。

## 必要决定

用户授权隔离演练与明确标记的测试接受。被测Agent未供应个人Skill正文、历史记录、任务ID或预填JSON，未观察到个人Skill路径命令。项目契约与两处业务修复只属lab，不采纳为主项目决定或代码。TEST_FIXTURE_ACCEPTANCE_ONLY只绑定lab候选/草稿，不接受主项目任务。

## 限制

仅支持本次样例和声明版本/环境，不证明所有Agent/宿主。命令审计与fs.watch不是完整OS追踪，也不证明宿主禁用Skill目录；work exec是显式入口，不拦截任意编辑器写入。journal末边界由真实日志重建，不是协调器实际断电；服务进程重启不证明数据库崩溃或断电。未跑远端CI、生产容量、媒体生成、团队或多租户。失败保留，主任务真实接受待定。

## 验收依据

- checks (automated, excerpt): [原件/摘录](evidence/checks.md)
- prd-workflow (behavior, excerpt): [原件/摘录](evidence/prd-workflow.md)
- replay-review (review, excerpt): [原件/摘录](evidence/replay-review.md)

接受：待真实结果接受；草稿不能作为完成结论。

```mio-task-report
{
  "version": 1,
  "id": "prd-guardrail-replay-2a92e668befcb4a1",
  "title": "PRD 驱动护栏流转验证（隔离演练）",
  "author": "coolm",
  "modules": [
    "development-coordination",
    "guardrail-acceptance"
  ],
  "outcomes": "包含当前未提交护栏修复的64份公开文件快照中，新无历史Agent从PRD自主建档并续接唯一项目任务，实际完成C0/C1、正式原件、公共pending、仅测试接受的complete与重开。lab同候选完整检查133/133、构建/smoke通过，补充真实DB/进程行为21/21；服务SIGKILL后新PID同会话读回同项目revision2。13条CLI观察验证拒绝/撤回/原请求恢复，complete原请求幂等，重开保留旧包并撤回新候选通过。主项目本轮仅澄清验收入口并发布验证报告。",
  "decisions": "用户授权隔离演练与明确标记的测试接受。被测Agent未供应个人Skill正文、历史记录、任务ID或预填JSON，未观察到个人Skill路径命令。项目契约与两处业务修复只属lab，不采纳为主项目决定或代码。TEST_FIXTURE_ACCEPTANCE_ONLY只绑定lab候选/草稿，不接受主项目任务。",
  "limitations": "仅支持本次样例和声明版本/环境，不证明所有Agent/宿主。命令审计与fs.watch不是完整OS追踪，也不证明宿主禁用Skill目录；work exec是显式入口，不拦截任意编辑器写入。journal末边界由真实日志重建，不是协调器实际断电；服务进程重启不证明数据库崩溃或断电。未跑远端CI、生产容量、媒体生成、团队或多租户。失败保留，主任务真实接受待定。",
  "checkpoint": {
    "head": "386020174cb95d6bf9f1be265c0dfadfa4d7f496",
    "branch": "codex/work-coordination",
    "files": {
      "AGENTS.md": "e8152111632ac8439d7ff94bc6188e1266d2e21e7a3ec3dfcbbfae9c542f79ea",
      "docs/acceptance.md": "b93851845129e07fbcfde779b78a77cd91e12e6eca56587ecf1572b127455663",
      "docs/api.md": "c4d5983d15eeb2bfefc8be4c675c0103613c1019ac11e3747e7eec19aba59b5f",
      "docs/architecture-ai-drama-foundation.md": "c599e6d9dc12e58606e4c724de50ef96c27c6d73419d226fa4a69cc8e0d0ef92",
      "docs/auth.md": "b1c89f5eb8356ec9d911c30d677ff881b42debd120f73a28d0f1b4934080ad3a",
      "docs/coordination.md": "3c9a440a21e7f3523458717fb89e73e53a7e425dce89c514b98ef0a967f58e36",
      "docs/foundation.md": "b2b28fa3fe66e62771a2eb7015dea40a0b1eb5d89dc18d3cfdc5e482b147ed91",
      "docs/prd-ai-drama-foundation.md": "dc03cbd28435443666fcd3e8077bee4fdf48a0d9d54998665b03fdb02d5bf745",
      "docs/tasks/pending/delivery-closure-1f7a2cc763c2d412/evidence/checks.md": "5c686e976b43ff7ebe1168ddda27b560dfd027d70b3c522cd3014137fce35f77",
      "docs/tasks/pending/delivery-closure-1f7a2cc763c2d412/evidence/closure-review.md": "07cb0c5be10622a3cc323b4261d9042f3f2eac701b3be331899688b4b99591e1",
      "docs/tasks/pending/delivery-closure-1f7a2cc763c2d412/evidence/quality-review.md": "d3dc28634b53b8873e0b1386b605cd6725b7ca674dda94fd9c7cfc910d5a6f86",
      "docs/tasks/pending/delivery-closure-1f7a2cc763c2d412/report.md": "4ee01296b58a1740064beda6d1df633003a4befd0555e0857c757f7d6bdd0ef5",
      "docs/work-records.md": "02a84fa18aad5cdca3a8e11642be4cca5511229cfcfad3b597a76d833fe853b0",
      "harness.config.json": "a9da9600e84861aecf57557c6e0c9abed8f795fd9dc1b7f4552c9f6bceef450f",
      "package.json": "530cde7c6d11881919423726183f5097dd32e2c6f2dd5bdb84b98ce17279498d",
      "pnpm-lock.yaml": "03b741148b7f0a99d0587e4c8df589c67eedf787b5addf2a2f42a56c752d7dff",
      "scripts/harness/check-documents.ts": "12c3223c5e7c0bac294d673293d715b31b3672be799f5e8fb37addaae4f05f25",
      "scripts/harness/check-guardrails.ts": "976f2e4da18056f3319c3eaaf632292e2648db3b90872b52eb8dfebb3361ac7e",
      "scripts/harness/check-source.ts": "148878c27d3cb2fb020f1c0079c76db31cd9a951ae7e58e7c4156e862cb40fda",
      "scripts/harness/inventory.ts": "2d8add14786e830b14c83a59527a9bd9a8148d1f6a15284a07abad14ac6a6994",
      "scripts/harness/work/cli.ts": "5ed0e61419902577db9a5df78f68a26f9e6fe9c479a3bf654dde4d3f148846c6",
      "scripts/harness/work/context.ts": "ddab7dc7c0148adc7ce2638e68495d2306e57babad8c6cc6974f417e0101548d",
      "scripts/harness/work/delivery-store.ts": "a6bb0370974d5eac86d666e7b7160a8a189c2223af3bf2434d55a3917a7aa24d",
      "scripts/harness/work/delivery.ts": "d0fe45383607fdecb5be734a4b9b1c9bc510f0165ab2f7b676e463f717656628",
      "scripts/harness/work/guide.ts": "ac58173a41a53e372e5fccb391b6e12bd9514509692a502f757e556b79ca1808",
      "scripts/harness/work/handoff.ts": "04ba66846827331c9421ea0cbae00b56d6b2d85a1898277d80bce9b8e52c2d31",
      "scripts/harness/work/manage.ts": "8b9bb6b87ac6b527c9d27553a6d4e9a33fa2020c739c4cb8b6ff1edba35ae6fa",
      "scripts/harness/work/quality-review.ts": "4e069b3acaeee78df6d49b5657e61beac69c469d75ef607cacc0c3ddf1f08b99",
      "scripts/harness/work/records.ts": "282ea37ee5e2da850a57fd150b14a1bdf1bd220beec44cef5da23800f7ceaa35",
      "scripts/harness/work/reports.ts": "6e9c24b282f6e5f1d32391106fac84ca4ba6c88b5feabbded65a060104a1c4b7",
      "scripts/service/migrate-auth.ts": "13d777d599a413e6d20da0d5244fd03d6e3e0d50b9572c2ce3c5ad24267805fb",
      "scripts/service/prepare-profile.ts": "cf44b56711129baaeda5fa4e306275b25b0934c0675d35280ce2b4f758574e4e",
      "scripts/service/profile.ts": "4b821c0e2e6c3d7db119151640c2f728d1366857387c2a219b4c2f5144246ffa",
      "scripts/service/smoke.ts": "5defe21212525fc49b9fe01896e0ab8dcd2a040b348755342ca2dc304c469f4a",
      "scripts/service/start.ts": "1c020813e74a65e41eb48f59ec860e418de7df1a8d70940419dfd91dc472116d",
      "src/auth/config.ts": "843f303a29a1955683c193e0985a26955fa73e1895d87d7aef9b874e3dd6bbcf",
      "src/auth/http.ts": "1c2971d60b398cd904237bccbd1fbfd9c8e639e0b23165c10be06c81f9c96094",
      "src/auth/service.ts": "2f04799095f4803d81dae6815f303fe842dddaf2111dd911bda8b95abf65c757",
      "src/contracts.ts": "393977f176a3f2aec650247aba3991499bce5416f5b33ab1ac93c57495668520",
      "src/http.ts": "7201a3a429599e94a43aded01071ebbf78c8097b077bb6c547ac515f39eaf238",
      "src/plugin.ts": "2f63f3c83c0dbae4f85fbdad910e0b91422497692ded58f9dd3fcd4bee98f25c",
      "tests/auth-database.ts": "dc31bab1c8c9b353a1524f6ba2a230a9afeec5b58c1eaa4551d87c20879dae1a",
      "tests/auth.test.ts": "d7778b0a08549e014633843a667950e0fd8d2aff4f4ea56cf9f218209accc037",
      "tests/delivery.test.ts": "fbf1b48c72ce77d158621937ec7a17cd742cfa2cd196bd27fb966dedfd6332b5",
      "tests/guardrails.test.ts": "28b76aca32fa43e28bc4fd3685a02ec419d03347ded3a11499e998407e9ece46",
      "tests/plugin.test.ts": "574f5065c657c3b554996fbf8aba90d341df28217bf226bbf727fa9bb4b7426a",
      "tests/quality-review-fixture.ts": "4163747ecbaab7aad6d68abc9a98669d955fa49864d4a38299549064598d5e8d",
      "tests/quality-review.test.ts": "4a85a0c65949b3031c5b30ab888612dd05f0dfef66736f208da4800a6948ba8d",
      "tests/work.test.ts": "aec79adebfdbd280a1a81aaad83db22ed148690c9dc847c478c88caa8ded832b"
    },
    "contract": "5b4b335cf59ec325a6dfa39f611c4ffd3bd29e91f840efdd0a86396c5e173e8b",
    "candidate": "fafcc6248122d951342674f89cf9a1d9932e593d65dca78c17610881ad6879f1"
  },
  "contract": {
    "requirement": {
      "source": "docs/prd-ai-drama-foundation.md",
      "section": "7.4 护栏验证矩阵",
      "key": "prd-guardrail-replay"
    },
    "goal": "在包含当前未提交修复的隔离副本中，验证普通Agent不读取个人Skills时能从当前PRD形成任务、跨会话续接，并完成pending/测试接受/complete与关键拒绝恢复分支",
    "scope": [
      "docs/acceptance.md"
    ],
    "inputs": [
      "package.json",
      "pnpm-lock.yaml",
      "harness.config.json",
      "src",
      "scripts/harness",
      "scripts/service",
      "tests",
      "docs"
    ],
    "sources": [
      "docs/prd-ai-drama-foundation.md",
      "docs/coordination.md",
      "docs/work-records.md",
      "docs/acceptance.md",
      "docs/foundation.md"
    ],
    "nonGoals": [
      "不将演练项目代码接回主项目或采纳演练字段/接口为真实业务决定",
      "不访问已有业务数据库、外部模型、收费供应商或凭证",
      "不复制原.work、运行数据或个人Skills给被测Agent",
      "不把隔离测试接受当成真实项目的人类接受",
      "不将目录隔离或禁止指令宣称为操作系统沙箱或所有Skills自动注入已关闭"
    ],
    "acceptance": [
      {
        "id": "checks",
        "method": "automated",
        "criterion": "当前主项目pnpm check通过，相关CLI合法/违规/恢复回归保持；公开验收入口对pending说明与协议一致"
      },
      {
        "id": "prd-workflow",
        "method": "behavior",
        "criterion": "当前PRD驱动的隔离Agent实际识别认证复用和S0-02/S1边界、形成任务/C0/C1、实施有界项目链；新无历史上下文恢复相同记录并完成正式原件和公共pending；测试接受后complete包/索引与候选一致，旧结果不冒充接受"
      },
      {
        "id": "replay-review",
        "method": "review",
        "criterion": "对照初始快照、命令/文件观察、任务与原件实物判断，核对权限/持久化真实入口及无Skills约束的证据边界；负例拒绝和原请求恢复有实际证据，失败与未验证不被全绿报告覆盖"
      }
    ],
    "decisions": [
      {
        "status": "CONFIRMED",
        "text": "执行上轮提出的隔离PRD演练与关键拒绝分支验证，主项目接受状态独立",
        "source": "当前用户开始验证指令"
      },
      {
        "status": "AI_PROPOSED",
        "text": "项目字段、错误码等仅由测试驱动在收到被测Agent问题后提供演练约定，不升级为原项目已采纳需求；观察器与命令审计只作本次取证，不安装全局Hook",
        "source": "依据无预填答案、真实副作用隔离及执行顺序验证要求选择的试验设计"
      }
    ],
    "dependencies": []
  },
  "evidence": [
    {
      "criterion": "checks",
      "method": "automated",
      "representation": "excerpt",
      "sourceSha256": "aa6704faffc7762af63aa1d27318264d9cd55b4d7621671f93c2db88afd3c238",
      "path": "evidence/checks.md",
      "sha256": "ef8a08d962b6a363959eb849e97d9e0008381abd84880ec3e54e1f02b368c7e3",
      "environment": "darwin/arm64; Node v24.22.2"
    },
    {
      "criterion": "prd-workflow",
      "method": "behavior",
      "representation": "excerpt",
      "sourceSha256": "cfaa561bb1f0c34a2a3a444fdc34d74127ade960dfc2c84667f93d9979af563d",
      "path": "evidence/prd-workflow.md",
      "sha256": "4e80437b1e15a54dd026a22852bcdd564b4bcba2298bcb7ddc0eb262df57000a",
      "environment": "darwin/arm64; Node v24.22.2"
    },
    {
      "criterion": "replay-review",
      "method": "review",
      "representation": "excerpt",
      "sourceSha256": "7aa0c0d789e7b09c877872279706b2958d768fed9e002b3d118a95e27c3871d8",
      "path": "evidence/replay-review.md",
      "sha256": "7a1320637eeaa548e0566c3e265903058c705691e4b806c15855c6e8946d8aa1",
      "environment": "darwin/arm64; Node v24.22.2"
    }
  ]
}
```
