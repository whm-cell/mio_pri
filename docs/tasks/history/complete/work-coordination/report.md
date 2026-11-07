# 团队任务记录、证据恢复与跨成员交接

任务：work-coordination；实施者：coolm。本报告是指定候选的交付快照，当前规则以现行规格为准。

## 完成功能

成员各自维护.work；CLI核对任务/工作区归属、声明输入/候选、原件方法/摘要，保留失败；显式sync和补证维护恢复边界。handoff与receive支持匹配代码或公共报告接手，接收方不继承授权/证据通过。当前121项完整检查及质量/增量审查通过，原协调独立审查和本轮同字节独立审查共同支持现行调用链。

## 必要决定

保留原checks与review标准，追加现行quality-review。原docs范围展开为8份真实公共契约文档，源码/测试/配置和消费者保留；其他任务结果包无运行/需求依赖，公共完整性由guard另验。无新运行时或治理机制。

## 限制

仅本地CLI和同机夹具证据；单任务单写入者，文件身份/时间核对不是沙箱，成员标签不认证人。未执行真实异机、多人同时写同任务、掉电、生产或远端CI；历史探针与本轮独立审查按范围复用，未声称全部重新运行。当前结果待真实接受，未提交推送部署。

## 验收依据

- checks (automated, excerpt): [原件/摘录](evidence/checks.md)
- review (review, excerpt): [原件/摘录](evidence/review.md)
- quality-review (review, original): [原件/摘录](evidence/quality-review.md)

接受：接受团队协调并执行 complete

来源：2026-11-07当前会话用户对团队任务记录、证据恢复与跨成员交接候选90ac522dc049、公共报告、121项检查及审查和限制的明确接受（request_user_input_async sg_call_3135a7d6b058d_2第0项）。

