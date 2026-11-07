# TypeScript 插件底座与基础护栏

任务：foundation-guardrails；实施者：coolm。本报告是指定候选的交付快照，当前规则以现行规格为准。

## 完成功能

最小插件通过固定DSH公开Profile装载，提供探针和受服务凭据保护的能力查询、默认工具拒绝与卸载资源释放；AST/源码覆盖/模块方向/文档和私有索引检查具备合法违规反例。恢复原foundation-guardrails任务ID，29文件历史摘要与初始化提交精确匹配。当前121项完整检查、构建/正式产物smoke、peer兼容检查及质量/来源复核通过。

## 必要决定

保留初始化最小范围和历史未接受事实，不把后续认证/项目/生成等同初始完成范围。HTTP契约与Profile/启动入口同历史受验字节；后续增量沿对应独立原件和当前回归核对。公共索引已有任务但本地state缺失，本次明确恢复记录而不伪造历史接受。

## 限制

本次复用已安装依赖，未重新干净安装；历史干净安装原件只证明初始化候选。未验证真实模型、浏览器、项目业务、异机、生产或远端CI。独立审查按实际范围复用，本次是主控适用性复核，不声称全数新独立运行。仅本地交付，未提交推送部署；待当前候选真实接受。

## 验收依据

- checks (automated, excerpt): [原件/摘录](evidence/checks.md)
- peers (automated, excerpt): [原件/摘录](evidence/peers.md)
- provenance-review (review, excerpt): [原件/摘录](evidence/provenance-review.md)
- quality-review (review, original): [原件/摘录](evidence/quality-review.md)

接受：接受基础护栏并执行 complete

来源：2026-11-07当前会话用户对TypeScript插件底座与基础护栏候选dec07b6a78b0、公共报告、121项检查/正式打包装载/依赖兼容/审查及历史安装限制的明确接受（request_user_input_async sg_call_d03722391014c_1第0项）。

