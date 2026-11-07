# PRD 驱动护栏流转验证（隔离演练）

任务：prd-guardrail-replay-2a92e668befcb4a1；实施者：coolm。本报告是指定候选的交付快照，当前规则以现行规格为准。

## 完成功能

原隔离实验实际完成PRD识别/任务C0-C1、限定项目链实施、新无历史上下文恢复、正式证据/pending、测试接受/complete及重开。原133项完整检查、21项真实DB/服务行为和13次拒绝恢复观察保留；业务进程SIGKILL后新进程同会话读回revision2有原始日志。本次核对77份lab文件、四阶段、全部受引用原件及报告附件摘要，审查入口说明/其他任务报告增量，当前主候选121项完整检查通过。

## 必要决定

原标准和隔离边界不变；本次是历史实验的当前适用性复核，没有重新执行整场实验。主源码/工具链/PRD与原相关输入一致，短句入口增量已审，其他任务结果已真实接受。实验字段、代码和TEST_FIXTURE_ACCEPTANCE_ONLY均不接回或代替主项目真实接受。

## 限制

单条同机样例，不证明所有Agent/宿主或统计可靠性；命令观察不是OS沙箱，也不证明宿主未注入Skill目录。journal边界是重建恢复，未真实杀死协调器；SIGKILL针对业务服务，不是DB崩溃或掉电。未验证生产、远端CI、媒体生成、团队容量或多租户；旧失败保留，当前结果待真实接受，未提交推送部署。

## 验收依据

- checks (automated, excerpt): [原件/摘录](evidence/checks.md)
- prd-workflow (behavior, original): [原件/摘录](evidence/prd-workflow.md)
- replay-review (review, original): [原件/摘录](evidence/replay-review.md)

接受：接受演练报告并执行 complete

