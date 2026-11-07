# 已接受开发成果

PRD：[docs/prd-ai-drama-foundation.md](../../../prd-ai-drama-foundation.md)。这里只汇总以下范围的已接受成果，不宣称整份 PRD、当前源码或生产验收完成。每项保留自己的受验版本；新工作不会自动继承旧通过。

## auth-registration-foundation

**邮箱密码注册、持久会话与可信身份底座**

已接受服务端邮箱密码自助注册/登录、持久会话与撤销、密码更新及可信 /me 身份入口；固定 Origin、方法、正文和 Cookie 边界，显式迁移，插件释放连接，服务 token 与用户身份分离。原受验候选记录了 10 项真实 PostgreSQL/DSH 认证测试、121 项完整检查、构建及打包 smoke，并记录 17 份实现/配置/测试文件与历史独立审查候选同字节及增量审查。实现与契约入口为 src/auth、src/plugin.ts、scripts/service/migrate-auth.ts、tests/auth.test.ts 和 docs/auth.md。本次仅整理该既有接受成果的公共入口。

必要决定：负责人已确认个人项目/单实例、自助注册且注册即可登录，首期无邮箱验证；采用固定 Better Auth 1.7.18、pg 8.23.1 与 PostgreSQL。完全无认证配置保留基础 Profile，部分配置拒绝装载，服务 token 不作为用户身份。是否接受以保留原文的 acceptance 字段为准；历史正文中的待接受措辞原字节保留在历史包，不作为当前状态。

限制：仅覆盖原候选的本地认证基础切片。没有真实浏览器、邮箱所有权/邮件、团队/多租户、项目 CRUD、生成、代理链/多实例容量、生产或远端 CI 证据。公开依据含检查与审查摘要；历史独立原日志未随包公开，不宣称全部原件可公开取得。本次迁移没有重验历史认证专项或重跑独立审查，不表示当前代码已重新验收、S0 整体完成或后续项目/生成能力交付。

受验候选：54b01395a4f817c1ca00af268c97f27a297df1abb14ec43d8fe55127e81eb18a；Git HEAD：fe010f2c98fd911a5671128baae464d1a515c913。精确文件摘要与契约摘要见下方版本绑定，不把 HEAD 当作未提交内容的身份。

- checks (automated, excerpt): [公开依据](../../history/complete/auth-registration-foundation-ac88ccd0f34f1c0c/evidence/checks.md)
- auth-behavior (automated, excerpt): [公开依据](../../history/complete/auth-registration-foundation-ac88ccd0f34f1c0c/evidence/auth-behavior.md)
- quality-review (review, original): [公开依据](../../history/complete/auth-registration-foundation-ac88ccd0f34f1c0c/evidence/quality-review.md)

接受：接受认证底座并执行 complete

来源：2026-11-07 当前会话用户对认证底座候选54b01395a4f8及公共报告/10项DB-DSH测试、121项完整检查和限制的接受答复（request_user_input_async问题call_xl8u7X194vIy2jBtkeal7Vzt第0项）。

