# 任务交付闭环与 C1 命令检查

任务：delivery-closure-1f7a2cc763c2d412；实施者：coolm。本报告是指定候选的交付快照，当前规则以现行规格为准。

## 完成功能

已修正待接受状态：check/context/status核对当前候选、原件、草稿、附件和未结束交付操作。证据齐全后的prepare发布同一份私有草稿与公共pending报告/必要附件，并登记索引review入口；complete核对真实候选接受后生成complete包、清理对应pending并更新索引。新增work exec，在命令启动前检查任务存在/归属、C1实施阶段、契约、候选与未结束交付；保留退出码，不自动同步或伪造证据。实施/交付/恢复说明已同步仓库入口，普通Agent无需个人Skills即可使用。

## 必要决定

用户要求落地已定位的状态展示、公共待接受发现路径与收尾缺口；保留真实接受为complete条件。复用现有报告格式、原件绑定和交付操作恢复，新增pending输出与可选索引review字段，不另建后台服务。独立审查首轮发现的未结束prepare误就绪已修复；失败与未知原件保留，没有改写为首轮通过。

## 限制

本地完整pnpm check通过121项测试及打包插件装载；本轮本机PostgreSQL为14.18，CI配置为16.15，未运行远端CI或生产验收。work exec只检查经其启动的命令，不拦截任意宿主编辑，也不自动判定命令授权语义。status大规模历史任务耗时未做基准。当前是指定候选的待接受结果，尚未记录真实人类接受；旧任务未自动补证或接受。

## 验收依据

- checks (automated, excerpt): [原件/摘录](evidence/checks.md)
- closure-review (review, original): [原件/摘录](evidence/closure-review.md)
- quality-review (review, original): [原件/摘录](evidence/quality-review.md)

接受：待真实结果接受；草稿不能作为完成结论。