来源：2026-11-07当前会话用户对PRD驱动护栏流转验证候选45a1b34b2f95、公共报告、当前121项检查及历史133项/21项/13次观察的适用性复核和限制的明确接受（request_user_input_async sg_call_d8badd6fc5e31_2第0项）。

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
  "outcomes": "原隔离实验实际完成PRD识别/任务C0-C1、限定项目链实施、新无历史上下文恢复、正式证据/pending、测试接受/complete及重开。原133项完整检查、21项真实DB/服务行为和13次拒绝恢复观察保留；业务进程SIGKILL后新进程同会话读回revision2有原始日志。本次核对77份lab文件、四阶段、全部受引用原件及报告附件摘要，审查入口说明/其他任务报告增量，当前主候选121项完整检查通过。",
  "decisions": "原标准和隔离边界不变；本次是历史实验的当前适用性复核，没有重新执行整场实验。主源码/工具链/PRD与原相关输入一致，短句入口增量已审，其他任务结果已真实接受。实验字段、代码和TEST_FIXTURE_ACCEPTANCE_ONLY均不接回或代替主项目真实接受。",
  "limitations": "单条同机样例，不证明所有Agent/宿主或统计可靠性；命令观察不是OS沙箱，也不证明宿主未注入Skill目录。journal边界是重建恢复，未真实杀死协调器；SIGKILL针对业务服务，不是DB崩溃或掉电。未验证生产、远端CI、媒体生成、团队容量或多租户；旧失败保留，当前结果待真实接受，未提交推送部署。",
  "checkpoint": {
    "head": "fe010f2c98fd911a5671128baae464d1a515c913",
    "branch": "codex/work-coordination",
    "files": {
      "AGENTS.md": "8dc27d949c45bb4dfc4ee0c7c942e00ce98ce66029fe15747c7e1dd0d51b7eab",
      "docs/acceptance.md": "b93851845129e07fbcfde779b78a77cd91e12e6eca56587ecf1572b127455663",
      "docs/api.md": "c4d5983d15eeb2bfefc8be4c675c0103613c1019ac11e3747e7eec19aba59b5f",
      "docs/architecture-ai-drama-foundation.md": "c599e6d9dc12e58606e4c724de50ef96c27c6d73419d226fa4a69cc8e0d0ef92",
      "docs/auth.md": "b1c89f5eb8356ec9d911c30d677ff881b42debd120f73a28d0f1b4934080ad3a",
      "docs/coordination.md": "fb580b351dc300ff559d386d24f73c18fdbcf734ad054fbd5226487c7f13e70e",
      "docs/foundation.md": "b2b28fa3fe66e62771a2eb7015dea40a0b1eb5d89dc18d3cfdc5e482b147ed91",
      "docs/prd-ai-drama-foundation.md": "dc03cbd28435443666fcd3e8077bee4fdf48a0d9d54998665b03fdb02d5bf745",
      "docs/tasks/complete/agent-workflow-d298d07dba5afe60/evidence/checks.md": "3d626d5b86086b9ebcf814520fc24f6aab7efd37ae71aa5ae7bacf39e153f26f",
      "docs/tasks/complete/agent-workflow-d298d07dba5afe60/evidence/journey.md": "5b7b262aa2928cdbf579c34001075df9d15e239b95bd43e2f09240f44d536751",
      "docs/tasks/complete/agent-workflow-d298d07dba5afe60/evidence/quality-review.md": "03d81747f638d03ff25542fc27b5d5bfa37e8a6fa80c7532f98c032fbd79c54b",
      "docs/tasks/complete/agent-workflow-d298d07dba5afe60/evidence/review.md": "9ef9c753c8f70e4a5bc732e516405e35d5096b71b6c01fef62327591c3fc1937",
      "docs/tasks/complete/agent-workflow-d298d07dba5afe60/report.md": "075ac384e7e9f4ae70883b048d7665d9a6fab03d448001c9dbad8e42ce932c1d",
      "docs/tasks/complete/auth-registration-foundation-ac88ccd0f34f1c0c/evidence/auth-behavior.md": "f6e9bf01a4190402fbe82636ebff57a533cf6cb938231623d4633fb347535f59",
      "docs/tasks/complete/auth-registration-foundation-ac88ccd0f34f1c0c/evidence/checks.md": "3fc80028f8b9f906d1f1a54d1ddaaaad9178634e6d5e4d62c2f02fe3a9017466",
      "docs/tasks/complete/auth-registration-foundation-ac88ccd0f34f1c0c/evidence/quality-review.md": "d38ed237a07a57b2c9d8603b338cb1880b0d3b1f995fe2fb9ba50ae34c22d1dc",
      "docs/tasks/complete/auth-registration-foundation-ac88ccd0f34f1c0c/report.md": "7387bb56148d62bd96cbcb5e0363cbedbaee7cbaee3aa9e8e96c89a7492bcf0b",
      "docs/tasks/complete/delivery-closure-1f7a2cc763c2d412/evidence/checks.md": "31b5d6a0f9f525b967b1d2049423c3bc0a228713f86fdd01f4b481b5e3e4ec6f",
      "docs/tasks/complete/delivery-closure-1f7a2cc763c2d412/evidence/closure-review.md": "8c8c6643d65ac27d214a0e68cf26e331fb3db27a87a04c6b975bfcc21e0c50bc",
      "docs/tasks/complete/delivery-closure-1f7a2cc763c2d412/evidence/quality-review.md": "cefb4360f8fe8cc0245cffcbf82db9f0d39c37c215fbae0599b1b019b5e8ca6f",
      "docs/tasks/complete/delivery-closure-1f7a2cc763c2d412/report.md": "83a0ced2f85b223e591c13eb61a23dc66aad17be69c799a9f89bd3366c37bf60",
      "docs/tasks/complete/dsh-alias-boundary-4e6a6d39e9923db1/evidence/checks.md": "439a5d3b871ea2c720e53d09dac15d6c3d3bdfb0b26d8139f439b5ab9447f623",
      "docs/tasks/complete/dsh-alias-boundary-4e6a6d39e9923db1/evidence/quality-review.md": "467cfe8740cdfea9d0a57c23ec666371de964121b225884911e1dfd6252e9cd8",
      "docs/tasks/complete/dsh-alias-boundary-4e6a6d39e9923db1/evidence/regression.md": "d30afd5797579a0433a1ad8001d71db763dfbab8b8999e426aeaa907695dc230",
      "docs/tasks/complete/dsh-alias-boundary-4e6a6d39e9923db1/evidence/review.md": "3f08b927c6d0e22dd21872dc7a0be9b3929d3cd3934a4aa77573cdcd3933f743",
      "docs/tasks/complete/dsh-alias-boundary-4e6a6d39e9923db1/report.md": "07a4cb0db06d7066a0ec730d9dad28a7fee3a1b4ce25f940e78d0a300ed4f3ba",
      "docs/tasks/complete/foundation-guardrails/evidence/checks.md": "ee92de93a46b97a2c5b3982af2a91e78dc66bb903deba258bae1b8dfc3cd53f9",
      "docs/tasks/complete/foundation-guardrails/evidence/peers.md": "ffcf21b2fe0f88164af9623e1beec3f3f3aec3639d3891f52fcda1599e1a66d0",
      "docs/tasks/complete/foundation-guardrails/evidence/provenance-review.md": "11a5e91b488d4c5e0ca67320f7acc40276afa4c5d74c98fb9544a9c9b87b735e",
      "docs/tasks/complete/foundation-guardrails/evidence/quality-review.md": "1963254b9c0459225dbc60d3e39dfdf57a4478db0ae981a9886709a1f5d5ecc4",
      "docs/tasks/complete/foundation-guardrails/report.md": "361d9c33da7546aecd9ed5f16dfaa6d667698f92ba92162cd76c1203aa34b17e",
      "docs/tasks/complete/harness-layout-context/evidence/checks.md": "b8ddcf20d7088c67a9d951e47d8ea04b0cc2620703f877133ed586686d7ef0f3",
      "docs/tasks/complete/harness-layout-context/evidence/quality-review.md": "11b50f8238587450f73d12667aca61410a8c53e16dc0903ac7da4c48df02a66e",
      "docs/tasks/complete/harness-layout-context/evidence/review.md": "54765f38b6b1c60214fcf4415a9f883a1759eac4cc07e2ae8932c2b40e65ab16",
      "docs/tasks/complete/harness-layout-context/evidence/skills.md": "db13fae89ba93c8afc34548a33fdb55b8da4db679a20ee8fa8b624f0a1a4aeb5",
      "docs/tasks/complete/harness-layout-context/evidence/usage.md": "87488fb8f7c8e50a62b171d46e4d7dfe7b37647d9e6f6122aad480f74fd9f0a1",
      "docs/tasks/complete/harness-layout-context/report.md": "9d71ffc7eae33d18f07aa91dc3248195c2d6b61735edb176bcd8ced00a851774",
      "docs/tasks/complete/natural-intent-entry-3081618733368d2f/evidence/checks.md": "5dc12622f07316e7673bc2f2bc244fb0c2b2a6637e95dc15b057cb96c3ca9dbe",
      "docs/tasks/complete/natural-intent-entry-3081618733368d2f/evidence/intent-review.md": "cc00eeefff30d63add30999571feeb83442c1447ebbe8b189e80672b628180bc",
      "docs/tasks/complete/natural-intent-entry-3081618733368d2f/report.md": "76a5d0fdc5a9703992ccbf0117a701c77e97ad45464af07de4d64eaad2ebe054",
      "docs/tasks/complete/task-delivery-87a50b174f7db211/evidence/checks.md": "991aa48d1fc01d2691288dfefdf19c45e11230e00c14a950a1cbdbb260988543",
      "docs/tasks/complete/task-delivery-87a50b174f7db211/evidence/journey.md": "65a4bb0acc370642d71771a9bc5c2c50b24a8636b09a9b451b7a329b84528780",
      "docs/tasks/complete/task-delivery-87a50b174f7db211/evidence/quality-review.md": "097f0d4cdea32663d806f3a9f2b40d4270c7aaca99a523f4eae726f9487066b7",
      "docs/tasks/complete/task-delivery-87a50b174f7db211/evidence/review.md": "8db01d27bc5e2612c1fc0c1ebaa94c8f950226276a851e7ca33d4a26664dc6eb",
      "docs/tasks/complete/task-delivery-87a50b174f7db211/report.md": "4ff55870075c31e8f62d772ebaecfe18cbf1ed738e83c25f497d488df8b8de45",
      "docs/tasks/complete/work-coordination/evidence/checks.md": "62e0289a28916509b9338c143572371349f2005463a2200e2b442430dbda4f2b",
      "docs/tasks/complete/work-coordination/evidence/quality-review.md": "283a17e84cb03b728294cdb3028c9c801c8fd3048a21df07ae492fc725bceb01",
      "docs/tasks/complete/work-coordination/evidence/review.md": "a583462ddc8155d886ef5133b47f9f4452ad8ac0e5bc0a7ef7f764c1f27c2e13",
      "docs/tasks/complete/work-coordination/report.md": "c61ab17995f85acb6b80dc503117e761b4711a2bddc5e1ccdb735be9a35a879e",
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
    "candidate": "45a1b34b2f95ffd7516838ecf60486371127f4b7f406103d927ac0ea4e5a747e"
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
      "sourceSha256": "53620bea1aab388f55f8be0a5a57bc7b20a32939f857efa8e696200e0cc63755",
      "path": "evidence/checks.md",
      "sha256": "493fd773bce41f192ca6965664c87b670b1260389466be2a2787852c52ab0e3b",
      "environment": "darwin/arm64; Node v24.22.2"
    },
    {
      "criterion": "prd-workflow",
      "method": "behavior",
      "representation": "original",
      "sourceSha256": "8c2fdfd1866eda962fe32f2a6de0c794d0ab0c63defc7337dba353359a8e460e",
      "path": "evidence/prd-workflow.md",
      "sha256": "a71b1301d3feb13555e45a5c75f3d6bc0c75a2c4ecbfe4605945a462023c2f72",
      "environment": "darwin/arm64; Node v24.22.2"
    },
    {
      "criterion": "replay-review",
      "method": "review",
      "representation": "original",
      "sourceSha256": "e85bdb890e2e3530c19e97127f3aa86eab4230a629288d8b70cec8525872a9cf",
      "path": "evidence/replay-review.md",
      "sha256": "0f50560db7b154cd0561495ef675d2193498c01c923213b51b39692b8a03b857",
      "environment": "darwin/arm64; Node v24.22.2"
    }
  ],
  "acceptance": {
    "candidate": "45a1b34b2f95ffd7516838ecf60486371127f4b7f406103d927ac0ea4e5a747e",
    "statement": "接受演练报告并执行 complete",
    "reference": "2026-11-07当前会话用户对PRD驱动护栏流转验证候选45a1b34b2f95、公共报告、当前121项检查及历史133项/21项/13次观察的适用性复核和限制的明确接受（request_user_input_async sg_call_d8badd6fc5e31_2第0项）。"
  }
}
```
