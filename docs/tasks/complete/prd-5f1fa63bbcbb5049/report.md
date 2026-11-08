# 已接受开发成果

PRD：[docs/prd-ai-drama-foundation.md](../../../prd-ai-drama-foundation.md)。各成果按 key 阅读；每项仅表示自己的受验候选与接受范围，不代表整份 PRD、当前源码或生产验收完成。完整版本和逐项公开依据保存在同一份[结构化记录](records.json)，新工作不继承旧通过。

## auth-http-shared-primitives

**auth 与基础 HTTP 公共能力抽取**

已在 src/http-response.ts 实现 startHttpResponse 与 writeApiError，由 Foundation 和认证两个实际处理器共同消费，移除原重复头与包装错误序列化。AUTH_BASE_PATH 统一库配置、路由注册与路径截取；正文限制只作局部命名。保留两域 Origin 顺序、Content-Type/204/CORS、原始库状态和字节、多 Set-Cookie、可信身份与生命周期。现有 AST 增量约束共同模块依赖，公开导航可发现实际能力；需求/方案、六规范页与旧接受成果完成 v2 对账。

必要决定：采用提案的最小共享范围，保持完整处理器与域策略独立；正文读取和现有 identity 保留原职责，未引入新身份层、通用路由/CORS策略、相似代码发现或自动抽取平台。六类试点是本次采纳的有界验证，未新增每次业务必跑的状态系统或全套门禁。旧 auth-registration-foundation 接受仍绑定原候选，49份成果、历史与索引原字节保留；本结果使用独立成果键。

限制：已观察到既有诊断 CLI 在 macOS /var 路径别名根下误报正常链接为 LINK_PRIVATE；传 canonical 实际路径可通过，本轮未扩修。AST只检查当前模块路径与依赖，语义复用、真实消费者和接受事实仍需独立核对。本轮有界样例不证明总体可靠性或未来发现效率。多Cookie/原始体试验使用受控上游响应；发现演练使用确定身份替身与真实Node HTTP，不能替代已另跑的真实PG/DSH认证回归。正文读取仅等值命名，未新增精确16KiB/10秒直接边界断言；无真实浏览器、代理链/多实例容量、远端CI、项目/生成或生产验收。

受验候选：c94684dbce33a9a00c52fa8c0f141a1ad861c4975d58be674d5a73fa38068c4b；Git HEAD：2cd4c3b1d3f48b45af16058442bf9624515e1795。

- checks (automated): 当前候选 pnpm check 全部通过，涵盖类型/格式/lint/AST/文档/全量测试/构建/官方打包 DSH smoke；新增 helper 有合法与违规 AST 样例。。通过；excerpt；公开依据 SHA256 45274b3c3e28755f6f5141f20219113354605b1c43d2632eff06c5c79aee15bd。
- http-behavior (automated): 相同独立预期在抽取前旧实现及抽取后真实 DSH HTTP 入口通过；隔离 PostgreSQL auth 回归通过，受控适配器对照证明原始字节、多 Cookie、CORS/204/请求 ID 与错误差异保持。。通过；excerpt；公开依据 SHA256 64beebd7ed935fdcfeb2c6ed8e1bc123d3e27a15f35e2a7842ef422985405515。
- guardrail-stability (review): 完成提案六类有界试点及机械正反对照，独立发现/复用演练与盲评留原件，明确命中、逃逸、误报、限制与净收益；49 份既有接受/历史文件逐字节保留。。通过；excerpt；公开依据 SHA256 314cd5f453328b565b21a7c9227283f115ff2ecd0c30083269a3ca77c0ca5762。
- quality-review (review): 审阅算法成本、提取后未使用的公共函数/方法及未复用的已有实现；保留身份、顺序、错误与副作用语义，记录证据、反证和限制。。通过；excerpt；公开依据 SHA256 88d015f11361f2fb909ec2c4620546ddf44decbabe7d7a371339cbd7c3792807。
- norms-review (review): 交回前对账需求与方案、现行规范、已接受成果；审阅当前候选页面、完成范围和剩余决定，保留接受事实与未采用状态。。通过；excerpt；公开依据 SHA256 23eaf0b7f2d96cbd93fb2c2a22d2192d7a0f7e2788347576fa5f59c0f592c5c5。