```mio-task-report
{
  "version": 1,
  "id": "work-coordination",
  "title": "团队任务记录、证据恢复与跨成员交接",
  "author": "coolm",
  "modules": [
    "harness/work"
  ],
  "outcomes": "成员各自维护.work；CLI核对任务/工作区归属、声明输入/候选、原件方法/摘要，保留失败；显式sync和补证维护恢复边界。handoff与receive支持匹配代码或公共报告接手，接收方不继承授权/证据通过。当前121项完整检查及质量/增量审查通过，原协调独立审查和本轮同字节独立审查共同支持现行调用链。",
  "decisions": "保留原checks与review标准，追加现行quality-review。原docs范围展开为8份真实公共契约文档，源码/测试/配置和消费者保留；其他任务结果包无运行/需求依赖，公共完整性由guard另验。无新运行时或治理机制。",
  "limitations": "仅本地CLI和同机夹具证据；单任务单写入者，文件身份/时间核对不是沙箱，成员标签不认证人。未执行真实异机、多人同时写同任务、掉电、生产或远端CI；历史探针与本轮独立审查按范围复用，未声称全部重新运行。当前结果待真实接受，未提交推送部署。",
  "checkpoint": {
    "head": "fe010f2c98fd911a5671128baae464d1a515c913",
    "branch": "codex/work-coordination",
    "files": {
      ".github/workflows/check.yml": "34fbe16e2e1f7b77f4eb1cc1fa4768a67285c8974cce91778aecdbe8d115dab9",
      ".gitignore": "5057cb1e56ff7e9d46008bc042d8ba0d1476763cdfba7ee1df5be943f36e3d4f",
      ".prettierignore": "9a5472b9ff38f589589cdb66131af72720c329880f8bea2904c965f848b71a31",
      ".prettierrc.json": "f583ff6d8ba542b76af46c4c024a0941b77aee51133bb0f69ec6eb1fa613de7e",
      "AGENTS.md": "8dc27d949c45bb4dfc4ee0c7c942e00ce98ce66029fe15747c7e1dd0d51b7eab",
      "README.md": "2789c69736f6a203625e0ba2dd92dbec9dab44e74fff01e77c9ff4f1de8c8220",
      "docs/acceptance.md": "b93851845129e07fbcfde779b78a77cd91e12e6eca56587ecf1572b127455663",
      "docs/api.md": "c4d5983d15eeb2bfefc8be4c675c0103613c1019ac11e3747e7eec19aba59b5f",
      "docs/architecture-ai-drama-foundation.md": "c599e6d9dc12e58606e4c724de50ef96c27c6d73419d226fa4a69cc8e0d0ef92",
      "docs/auth.md": "b1c89f5eb8356ec9d911c30d677ff881b42debd120f73a28d0f1b4934080ad3a",
      "docs/coordination.md": "fb580b351dc300ff559d386d24f73c18fdbcf734ad054fbd5226487c7f13e70e",
      "docs/foundation.md": "b2b28fa3fe66e62771a2eb7015dea40a0b1eb5d89dc18d3cfdc5e482b147ed91",
      "docs/prd-ai-drama-foundation.md": "dc03cbd28435443666fcd3e8077bee4fdf48a0d9d54998665b03fdb02d5bf745",
      "docs/work-records.md": "02a84fa18aad5cdca3a8e11642be4cca5511229cfcfad3b597a76d833fe853b0",
      "eslint.config.mjs": "e017f1c5054b198b785bb5c30c56b6c9ba6e112561e31eac6046dd287bbdf662",
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
      "tests/work.test.ts": "aec79adebfdbd280a1a81aaad83db22ed148690c9dc847c478c88caa8ded832b",
      "tsconfig.build.json": "cac76e1e62da7d8edc1227e57e8f851c1c24e50818d14daac1a8213bd212a10b",
      "tsconfig.json": "2f5163361dcc14c020988e4510de5257ea10081a3aa9b4ea6d35d1ec37572c0d",
      "vitest.config.ts": "8a47dd1c2d0fdd449c39433e35687198ae81b0d5058477ee94139557c76ed8a4"
    },
    "contract": "36924442b024b7c50909064f628424092d3a2e34f5ebd45492980a7b513f34c6",
    "candidate": "90ac522dc0496465817b0a920cffe53b94946e6ff1a617cd2d47e0d0e8b67c92"
  },
  "contract": {
    "goal": "团队成员无需个人 Skills 即可沿仓库协议协调各自 .work",
    "scope": [
      "AGENTS.md",
      "README.md",
      "docs/acceptance.md",
      "docs/api.md",
      "docs/architecture-ai-drama-foundation.md",
      "docs/auth.md",
      "docs/coordination.md",
      "docs/foundation.md",
      "docs/prd-ai-drama-foundation.md",
      "docs/work-records.md",
      "scripts",
      "tests",
      "package.json"
    ],
    "inputs": [
      "src",
      ".github",
      "harness.config.json",
      "pnpm-lock.yaml",
      "tsconfig.json",
      "tsconfig.build.json",
      "vitest.config.ts",
      "eslint.config.mjs",
      ".prettierrc.json",
      ".prettierignore",
      ".gitignore"
    ],
    "sources": [
      "AGENTS.md",
      "docs/coordination.md",
      "docs/work-records.md",
      "docs/foundation.md",
      "docs/api.md"
    ],
    "nonGoals": [
      "修改业务运行时",
      "修改个人 Skills",
      "后台调度",
      "上传或远端提交部署"
    ],
    "acceptance": [
      {
        "id": "checks",
        "criterion": "pnpm check 完整检查通过，其中 CLI 子进程不依赖个人 Skills，正常、失败、恢复、隔离和跨成员接收场景通过",
        "method": "automated"
      },
      {
        "id": "review",
        "criterion": "独立审查当前候选的记录隔离、恢复、证据和交接边界，已确认问题修复",
        "method": "review"
      },
      {
        "id": "quality-review",
        "method": "review",
        "criterion": "审阅算法成本、提取后未使用的公共函数/方法及未复用的已有实现；保留身份、顺序、错误与副作用语义，记录证据、反证和限制。"
      }
    ],
    "decisions": [],
    "dependencies": []
  },
  "evidence": [
    {
      "criterion": "checks",
      "method": "automated",
      "representation": "excerpt",
      "sourceSha256": "0d0c5a2a8cbfa15f7b5c6efd3548de0399584cdefddf84fb54c1a82f1db921bc",
      "path": "evidence/checks.md",
      "sha256": "62e0289a28916509b9338c143572371349f2005463a2200e2b442430dbda4f2b",
      "environment": "darwin/arm64; Node v24.22.2"
    },
    {
      "criterion": "review",
      "method": "review",
      "representation": "excerpt",
      "sourceSha256": "23ef12d10a6287198ccdc089d6641cef894b6e18d24c8194c2ed2218d4dd6e01",
      "path": "evidence/review.md",
      "sha256": "a583462ddc8155d886ef5133b47f9f4452ad8ac0e5bc0a7ef7f764c1f27c2e13",
      "environment": "darwin/arm64; Node v24.22.2"
    },
    {
      "criterion": "quality-review",
      "method": "review",
      "representation": "original",
      "sourceSha256": "23ef12d10a6287198ccdc089d6641cef894b6e18d24c8194c2ed2218d4dd6e01",
      "path": "evidence/quality-review.md",
      "sha256": "283a17e84cb03b728294cdb3028c9c801c8fd3048a21df07ae492fc725bceb01",
      "environment": "darwin/arm64; Node v24.22.2"
    }
  ],
  "acceptance": {
    "candidate": "90ac522dc0496465817b0a920cffe53b94946e6ff1a617cd2d47e0d0e8b67c92",
    "statement": "接受团队协调并执行 complete",
    "reference": "2026-11-07当前会话用户对团队任务记录、证据恢复与跨成员交接候选90ac522dc049、公共报告、121项检查及审查和限制的明确接受（request_user_input_async sg_call_3135a7d6b058d_2第0项）。"
  }
}
```
