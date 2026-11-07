# 已接受开发成果详情

PRD：[docs/prd-ai-drama-foundation.md](../../../../prd-ai-drama-foundation.md)；[成果导航](../report.md#auth-http-shared-primitives)。本页仅表示下面候选的接受范围，不代表当前源码或整份 PRD 完成。

## auth-http-shared-primitives

**auth 与基础 HTTP 公共能力抽取**

已在 src/http-response.ts 实现 startHttpResponse 与 writeApiError，由 Foundation 和认证两个实际处理器共同消费，移除原重复头与包装错误序列化。AUTH_BASE_PATH 统一库配置、路由注册与路径截取；正文限制只作局部命名。保留两域 Origin 顺序、Content-Type/204/CORS、原始库状态和字节、多 Set-Cookie、可信身份与生命周期。现有 AST 增量约束共同模块依赖，公开导航可发现实际能力；需求/方案、六规范页与旧接受成果完成 v2 对账。

必要决定：采用提案的最小共享范围，保持完整处理器与域策略独立；正文读取和现有 identity 保留原职责，未引入新身份层、通用路由/CORS策略、相似代码发现或自动抽取平台。六类试点是本次采纳的有界验证，未新增每次业务必跑的状态系统或全套门禁。旧 auth-registration-foundation 接受仍绑定原候选，49份成果、历史与索引原字节保留；本结果使用独立成果键。

限制：已观察到既有诊断 CLI 在 macOS /var 路径别名根下误报正常链接为 LINK_PRIVATE；传 canonical 实际路径可通过，本轮未扩修。AST只检查当前模块路径与依赖，语义复用、真实消费者和接受事实仍需独立核对。本轮有界样例不证明总体可靠性或未来发现效率。多Cookie/原始体试验使用受控上游响应；发现演练使用确定身份替身与真实Node HTTP，不能替代已另跑的真实PG/DSH认证回归。正文读取仅等值命名，未新增精确16KiB/10秒直接边界断言；无真实浏览器、代理链/多实例容量、远端CI、项目/生成或生产验收。

受验候选：c94684dbce33a9a00c52fa8c0f141a1ad861c4975d58be674d5a73fa38068c4b；Git HEAD：2cd4c3b1d3f48b45af16058442bf9624515e1795。精确文件摘要与契约摘要见下方版本绑定，不把 HEAD 当作未提交内容的身份。

- checks (automated, excerpt): [公开依据](../evidence/auth-http-shared-primitives/checks.md)
- http-behavior (automated, excerpt): [公开依据](../evidence/auth-http-shared-primitives/http-behavior.md)
- guardrail-stability (review, excerpt): [公开依据](../evidence/auth-http-shared-primitives/guardrail-stability.md)
- quality-review (review, excerpt): [公开依据](../evidence/auth-http-shared-primitives/quality-review.md)
- norms-review (review, excerpt): [公开依据](../evidence/auth-http-shared-primitives/norms-review.md)

接受：接受这次 auth 和基础 HTTP 公共能力抽取的成果及已披露限制，按现有流程进入 complete，保留原 auth 已完成的成果与证据。

来源：2026-11-08当前会话用户对上轮已交回auth-http-shared-primitives及其披露限制的明确接受和complete指令

```mio-prd-result
{
  "version": 3,
  "prd": "docs/prd-ai-drama-foundation.md",
  "result": {
    "key": "auth-http-shared-primitives",
    "title": "auth 与基础 HTTP 公共能力抽取",
    "modules": [
      "http",
      "auth",
      "plugin",
      "harness/source-guardrails"
    ],
    "outcomes": "已在 src/http-response.ts 实现 startHttpResponse 与 writeApiError，由 Foundation 和认证两个实际处理器共同消费，移除原重复头与包装错误序列化。AUTH_BASE_PATH 统一库配置、路由注册与路径截取；正文限制只作局部命名。保留两域 Origin 顺序、Content-Type/204/CORS、原始库状态和字节、多 Set-Cookie、可信身份与生命周期。现有 AST 增量约束共同模块依赖，公开导航可发现实际能力；需求/方案、六规范页与旧接受成果完成 v2 对账。",
    "decisions": "采用提案的最小共享范围，保持完整处理器与域策略独立；正文读取和现有 identity 保留原职责，未引入新身份层、通用路由/CORS策略、相似代码发现或自动抽取平台。六类试点是本次采纳的有界验证，未新增每次业务必跑的状态系统或全套门禁。旧 auth-registration-foundation 接受仍绑定原候选，49份成果、历史与索引原字节保留；本结果使用独立成果键。",
    "limitations": "已观察到既有诊断 CLI 在 macOS /var 路径别名根下误报正常链接为 LINK_PRIVATE；传 canonical 实际路径可通过，本轮未扩修。AST只检查当前模块路径与依赖，语义复用、真实消费者和接受事实仍需独立核对。本轮有界样例不证明总体可靠性或未来发现效率。多Cookie/原始体试验使用受控上游响应；发现演练使用确定身份替身与真实Node HTTP，不能替代已另跑的真实PG/DSH认证回归。正文读取仅等值命名，未新增精确16KiB/10秒直接边界断言；无真实浏览器、代理链/多实例容量、远端CI、项目/生成或生产验收。",
    "version": {
      "candidate": "c94684dbce33a9a00c52fa8c0f141a1ad861c4975d58be674d5a73fa38068c4b",
      "head": "2cd4c3b1d3f48b45af16058442bf9624515e1795",
      "files": {
        "AGENTS.md": "edbe9ca0cb129339c2f21b3156ca7e8b9be26727da0755d956b398a6aac934a7",
        "README.md": "b43ce06581046812ac37e0b7553843e3d6cdfa2454a18f322717234319d0809d",
        "docs/apis/auth.md": "2ea4e5aeaf58f64331d00dd0dcffb23b9fe2d0f17c90c846ad7a832bfb964b90",
        "docs/apis/foundation.md": "677bf0be5fa6638fdbd94a89a80ec38277b9fb4d4e122ba1b177e4f2e053faf8",
        "docs/apis/index.md": "c17775ae25f2de0710ad6609c9886164508fc000b4e0951ed016e3ccad8ada38",
        "docs/architecture-ai-drama-foundation.md": "83f74849ae6cb0c994eb8ba02f5e5d4a3c61acf05193bd0396f3395f01d89c07",
        "docs/auth.md": "50b53eecd07a118d1fea13efc1206ea0a4227a20564fc2129f814ad92af4d62a",
        "docs/coordination.md": "4ce5e118a0c872b81d1ce536723f06ee914cbf445fe5c9eb5e6dd93e4608ab43",
        "docs/engineering/source-guardrails.md": "7bc52ab09c5d0c853b531e0d8289215374c73ca40ddf3e0a05c75939c75d59f0",
        "docs/foundation.md": "efbd6e081159ff21e4c31d0b2bdaec0354776c83e94122e1a7e685b71cf375f1",
        "docs/prd-ai-drama-foundation.md": "47b02985454384250558195732e3bf2ecc5bf65c5172c4dc5f6defba8426a0e5",
        "docs/tasks/ai-drama-foundation/auth-http-reuse-proposal.md": "0ee53c97330d6ca7cdaf376cf617b8f65a1b347599515c147656ccfc70e7a9dd",
        "docs/tasks/ai-drama-foundation/design.md": "0e3e65a86ec0c29de3ef96f80757730ac4e9be7d76e45e159f3508fd937f1488",
        "docs/tasks/ai-drama-foundation/prd.md": "640c3936b95ba5330987736f1b6ed12d78328bd1a317ecc9935853d2b608da3f",
        "docs/tasks/complete/prd-5f1fa63bbcbb5049/results/auth-registration-foundation.md": "febfaff44c3437076d222ca4cec29786f0ccbc1186950487d172c202af8f1bb2",
        "docs/tasks/history/complete/agent-workflow-d298d07dba5afe60/evidence/checks.md": "3d626d5b86086b9ebcf814520fc24f6aab7efd37ae71aa5ae7bacf39e153f26f",
        "docs/tasks/history/complete/agent-workflow-d298d07dba5afe60/evidence/journey.md": "5b7b262aa2928cdbf579c34001075df9d15e239b95bd43e2f09240f44d536751",
        "docs/tasks/history/complete/agent-workflow-d298d07dba5afe60/evidence/quality-review.md": "03d81747f638d03ff25542fc27b5d5bfa37e8a6fa80c7532f98c032fbd79c54b",
        "docs/tasks/history/complete/agent-workflow-d298d07dba5afe60/evidence/review.md": "9ef9c753c8f70e4a5bc732e516405e35d5096b71b6c01fef62327591c3fc1937",
        "docs/tasks/history/complete/agent-workflow-d298d07dba5afe60/report.md": "075ac384e7e9f4ae70883b048d7665d9a6fab03d448001c9dbad8e42ce932c1d",
        "docs/tasks/history/complete/auth-registration-foundation-ac88ccd0f34f1c0c/evidence/auth-behavior.md": "f6e9bf01a4190402fbe82636ebff57a533cf6cb938231623d4633fb347535f59",
        "docs/tasks/history/complete/auth-registration-foundation-ac88ccd0f34f1c0c/evidence/checks.md": "3fc80028f8b9f906d1f1a54d1ddaaaad9178634e6d5e4d62c2f02fe3a9017466",
        "docs/tasks/history/complete/auth-registration-foundation-ac88ccd0f34f1c0c/evidence/quality-review.md": "d38ed237a07a57b2c9d8603b338cb1880b0d3b1f995fe2fb9ba50ae34c22d1dc",
        "docs/tasks/history/complete/auth-registration-foundation-ac88ccd0f34f1c0c/report.md": "7387bb56148d62bd96cbcb5e0363cbedbaee7cbaee3aa9e8e96c89a7492bcf0b",
        "docs/tasks/history/complete/delivery-closure-1f7a2cc763c2d412/evidence/checks.md": "31b5d6a0f9f525b967b1d2049423c3bc0a228713f86fdd01f4b481b5e3e4ec6f",
        "docs/tasks/history/complete/delivery-closure-1f7a2cc763c2d412/evidence/closure-review.md": "8c8c6643d65ac27d214a0e68cf26e331fb3db27a87a04c6b975bfcc21e0c50bc",
        "docs/tasks/history/complete/delivery-closure-1f7a2cc763c2d412/evidence/quality-review.md": "cefb4360f8fe8cc0245cffcbf82db9f0d39c37c215fbae0599b1b019b5e8ca6f",
        "docs/tasks/history/complete/delivery-closure-1f7a2cc763c2d412/report.md": "83a0ced2f85b223e591c13eb61a23dc66aad17be69c799a9f89bd3366c37bf60",
        "docs/tasks/history/complete/dsh-alias-boundary-4e6a6d39e9923db1/evidence/checks.md": "439a5d3b871ea2c720e53d09dac15d6c3d3bdfb0b26d8139f439b5ab9447f623",
        "docs/tasks/history/complete/dsh-alias-boundary-4e6a6d39e9923db1/evidence/quality-review.md": "467cfe8740cdfea9d0a57c23ec666371de964121b225884911e1dfd6252e9cd8",
        "docs/tasks/history/complete/dsh-alias-boundary-4e6a6d39e9923db1/evidence/regression.md": "d30afd5797579a0433a1ad8001d71db763dfbab8b8999e426aeaa907695dc230",
        "docs/tasks/history/complete/dsh-alias-boundary-4e6a6d39e9923db1/evidence/review.md": "3f08b927c6d0e22dd21872dc7a0be9b3929d3cd3934a4aa77573cdcd3933f743",
        "docs/tasks/history/complete/dsh-alias-boundary-4e6a6d39e9923db1/report.md": "07a4cb0db06d7066a0ec730d9dad28a7fee3a1b4ce25f940e78d0a300ed4f3ba",
        "docs/tasks/history/complete/foundation-guardrails/evidence/checks.md": "ee92de93a46b97a2c5b3982af2a91e78dc66bb903deba258bae1b8dfc3cd53f9",
        "docs/tasks/history/complete/foundation-guardrails/evidence/peers.md": "ffcf21b2fe0f88164af9623e1beec3f3f3aec3639d3891f52fcda1599e1a66d0",
        "docs/tasks/history/complete/foundation-guardrails/evidence/provenance-review.md": "11a5e91b488d4c5e0ca67320f7acc40276afa4c5d74c98fb9544a9c9b87b735e",
        "docs/tasks/history/complete/foundation-guardrails/evidence/quality-review.md": "1963254b9c0459225dbc60d3e39dfdf57a4478db0ae981a9886709a1f5d5ecc4",
        "docs/tasks/history/complete/foundation-guardrails/report.md": "361d9c33da7546aecd9ed5f16dfaa6d667698f92ba92162cd76c1203aa34b17e",
        "docs/tasks/history/complete/harness-layout-context/evidence/checks.md": "b8ddcf20d7088c67a9d951e47d8ea04b0cc2620703f877133ed586686d7ef0f3",
        "docs/tasks/history/complete/harness-layout-context/evidence/quality-review.md": "11b50f8238587450f73d12667aca61410a8c53e16dc0903ac7da4c48df02a66e",
        "docs/tasks/history/complete/harness-layout-context/evidence/review.md": "54765f38b6b1c60214fcf4415a9f883a1759eac4cc07e2ae8932c2b40e65ab16",
        "docs/tasks/history/complete/harness-layout-context/evidence/skills.md": "db13fae89ba93c8afc34548a33fdb55b8da4db679a20ee8fa8b624f0a1a4aeb5",
        "docs/tasks/history/complete/harness-layout-context/evidence/usage.md": "87488fb8f7c8e50a62b171d46e4d7dfe7b37647d9e6f6122aad480f74fd9f0a1",
        "docs/tasks/history/complete/harness-layout-context/report.md": "9d71ffc7eae33d18f07aa91dc3248195c2d6b61735edb176bcd8ced00a851774",
        "docs/tasks/history/complete/natural-intent-entry-3081618733368d2f/evidence/checks.md": "5dc12622f07316e7673bc2f2bc244fb0c2b2a6637e95dc15b057cb96c3ca9dbe",
        "docs/tasks/history/complete/natural-intent-entry-3081618733368d2f/evidence/intent-review.md": "cc00eeefff30d63add30999571feeb83442c1447ebbe8b189e80672b628180bc",
        "docs/tasks/history/complete/natural-intent-entry-3081618733368d2f/report.md": "76a5d0fdc5a9703992ccbf0117a701c77e97ad45464af07de4d64eaad2ebe054",
        "docs/tasks/history/complete/prd-guardrail-replay-2a92e668befcb4a1/evidence/checks.md": "493fd773bce41f192ca6965664c87b670b1260389466be2a2787852c52ab0e3b",
        "docs/tasks/history/complete/prd-guardrail-replay-2a92e668befcb4a1/evidence/prd-workflow.md": "a71b1301d3feb13555e45a5c75f3d6bc0c75a2c4ecbfe4605945a462023c2f72",
        "docs/tasks/history/complete/prd-guardrail-replay-2a92e668befcb4a1/evidence/replay-review.md": "0f50560db7b154cd0561495ef675d2193498c01c923213b51b39692b8a03b857",
        "docs/tasks/history/complete/prd-guardrail-replay-2a92e668befcb4a1/report.md": "37479180989590b368a9c7914abc2c4b733f25557fbebe963fae853a87c6b203",
        "docs/tasks/history/complete/task-delivery-87a50b174f7db211/evidence/checks.md": "991aa48d1fc01d2691288dfefdf19c45e11230e00c14a950a1cbdbb260988543",
        "docs/tasks/history/complete/task-delivery-87a50b174f7db211/evidence/journey.md": "65a4bb0acc370642d71771a9bc5c2c50b24a8636b09a9b451b7a329b84528780",
        "docs/tasks/history/complete/task-delivery-87a50b174f7db211/evidence/quality-review.md": "097f0d4cdea32663d806f3a9f2b40d4270c7aaca99a523f4eae726f9487066b7",
        "docs/tasks/history/complete/task-delivery-87a50b174f7db211/evidence/review.md": "8db01d27bc5e2612c1fc0c1ebaa94c8f950226276a851e7ca33d4a26664dc6eb",
        "docs/tasks/history/complete/task-delivery-87a50b174f7db211/report.md": "4ff55870075c31e8f62d772ebaecfe18cbf1ed738e83c25f497d488df8b8de45",
        "docs/tasks/history/complete/work-coordination/evidence/checks.md": "62e0289a28916509b9338c143572371349f2005463a2200e2b442430dbda4f2b",
        "docs/tasks/history/complete/work-coordination/evidence/quality-review.md": "283a17e84cb03b728294cdb3028c9c801c8fd3048a21df07ae492fc725bceb01",
        "docs/tasks/history/complete/work-coordination/evidence/review.md": "a583462ddc8155d886ef5133b47f9f4452ad8ac0e5bc0a7ef7f764c1f27c2e13",
        "docs/tasks/history/complete/work-coordination/report.md": "c61ab17995f85acb6b80dc503117e761b4711a2bddc5e1ccdb735be9a35a879e",
        "docs/tasks/history/index.md": "1cd60b5eec05e759e33cc4035d260dab56e1f51d73409d31ed1d2916e335193e",
        "docs/tasks/requirements.md": "48be337059db9e032cde8b5d4d1169eaca693e9e1a8f63027a9163e3c3215fbf",
        "docs/work-records.md": "1ed48d3fc7d463e71e852d283c717e9d2f872bc98a8973da4301d053079c8ff2",
        "harness.config.json": "3489a3570d93ba6a246e9e594a6dfa2f802335a1b52c5b295b19da6300435bd8",
        "package.json": "530cde7c6d11881919423726183f5097dd32e2c6f2dd5bdb84b98ce17279498d",
        "pnpm-lock.yaml": "03b741148b7f0a99d0587e4c8df589c67eedf787b5addf2a2f42a56c752d7dff",
        "scripts/harness/check-api-documents.ts": "b1c0f7572cf4d82e2eb528b7d624340c0ea03bdd8713ee1b20d7c65274839560",
        "scripts/harness/check-documents.ts": "94094798c47d019877a09a59c134e457660dae5f6b592e37fda2cc4c086a9bbe",
        "scripts/harness/check-guardrails.ts": "976f2e4da18056f3319c3eaaf632292e2648db3b90872b52eb8dfebb3361ac7e",
        "scripts/harness/check-source.ts": "ac89dc5f4826547667cbf4ecbbd0079452ce8695953ec9b676c20b917fa8ab70",
        "scripts/harness/inventory.ts": "75e537902ad48465c1488b9f70974cc28481a860232f78d120f5cda1c8c262b3",
        "scripts/harness/markdown.ts": "f333a524d8d910faa22e6f739c5c33849b1cb2335058b964bd18102affbe6dbe",
        "scripts/harness/task-documents.ts": "0d95700dd91cca0f2ce30651e8606e681934f3e2b8682d95c08bcac3ad1214bc",
        "scripts/harness/work/cli.ts": "542f566d632e678f3d5dd3262aef0e73454ba88e190816209837111774b33971",
        "scripts/harness/work/context.ts": "0d38388d94950064c4c1a611207659757fce78712379a1fdf29a2063bd379d27",
        "scripts/harness/work/delivery-store.ts": "8127114b74097863aa23d745185370e7380d0660cf61aa1497420f847503baaa",
        "scripts/harness/work/delivery.ts": "2573e1992dbf79000f9c91bde5df0c1090875a608510fb5d8ee0d8548e20a83c",
        "scripts/harness/work/guide.ts": "3185fde99a7fd0a1e43db4e4f5f94b00978c07c095ef49f3286feef0c648b135",
        "scripts/harness/work/handoff.ts": "aeafacd7a9df4dfc49763ff546c33087a6e30e64d1488ccaecbf962d5706813c",
        "scripts/harness/work/legacy-reports.ts": "8c1fd3e185804fdb767fab1b14beb6fd10422cc324af59448421a42dd51162b8",
        "scripts/harness/work/manage.ts": "0bbadb29657f70c06316f526617b01b643c9a9068198350d66bdb66b0307806d",
        "scripts/harness/work/norms-review.ts": "36012e40781ebe8fdb149d173e4f20a8eccdd893a230e922212e51c6ca03309a",
        "scripts/harness/work/quality-review.ts": "4e069b3acaeee78df6d49b5657e61beac69c469d75ef607cacc0c3ddf1f08b99",
        "scripts/harness/work/records.ts": "a9eaa41d0c2a4e2bc18ac8ee768c2cf7af81a03cc90f3279f8e506bd607e4019",
        "scripts/harness/work/reports.ts": "9145adc91492cec9ee801954462b960b5be20cb89d0f00e5a6fc22b9d9825f16",
        "scripts/service/migrate-auth.ts": "13d777d599a413e6d20da0d5244fd03d6e3e0d50b9572c2ce3c5ad24267805fb",
        "scripts/service/prepare-profile.ts": "cf44b56711129baaeda5fa4e306275b25b0934c0675d35280ce2b4f758574e4e",
        "scripts/service/profile.ts": "4b821c0e2e6c3d7db119151640c2f728d1366857387c2a219b4c2f5144246ffa",
        "scripts/service/smoke.ts": "5defe21212525fc49b9fe01896e0ab8dcd2a040b348755342ca2dc304c469f4a",
        "scripts/service/start.ts": "1c020813e74a65e41eb48f59ec860e418de7df1a8d70940419dfd91dc472116d",
        "src/auth/config.ts": "e0994103fe48151fc0d5933c3209912eb1ef471f12916842cb231741ce7b37c0",
        "src/auth/http.ts": "001589fb5cff5546298b923b61ac7088851e07c33a252ec4449e4c98f833ad82",
        "src/auth/service.ts": "2f04799095f4803d81dae6815f303fe842dddaf2111dd911bda8b95abf65c757",
        "src/contracts.ts": "393977f176a3f2aec650247aba3991499bce5416f5b33ab1ac93c57495668520",
        "src/http-response.ts": "b60a202ea51c000ebf0872c2560da38acf587110696946d834b826eefc355b05",
        "src/http.ts": "ff907a511972ecf67a27061d5a1b8ecc1fdb6f68a4bbaa9753d8c4b14b331778",
        "src/plugin.ts": "41caf4b4fc2730d266cff3cb996a00c4d729d9446d54c0f5e57bbeef5fb5df76",
        "tests/auth-database.ts": "dc31bab1c8c9b353a1524f6ba2a230a9afeec5b58c1eaa4551d87c20879dae1a",
        "tests/auth.test.ts": "ebc1a7da4de859b58cc325d9aadbfbfa1b690e36158b94af9d215a3a51c52c2a",
        "tests/delivery.test.ts": "ff79e961ee0a93a0924da250665eee0be7369d95d9f4490e6c5b7b5f9cdb5d27",
        "tests/documents.test.ts": "54464cb5bdf7ce20e5c49e33648dd07eeee6a6b552318b48423e4c7acfe90f18",
        "tests/guardrails.test.ts": "21444b57783ce6747c6061747b3d539e7aacc11f268fdca0d1dea6debc60a836",
        "tests/plugin.test.ts": "579b6f28b7a255cebc172ee5eb97788646fee95406a956b0ca6bd508a121ff33",
        "tests/quality-review-fixture.ts": "4163747ecbaab7aad6d68abc9a98669d955fa49864d4a38299549064598d5e8d",
        "tests/quality-review.test.ts": "5fc347c0a91781d31e58e0e2c79a05ee64645b2bca8857daaeab6269f5e9731c",
        "tests/work.test.ts": "f27f9860fcffd31e2235868d61a10e077e1668c2bb7d77a3c6fd4b06232f8abc",
        "tsconfig.build.json": "cac76e1e62da7d8edc1227e57e8f851c1c24e50818d14daac1a8213bd212a10b",
        "tsconfig.json": "2f5163361dcc14c020988e4510de5257ea10081a3aa9b4ea6d35d1ec37572c0d",
        "vitest.config.ts": "8a47dd1c2d0fdd449c39433e35687198ae81b0d5058477ee94139557c76ed8a4"
      },
      "contract": "dff74fcde9731436ac803e1d7044cbc4ab043615d8d91e6ac879e427cc924a2a"
    },
    "criteria": [
      {
        "id": "checks",
        "criterion": "当前候选 pnpm check 全部通过，涵盖类型/格式/lint/AST/文档/全量测试/构建/官方打包 DSH smoke；新增 helper 有合法与违规 AST 样例。",
        "method": "automated"
      },
      {
        "id": "http-behavior",
        "criterion": "相同独立预期在抽取前旧实现及抽取后真实 DSH HTTP 入口通过；隔离 PostgreSQL auth 回归通过，受控适配器对照证明原始字节、多 Cookie、CORS/204/请求 ID 与错误差异保持。",
        "method": "automated"
      },
      {
        "id": "guardrail-stability",
        "criterion": "完成提案六类有界试点及机械正反对照，独立发现/复用演练与盲评留原件，明确命中、逃逸、误报、限制与净收益；49 份既有接受/历史文件逐字节保留。",
        "method": "review"
      },
      {
        "id": "quality-review",
        "method": "review",
        "criterion": "审阅算法成本、提取后未使用的公共函数/方法及未复用的已有实现；保留身份、顺序、错误与副作用语义，记录证据、反证和限制。"
      },
      {
        "id": "norms-review",
        "method": "review",
        "criterion": "交回前对账需求与方案、现行规范、已接受成果；审阅当前候选页面、完成范围和剩余决定，保留接受事实与未采用状态。"
      }
    ],
    "evidence": [
      {
        "criterion": "checks",
        "method": "automated",
        "representation": "excerpt",
        "sourceSha256": "e29d312e51e24e868820e6205bf357c578fb5d5179a0b3ea8c632edf8bd90751",
        "path": "docs/tasks/complete/prd-5f1fa63bbcbb5049/evidence/auth-http-shared-primitives/checks.md",
        "sha256": "45274b3c3e28755f6f5141f20219113354605b1c43d2632eff06c5c79aee15bd",
        "environment": "darwin/arm64; Node v24.22.2"
      },
      {
        "criterion": "http-behavior",
        "method": "automated",
        "representation": "excerpt",
        "sourceSha256": "54e6d9c4e3e091d0763a2267bbddbcd9c610299cf5fc29b8cf406377ab86c428",
        "path": "docs/tasks/complete/prd-5f1fa63bbcbb5049/evidence/auth-http-shared-primitives/http-behavior.md",
        "sha256": "64beebd7ed935fdcfeb2c6ed8e1bc123d3e27a15f35e2a7842ef422985405515",
        "environment": "darwin/arm64; Node v24.22.2"
      },
      {
        "criterion": "guardrail-stability",
        "method": "review",
        "representation": "excerpt",
        "sourceSha256": "fc1abe799219831c0b8b44205944401dae49360fa5c255fd94f206eabf52d3f5",
        "path": "docs/tasks/complete/prd-5f1fa63bbcbb5049/evidence/auth-http-shared-primitives/guardrail-stability.md",
        "sha256": "314cd5f453328b565b21a7c9227283f115ff2ecd0c30083269a3ca77c0ca5762",
        "environment": "darwin/arm64; Node v24.22.2"
      },
      {
        "criterion": "quality-review",
        "method": "review",
        "representation": "excerpt",
        "sourceSha256": "d70581b41b282367df02b4ebc1843beaf933260716fb5aa392923b78a1f6067c",
        "path": "docs/tasks/complete/prd-5f1fa63bbcbb5049/evidence/auth-http-shared-primitives/quality-review.md",
        "sha256": "88d015f11361f2fb909ec2c4620546ddf44decbabe7d7a371339cbd7c3792807",
        "environment": "darwin/arm64; Node v24.22.2"
      },
      {
        "criterion": "norms-review",
        "method": "review",
        "representation": "excerpt",
        "sourceSha256": "e563594c2f91402cb96f57dc62768e302d6f8941a6b561825746f07a8ff8fef0",
        "path": "docs/tasks/complete/prd-5f1fa63bbcbb5049/evidence/auth-http-shared-primitives/norms-review.md",
        "sha256": "23eaf0b7f2d96cbd93fb2c2a22d2192d7a0f7e2788347576fa5f59c0f592c5c5",
        "environment": "darwin/arm64; Node v24.22.2"
      }
    ],
    "acceptance": {
      "candidate": "c94684dbce33a9a00c52fa8c0f141a1ad861c4975d58be674d5a73fa38068c4b",
      "statement": "接受这次 auth 和基础 HTTP 公共能力抽取的成果及已披露限制，按现有流程进入 complete，保留原 auth 已完成的成果与证据。",
      "reference": "2026-11-08当前会话用户对上轮已交回auth-http-shared-primitives及其披露限制的明确接受和complete指令"
    }
  }
}
```