```mio-task-report
{
  "version": 1,
  "id": "delivery-closure-1f7a2cc763c2d412",
  "title": "任务交付闭环与 C1 命令检查",
  "author": "coolm",
  "modules": [
    "harness/work"
  ],
  "outcomes": "已修正待接受状态：check/context/status核对当前候选、原件、草稿、附件和未结束交付操作。证据齐全后的prepare发布同一份私有草稿与公共pending报告/必要附件，并登记索引review入口；complete核对真实候选接受后生成complete包、清理对应pending并更新索引。新增work exec，在命令启动前检查任务存在/归属、C1实施阶段、契约、候选与未结束交付；保留退出码，不自动同步或伪造证据。实施/交付/恢复说明已同步仓库入口，普通Agent无需个人Skills即可使用。",
  "decisions": "用户要求落地已定位的状态展示、公共待接受发现路径与收尾缺口；保留真实接受为complete条件。复用现有报告格式、原件绑定和交付操作恢复，新增pending输出与可选索引review字段，不另建后台服务。独立审查首轮发现的未结束prepare误就绪已修复；失败与未知原件保留，没有改写为首轮通过。",
  "limitations": "本地完整pnpm check通过121项测试及打包插件装载；本轮本机PostgreSQL为14.18，CI配置为16.15，未运行远端CI或生产验收。work exec只检查经其启动的命令，不拦截任意宿主编辑，也不自动判定命令授权语义。status大规模历史任务耗时未做基准。当前是指定候选的待接受结果，尚未记录真实人类接受；旧任务未自动补证或接受。",
  "checkpoint": {
    "head": "386020174cb95d6bf9f1be265c0dfadfa4d7f496",
    "branch": "codex/work-coordination",
    "files": {
      "AGENTS.md": "e8152111632ac8439d7ff94bc6188e1266d2e21e7a3ec3dfcbbfae9c542f79ea",
      "README.md": "ced22196702ac149e93f299636108d971fcd19462ca6d5bd96247264ec519058",
      "docs/coordination.md": "3c9a440a21e7f3523458717fb89e73e53a7e425dce89c514b98ef0a967f58e36",
      "docs/foundation.md": "b2b28fa3fe66e62771a2eb7015dea40a0b1eb5d89dc18d3cfdc5e482b147ed91",
      "docs/work-records.md": "02a84fa18aad5cdca3a8e11642be4cca5511229cfcfad3b597a76d833fe853b0",
      "harness.config.json": "a9da9600e84861aecf57557c6e0c9abed8f795fd9dc1b7f4552c9f6bceef450f",
      "package.json": "530cde7c6d11881919423726183f5097dd32e2c6f2dd5bdb84b98ce17279498d",
      "scripts/harness/check-documents.ts": "12c3223c5e7c0bac294d673293d715b31b3672be799f5e8fb37addaae4f05f25",
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
      "tests/work.test.ts": "aec79adebfdbd280a1a81aaad83db22ed148690c9dc847c478c88caa8ded832b"
    },
    "contract": "fac6122fddf1acfc638231f0d506179df8f4af1abb8e4ad7fd171fb77e8944cf",
    "candidate": "0bb6bf88c50cc63c632bb51bd580e0be80dd08635bc065c419f5b9e0bb36cb68"
  },
  "contract": {
    "requirement": {
      "source": "docs/coordination.md",
      "section": "任务交付与重开",
      "key": "delivery-closure"
    },
    "goal": "补齐任务待接受状态、公共审阅入口与接受后complete闭环，并为实施命令接入C1执行前检查",
    "scope": [
      "scripts/harness/work",
      "tests/delivery.test.ts",
      "tests/work.test.ts",
      "AGENTS.md",
      "README.md",
      "docs/coordination.md",
      "docs/work-records.md",
      "docs/foundation.md"
    ],
    "inputs": [
      "package.json",
      "harness.config.json",
      "scripts/harness/check-documents.ts",
      "tests/quality-review-fixture.ts"
    ],
    "sources": [
      "docs/coordination.md",
      "docs/work-records.md",
      "docs/foundation.md"
    ],
    "nonGoals": [
      "不伪造真实接受或批量complete历史任务",
      "不修改业务认证、项目/生成运行时或个人Skills",
      "不建立后台模型、全局文件写入沙箱或新的任务平台",
      "不把公共CI变成依赖个人.work的检查"
    ],
    "acceptance": [
      {
        "id": "checks",
        "method": "automated",
        "criterion": "pnpm check全通过；prepare待接受报告/索引可在无.work公共副本核验；实际complete、重开、候选变化、原件损坏、操作中断恢复及C0/C1命令执行回归通过"
      },
      {
        "id": "closure-review",
        "method": "review",
        "criterion": "对真实CLI调用链核对状态不误报、公共待审与接受严格分离、脱敏/候选/索引/恢复边界，确认命令检查未宣称拦截任意宿主写入"
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
        "text": "实施上一轮已定位的状态展示、公共待接受发现路径与收尾缺口；保持真实接受为complete必要条件",
        "source": "当前用户开始落地指令及上轮分析"
      },
      {
        "status": "AI_PROPOSED",
        "text": "复用现有报告格式与交付操作原件，在prepare时生成pending包和索引审阅入口；C1命令入口仅验证经它启动的argv，不添加宿主专有Hook",
        "source": "基于当前prepare仅写私有草稿、依赖安装早于建档的实际问题选择的最小方案"
      }
    ],
    "dependencies": []
  },
  "evidence": [
    {
      "criterion": "checks",
      "method": "automated",
      "representation": "excerpt",
      "sourceSha256": "f4c7d7dd218cf3d784b5c5a84faad4051899a1c1762628bafe7e440a86314cb4",
      "path": "evidence/checks.md",
      "sha256": "5c686e976b43ff7ebe1168ddda27b560dfd027d70b3c522cd3014137fce35f77",
      "environment": "darwin/arm64; Node v24.22.2"
    },
    {
      "criterion": "closure-review",
      "method": "review",
      "representation": "original",
      "sourceSha256": "72a037b633e3b899e64526d9d874c3c7b5eebebba99ca10b0ad922c951e30232",
      "path": "evidence/closure-review.md",
      "sha256": "07cb0c5be10622a3cc323b4261d9042f3f2eac701b3be331899688b4b99591e1",
      "environment": "darwin/arm64; Node v24.22.2"
    },
    {
      "criterion": "quality-review",
      "method": "review",
      "representation": "original",
      "sourceSha256": "f27284f0142b4cd8efd837634ee4b57aed425862cd9ff38c41ccaa56392d65a0",
      "path": "evidence/quality-review.md",
      "sha256": "d3dc28634b53b8873e0b1386b605cd6725b7ca674dda94fd9c7cfc910d5a6f86",
      "environment": "darwin/arm64; Node v24.22.2"
    }
  ]
}
```
