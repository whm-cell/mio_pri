# Agent 维护 PRD 子任务与中断续接

任务：agent-workflow-d298d07dba5afe60；实施者：coolm。本报告是指定候选的交付快照，当前规则以现行规格为准。

## 完成功能

ensure按公共来源和稳定子任务键复用记录，update以revision拒绝过期与受保护字段覆盖，成员原子发布保留本地归属，候选/原件与授权边界不混淆。当前121项检查通过；未实施者独立审查并实际执行9组CLI反例。两个分离上下文沿公开入口完成首次建档、有界PRD文档修改、中断和同一任务续接，最终发布隔离pending且未伪造接受。

## 必要决定

复用原任务和验收；补现行quality-review及实际测试消费者输入，不改变原journey标准。独立首次观察后停止lab写入，再由新上下文续接；原失败、原候选和原件均保留。

## 限制

同机一次有界文档fixture；首段操作者先审源码，第二段无首段结论/历史/个人Skills。有限文档自审不是人类业务审查；未验证异机、任意宿主、掉电持久性、真实团队/生产/远端CI。CLI不能认证人类授权，单任务单写入者为前提。真实结果待接受，未提交/推送/部署。

## 验收依据

- checks (automated, excerpt): [原件/摘录](evidence/checks.md)
- review (review, excerpt): [原件/摘录](evidence/review.md)
- journey (behavior, original): [原件/摘录](evidence/journey.md)
- quality-review (review, original): [原件/摘录](evidence/quality-review.md)

接受：接受并执行 complete

来源：2026-11-07当前会话用户对Agent维护PRD子任务与中断续接候选9bb2ae774afd、公共报告、121项检查、独立审查/9组边界观察/两次分离上下文续接及同机演练限制的明确接受（request_user_input_async sg_call_dfbd0dd396a13_1第0项）。