```mio-task-report
{
  "version": 1,
  "id": "foundation-guardrails",
  "title": "TypeScript 插件底座与基础护栏",
  "author": "coolm",
  "modules": [
    "foundation",
    "harness",
    "service-profile"
  ],
  "outcomes": "最小插件通过固定DSH公开Profile装载，提供探针和受服务凭据保护的能力查询、默认工具拒绝与卸载资源释放；AST/源码覆盖/模块方向/文档和私有索引检查具备合法违规反例。恢复原foundation-guardrails任务ID，29文件历史摘要与初始化提交精确匹配。当前121项完整检查、构建/正式产物smoke、peer兼容检查及质量/来源复核通过。",
  "decisions": "保留初始化最小范围和历史未接受事实，不把后续认证/项目/生成等同初始完成范围。HTTP契约与Profile/启动入口同历史受验字节；后续增量沿对应独立原件和当前回归核对。公共索引已有任务但本地state缺失，本次明确恢复记录而不伪造历史接受。",
  "limitations": "本次复用已安装依赖，未重新干净安装；历史干净安装原件只证明初始化候选。未验证真实模型、浏览器、项目业务、异机、生产或远端CI。独立审查按实际范围复用，本次是主控适用性复核，不声称全数新独立运行。仅本地交付，未提交推送部署；待当前候选真实接受。",
  "checkpoint": {
    "head": "fe010f2c98fd911a5671128baae464d1a515c913",
    "branch": "codex/work-coordination",
    "files": {
      ".editorconfig": "49e53afa4ae47ecc7446a8b471792dbbc91575262b3d3b161b063801aa096f5f",
      ".github/workflows/check.yml": "34fbe16e2e1f7b77f4eb1cc1fa4768a67285c8974cce91778aecdbe8d115dab9",
      ".gitignore": "5057cb1e56ff7e9d46008bc042d8ba0d1476763cdfba7ee1df5be943f36e3d4f",
      ".node-version": "9185b9f67843cabfa8054f65ce47ce0b52036b0bfe07ae5a6b834d97cc127140",
      ".npmrc": "3b88d1057add6f92ec23dc22dd017e312ded13a042deb0ba6f08bad85d936456",
      ".prettierignore": "9a5472b9ff38f589589cdb66131af72720c329880f8bea2904c965f848b71a31",
      ".prettierrc.json": "f583ff6d8ba542b76af46c4c024a0941b77aee51133bb0f69ec6eb1fa613de7e",
      "AGENTS.md": "8dc27d949c45bb4dfc4ee0c7c942e00ce98ce66029fe15747c7e1dd0d51b7eab",
      "README.md": "2789c69736f6a203625e0ba2dd92dbec9dab44e74fff01e77c9ff4f1de8c8220",
      "cordis.patch.yml": "b56967b4d59c171ee471bcdd73abb3606287d64db5423ecee56adba992617bfd",
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
      "pnpm-workspace.yaml": "bb63c16b84cceb1228abb3366dff0f0054a1a8619512492a31eae12c583d4b99",
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
    "contract": "b8763c53b69481f8360c9d84b3360580e579b9851ae8b0f5a730d909c1938101",
    "candidate": "dec07b6a78b05b0e3e4ec3c0720c1ab79941ddd241b1de7716ba104f27f0fc51"
  },
  "contract": {
    "goal": "核对并交付最小TS插件底座、工程护栏和正式DSH装载，恢复已有历史任务而不新增业务范围",
    "scope": [
      "src",
      "scripts",
      "tests",
      ".github",
      "AGENTS.md",
      "README.md",
      "package.json",
      "pnpm-lock.yaml",
      "harness.config.json",
      "cordis.patch.yml",
      "docs/acceptance.md",
      "docs/api.md",
      "docs/architecture-ai-drama-foundation.md",
      "docs/auth.md",
      "docs/coordination.md",
      "docs/foundation.md",
      "docs/prd-ai-drama-foundation.md",
      "docs/work-records.md"
    ],
    "inputs": [
      "pnpm-workspace.yaml",
      "tsconfig.json",
      "tsconfig.build.json",
      "eslint.config.mjs",
      "vitest.config.ts",
      ".gitignore",
      ".prettierignore",
      ".prettierrc.json",
      ".node-version",
      ".npmrc",
      ".editorconfig"
    ],
    "sources": [
      "docs/foundation.md",
      "docs/api.md",
      "docs/acceptance.md"
    ],
    "nonGoals": [
      "不把后续auth/项目/生成业务并入初始foundation完成范围",
      "不重做初始化或覆盖历史原件",
      "不声称历史干净安装是当前新执行",
      "不提交推送部署或访问真实模型/已有业务数据库"
    ],
    "acceptance": [
      {
        "id": "checks",
        "method": "automated",
        "criterion": "现行pnpm check完整通过，格式/类型/lint/AST与文档/私有索引/源码覆盖、合法违规反例、真实DSH HTTP工具拒绝/装卸、构建及正式打包Profile鉴权和关闭端口释放通过"
      },
      {
        "id": "peers",
        "method": "automated",
        "criterion": "当前固定依赖peer兼容检查通过；不安装新依赖或更改锁文件"
      },
      {
        "id": "provenance-review",
        "method": "review",
        "criterion": "恢复原foundation范围/授权/历史工程摘要与可取得原件，核对当前变化、原独立审查适用性与现行最小底座契约，明确历史干净安装/当前依赖复用及未验证边界，不继承旧接受"
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
        "text": "TS插件独立通过固定DSH公开接口装载，最小服务探针/受保护能力查询，工具默认拒绝，当前只交本地底座",
        "source": "docs/foundation.md及Git b921a835:docs/acceptance.md初始化记录"
      }
    ],
    "dependencies": []
  },
  "evidence": [
    {
      "criterion": "checks",
      "method": "automated",
      "representation": "excerpt",
      "sourceSha256": "33ca7d61620c237b9f1af2338562bf7d2cdb5fbd22e94a2a149a5b0c402df750",
      "path": "evidence/checks.md",
      "sha256": "ee92de93a46b97a2c5b3982af2a91e78dc66bb903deba258bae1b8dfc3cd53f9",
      "environment": "darwin/arm64; Node v24.22.2"
    },
    {
      "criterion": "peers",
      "method": "automated",
      "representation": "excerpt",
      "sourceSha256": "f1fd58a97ef642447be1810b732fc39ebe2e5697701d717003d93ea76aca8867",
      "path": "evidence/peers.md",
      "sha256": "ffcf21b2fe0f88164af9623e1beec3f3f3aec3639d3891f52fcda1599e1a66d0",
      "environment": "darwin/arm64; Node v24.22.2"
    },
    {
      "criterion": "provenance-review",
      "method": "review",
      "representation": "excerpt",
      "sourceSha256": "da0872ae07cce024e40c60d26a160e010b5f482db2de8337ea78fd760f806fe7",
      "path": "evidence/provenance-review.md",
      "sha256": "11a5e91b488d4c5e0ca67320f7acc40276afa4c5d74c98fb9544a9c9b87b735e",
      "environment": "darwin/arm64; Node v24.22.2"
    },
    {
      "criterion": "quality-review",
      "method": "review",
      "representation": "original",
      "sourceSha256": "da0872ae07cce024e40c60d26a160e010b5f482db2de8337ea78fd760f806fe7",
      "path": "evidence/quality-review.md",
      "sha256": "1963254b9c0459225dbc60d3e39dfdf57a4478db0ae981a9886709a1f5d5ecc4",
      "environment": "darwin/arm64; Node v24.22.2"
    }
  ],
  "acceptance": {
    "candidate": "dec07b6a78b05b0e3e4ec3c0720c1ab79941ddd241b1de7716ba104f27f0fc51",
    "statement": "接受基础护栏并执行 complete",
    "reference": "2026-11-07当前会话用户对TypeScript插件底座与基础护栏候选dec07b6a78b0、公共报告、121项检查/正式打包装载/依赖兼容/审查及历史安装限制的明确接受（request_user_input_async sg_call_d03722391014c_1第0项）。"
  }
}
```