```mio-prd-results
{
  "version": 2,
  "prd": "docs/prd-ai-drama-foundation.md",
  "results": [
    {
      "key": "auth-registration-foundation",
      "title": "邮箱密码注册、持久会话与可信身份底座",
      "modules": [
        "auth",
        "plugin",
        "service/auth-migration"
      ],
      "outcomes": "已接受服务端邮箱密码自助注册/登录、持久会话与撤销、密码更新及可信 /me 身份入口；固定 Origin、方法、正文和 Cookie 边界，显式迁移，插件释放连接，服务 token 与用户身份分离。原受验候选记录了 10 项真实 PostgreSQL/DSH 认证测试、121 项完整检查、构建及打包 smoke，并记录 17 份实现/配置/测试文件与历史独立审查候选同字节及增量审查。实现与契约入口为 src/auth、src/plugin.ts、scripts/service/migrate-auth.ts、tests/auth.test.ts 和 docs/auth.md。本次仅整理该既有接受成果的公共入口。",
      "decisions": "负责人已确认个人项目/单实例、自助注册且注册即可登录，首期无邮箱验证；采用固定 Better Auth 1.7.18、pg 8.23.1 与 PostgreSQL。完全无认证配置保留基础 Profile，部分配置拒绝装载，服务 token 不作为用户身份。是否接受以保留原文的 acceptance 字段为准；历史正文中的待接受措辞原字节保留在历史包，不作为当前状态。",
      "limitations": "仅覆盖原候选的本地认证基础切片。没有真实浏览器、邮箱所有权/邮件、团队/多租户、项目 CRUD、生成、代理链/多实例容量、生产或远端 CI 证据。公开依据含检查与审查摘要；历史独立原日志未随包公开，不宣称全部原件可公开取得。本次迁移没有重验历史认证专项或重跑独立审查，不表示当前代码已重新验收、S0 整体完成或后续项目/生成能力交付。",
      "version": {
        "candidate": "54b01395a4f817c1ca00af268c97f27a297df1abb14ec43d8fe55127e81eb18a",
        "head": "fe010f2c98fd911a5671128baae464d1a515c913",
        "files": {
          ".github/workflows/check.yml": "34fbe16e2e1f7b77f4eb1cc1fa4768a67285c8974cce91778aecdbe8d115dab9",
          "AGENTS.md": "8dc27d949c45bb4dfc4ee0c7c942e00ce98ce66029fe15747c7e1dd0d51b7eab",
          "README.md": "2789c69736f6a203625e0ba2dd92dbec9dab44e74fff01e77c9ff4f1de8c8220",
          "cordis.patch.yml": "b56967b4d59c171ee471bcdd73abb3606287d64db5423ecee56adba992617bfd",
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
          "scripts/harness/check-source.ts": "148878c27d3cb2fb020f1c0079c76db31cd9a951ae7e58e7c4156e862cb40fda",
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
        "contract": "6e06bb09e7be2281448e47894362eb861859a918ed8c0df507da5b8996fd4c00"
      },
      "criteria": [
        {
          "id": "checks",
          "method": "automated",
          "criterion": "完整pnpm check通过；认证相关格式/类型/护栏/生命周期与打包产物验证通过"
        },
        {
          "id": "auth-behavior",
          "method": "automated",
          "criterion": "隔离真实PostgreSQL+DSH HTTP下完成注册/重复注册/错误密码/登录/查询会话/退出及失效、密码更新与其他会话撤销；验证数据库持久化、重启、过期/无效身份、Origin/方法/请求大小与节流，以及现有工具拒绝保持"
        },
        {
          "id": "quality-review",
          "method": "review",
          "criterion": "独立审查真实认证/DB/HTTP调用链、资源释放、身份来源、密码/会话泄漏与权限边界，算法和公共函数复用有依据"
        }
      ],
      "evidence": [
        {
          "criterion": "checks",
          "method": "automated",
          "representation": "excerpt",
          "sourceSha256": "e27c159374de728f29fb96bbccfe85bf2dca3ec9761434c79b55598376369c27",
          "path": "docs/tasks/history/complete/auth-registration-foundation-ac88ccd0f34f1c0c/evidence/checks.md",
          "sha256": "3fc80028f8b9f906d1f1a54d1ddaaaad9178634e6d5e4d62c2f02fe3a9017466",
          "environment": "darwin/arm64; Node v24.22.2"
        },
        {
          "criterion": "auth-behavior",
          "method": "automated",
          "representation": "excerpt",
          "sourceSha256": "0f5046f21c7334e4180245915a4510ae06034c1b6523382328c5a792dbd5149c",
          "path": "docs/tasks/history/complete/auth-registration-foundation-ac88ccd0f34f1c0c/evidence/auth-behavior.md",
          "sha256": "f6e9bf01a4190402fbe82636ebff57a533cf6cb938231623d4633fb347535f59",
          "environment": "darwin/arm64; Node v24.22.2"
        },
        {
          "criterion": "quality-review",
          "method": "review",
          "representation": "original",
          "sourceSha256": "54cff48613fd0889655c8622cc14efa837d54bf687cb754f7cf8ffcfb138b3e5",
          "path": "docs/tasks/history/complete/auth-registration-foundation-ac88ccd0f34f1c0c/evidence/quality-review.md",
          "sha256": "d38ed237a07a57b2c9d8603b338cb1880b0d3b1f995fe2fb9ba50ae34c22d1dc",
          "environment": "darwin/arm64; Node v24.22.2"
        }
      ],
      "acceptance": {
        "candidate": "54b01395a4f817c1ca00af268c97f27a297df1abb14ec43d8fe55127e81eb18a",
        "statement": "接受认证底座并执行 complete",
        "reference": "2026-11-07 当前会话用户对认证底座候选54b01395a4f8及公共报告/10项DB-DSH测试、121项完整检查和限制的接受答复（request_user_input_async问题call_xl8u7X194vIy2jBtkeal7Vzt第0项）。"
      }
    }
  ]
}
```