接受：接受这次 auth 和基础 HTTP 公共能力抽取的成果及已披露限制，按现有流程进入 complete，保留原 auth 已完成的成果与证据。

来源：2026-11-08当前会话用户对上轮已交回auth-http-shared-primitives及其披露限制的明确接受和complete指令

## auth-registration-foundation

**邮箱密码注册、持久会话与可信身份底座**

已接受服务端邮箱密码自助注册/登录、持久会话与撤销、密码更新及可信 /me 身份入口；固定 Origin、方法、正文和 Cookie 边界，显式迁移，插件释放连接，服务 token 与用户身份分离。原受验候选记录了 10 项真实 PostgreSQL/DSH 认证测试、121 项完整检查、构建及打包 smoke，并记录 17 份实现/配置/测试文件与历史独立审查候选同字节及增量审查。实现与契约入口为 src/auth、src/plugin.ts、scripts/service/migrate-auth.ts、tests/auth.test.ts 和 docs/auth.md。本次仅整理该既有接受成果的公共入口。

必要决定：负责人已确认个人项目/单实例、自助注册且注册即可登录，首期无邮箱验证；采用固定 Better Auth 1.7.18、pg 8.23.1 与 PostgreSQL。完全无认证配置保留基础 Profile，部分配置拒绝装载，服务 token 不作为用户身份。是否接受以保留原文的 acceptance 字段为准；历史正文中的待接受措辞原字节保留在历史包，不作为当前状态。

限制：仅覆盖原候选的本地认证基础切片。没有真实浏览器、邮箱所有权/邮件、团队/多租户、项目 CRUD、生成、代理链/多实例容量、生产或远端 CI 证据。公开依据含检查与审查摘要；历史独立原日志未随包公开，不宣称全部原件可公开取得。本次迁移没有重验历史认证专项或重跑独立审查，不表示当前代码已重新验收、S0 整体完成或后续项目/生成能力交付。

受验候选：54b01395a4f817c1ca00af268c97f27a297df1abb14ec43d8fe55127e81eb18a；Git HEAD：fe010f2c98fd911a5671128baae464d1a515c913。

- checks (automated): 完整pnpm check通过；认证相关格式/类型/护栏/生命周期与打包产物验证通过。通过；excerpt；公开依据 SHA256 3fc80028f8b9f906d1f1a54d1ddaaaad9178634e6d5e4d62c2f02fe3a9017466。
- auth-behavior (automated): 隔离真实PostgreSQL+DSH HTTP下完成注册/重复注册/错误密码/登录/查询会话/退出及失效、密码更新与其他会话撤销；验证数据库持久化、重启、过期/无效身份、Origin/方法/请求大小与节流，以及现有工具拒绝保持。通过；excerpt；公开依据 SHA256 f6e9bf01a4190402fbe82636ebff57a533cf6cb938231623d4633fb347535f59。
- quality-review (review): 独立审查真实认证/DB/HTTP调用链、资源释放、身份来源、密码/会话泄漏与权限边界，算法和公共函数复用有依据。通过；original；公开依据 SHA256 d38ed237a07a57b2c9d8603b338cb1880b0d3b1f995fe2fb9ba50ae34c22d1dc。

接受：接受认证底座并执行 complete

来源：2026-11-07 当前会话用户对认证底座候选54b01395a4f8及公共报告/10项DB-DSH测试、121项完整检查和限制的接受答复（request_user_input_async问题call_xl8u7X194vIy2jBtkeal7Vzt第0项）。

```mio-prd-results
{
  "version": 4,
  "prd": "docs/prd-ai-drama-foundation.md",
  "records": {
    "path": "docs/tasks/complete/prd-5f1fa63bbcbb5049/records.json",
    "sha256": "aa6654b6b6b4f41544645551163c49278abf168ac1ef70836ff0a24418bce2f0"
  }
}
```