```mio-task-report
{
  "version": 1,
  "id": "agent-workflow-d298d07dba5afe60",
  "title": "Agent 维护 PRD 子任务与中断续接",
  "author": "coolm",
  "modules": [
    "harness/work"
  ],
  "outcomes": "ensure按公共来源和稳定子任务键复用记录，update以revision拒绝过期与受保护字段覆盖，成员原子发布保留本地归属，候选/原件与授权边界不混淆。当前121项检查通过；未实施者独立审查并实际执行9组CLI反例。两个分离上下文沿公开入口完成首次建档、有界PRD文档修改、中断和同一任务续接，最终发布隔离pending且未伪造接受。",
  "decisions": "复用原任务和验收；补现行quality-review及实际测试消费者输入，不改变原journey标准。独立首次观察后停止lab写入，再由新上下文续接；原失败、原候选和原件均保留。",
  "limitations": "同机一次有界文档fixture；首段操作者先审源码，第二段无首段结论/历史/个人Skills。有限文档自审不是人类业务审查；未验证异机、任意宿主、掉电持久性、真实团队/生产/远端CI。CLI不能认证人类授权，单任务单写入者为前提。真实结果待接受，未提交/推送/部署。",
  "checkpoint": {
    "head": "fe010f2c98fd911a5671128baae464d1a515c913",
    "branch": "codex/work-coordination",
    "files": {
      "AGENTS.md": "8dc27d949c45bb4dfc4ee0c7c942e00ce98ce66029fe15747c7e1dd0d51b7eab",
      "README.md": "2789c69736f6a203625e0ba2dd92dbec9dab44e74fff01e77c9ff4f1de8c8220",
      "docs/acceptance.md": "b93851845129e07fbcfde779b78a77cd91e12e6eca56587ecf1572b127455663",
      "docs/coordination.md": "fb580b351dc300ff559d386d24f73c18fdbcf734ad054fbd5226487c7f13e70e",
      "docs/foundation.md": "b2b28fa3fe66e62771a2eb7015dea40a0b1eb5d89dc18d3cfdc5e482b147ed91",
      "docs/work-records.md": "02a84fa18aad5cdca3a8e11642be4cca5511229cfcfad3b597a76d833fe853b0",
      "harness.config.json": "a9da9600e84861aecf57557c6e0c9abed8f795fd9dc1b7f4552c9f6bceef450f",
      "package.json": "530cde7c6d11881919423726183f5097dd32e2c6f2dd5bdb84b98ce17279498d",
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
      "tests/delivery.test.ts": "fbf1b48c72ce77d158621937ec7a17cd742cfa2cd196bd27fb966dedfd6332b5",
      "tests/quality-review-fixture.ts": "4163747ecbaab7aad6d68abc9a98669d955fa49864d4a38299549064598d5e8d",
      "tests/quality-review.test.ts": "4a85a0c65949b3031c5b30ab888612dd05f0dfef66736f208da4800a6948ba8d",
      "tests/work.test.ts": "aec79adebfdbd280a1a81aaad83db22ed148690c9dc847c478c88caa8ded832b",
      "tsconfig.json": "2f5163361dcc14c020988e4510de5257ea10081a3aa9b4ea6d35d1ec37572c0d"
    },
    "contract": "caeb642163e22286a00daa1618a6bf85b8f37b3a1adf670dfc83fad0a685d66d",
    "candidate": "9bb2ae774afdab1886ca9704054fa83b34f0c06082d9a63719f66e382c5ad041"
  },
  "contract": {
    "requirement": {
      "source": "docs/foundation.md",
      "section": "结构决定",
      "key": "agent-workflow"
    },
    "goal": "由当前 Agent 自动维护 PRD 子任务的个人工作目录，结构化建档与更新并可靠续接",
    "scope": [
      "AGENTS.md",
      "README.md",
      "docs/coordination.md",
      "docs/work-records.md",
      "docs/foundation.md",
      "docs/acceptance.md",
      "scripts/harness/work",
      "tests/work.test.ts"
    ],
    "inputs": [
      "package.json",
      "harness.config.json",
      "tsconfig.json",
      "tests/delivery.test.ts",
      "tests/quality-review.test.ts",
      "tests/quality-review-fixture.ts"
    ],
    "sources": [
      "docs/foundation.md"
    ],
    "nonGoals": [
      "不改产品运行时",
      "不引入常驻调度、数据库或任务平台",
      "不提交、推送或部署",
      "不把 Agent 判断当作人类接受"
    ],
    "acceptance": [
      {
        "id": "checks",
        "criterion": "相关合法、冲突、恢复与兼容场景通过，pnpm check 通过",
        "method": "automated"
      },
      {
        "id": "review",
        "criterion": "独立审阅身份、记录持久化、候选和权限保证，无遗留已确认缺陷",
        "method": "review"
      },
      {
        "id": "journey",
        "criterion": "独立上下文仅凭仓库入口完成首次执行、中断和同一子任务续接，无需用户手动维护记录",
        "method": "behavior"
      },
      {
        "id": "quality-review",
        "method": "review",
        "criterion": "审阅算法成本、提取后未使用的公共函数/方法及未复用的已有实现；保留身份、顺序、错误与副作用语义，记录证据、反证和限制。"
      }
    ],
    "decisions": [
      {
        "status": "CONFIRMED",
        "text": "用户提供目标和决定，当前 Agent 操作 CLI 并维护 .work；公共协议不依赖个人 Skills",
        "source": "当前项目负责人关于 .work 工作流的明确澄清和实施指令"
      },
      {
        "status": "AI_PROPOSED",
        "text": "在现有 CLI 增加 ensure 与带 revision 的受限 update；保留现有 v1 记录与证据模型",
        "source": "本次按已确认目标选定的可逆实现细节"
      }
    ],
    "dependencies": []
  },
  "evidence": [
    {
      "criterion": "checks",
      "method": "automated",
      "representation": "excerpt",
      "sourceSha256": "5e696ec87efdc2b8373f8c3b545b4fd406144929d734e9bd40d1d7dc72b056cf",
      "path": "evidence/checks.md",
      "sha256": "3d626d5b86086b9ebcf814520fc24f6aab7efd37ae71aa5ae7bacf39e153f26f",
      "environment": "darwin/arm64; Node v24.22.2"
    },
    {
      "criterion": "review",
      "method": "review",
      "representation": "excerpt",
      "sourceSha256": "d0d1baab2dd8b4a239642d5367be43363bd40e96ae26d3941c214cede27160d2",
      "path": "evidence/review.md",
      "sha256": "9ef9c753c8f70e4a5bc732e516405e35d5096b71b6c01fef62327591c3fc1937",
      "environment": "darwin/arm64; Node v24.22.2"
    },
    {
      "criterion": "journey",
      "method": "behavior",
      "representation": "original",
      "sourceSha256": "1de2cfe2cabb133fd205aa25f48b72f573a91b78aa638ad81ef9f93e359ef5f2",
      "path": "evidence/journey.md",
      "sha256": "5b7b262aa2928cdbf579c34001075df9d15e239b95bd43e2f09240f44d536751",
      "environment": "darwin/arm64; Node v24.22.2"
    },
    {
      "criterion": "quality-review",
      "method": "review",
      "representation": "original",
      "sourceSha256": "d0d1baab2dd8b4a239642d5367be43363bd40e96ae26d3941c214cede27160d2",
      "path": "evidence/quality-review.md",
      "sha256": "03d81747f638d03ff25542fc27b5d5bfa37e8a6fa80c7532f98c032fbd79c54b",
      "environment": "darwin/arm64; Node v24.22.2"
    }
  ],
  "acceptance": {
    "candidate": "9bb2ae774afdab1886ca9704054fa83b34f0c06082d9a63719f66e382c5ad041",
    "statement": "接受并执行 complete",
    "reference": "2026-11-07当前会话用户对Agent维护PRD子任务与中断续接候选9bb2ae774afd、公共报告、121项检查、独立审查/9组边界观察/两次分离上下文续接及同机演练限制的明确接受（request_user_input_async sg_call_dfbd0dd396a13_1第0项）。"
  }
}
```
