# skills

Representation: original; original SHA256: 29ce46622e51b5dd0827cedc2196d0bbe8fb3588123cc90bd36377c877c2d59c.

```text
# 当前 Skills 独立行为评估判定

2026-11-07；项目候选 e13041f8ec9550f47b9422b94838ce5085069d6d17e970bfaaca0c5c2ad275df。操作者 /root/layout_skill_evaluation 未参与实现，先初始化后接收串行执行。

结论：initialization 未达到护栏交付要求；acceptance 不能据现有交付建议新同事进入普通本地验证。两案各自执行 env -u SERVICE_TOKEN node scripts/check.mjs，均在 check.mjs:2 报 missing service token、退出 1（Node v24.22.2）。

两案源码相同：check.mjs:1 导入 serve.mjs 的业务凭据配置；harness.config.json 仅将 scripts 标为 development，不能证明职责隔离。docs/delivery.md:2 的有凭据通过自述不满足 requirements.md:2 的无凭据检查要求。AGENTS.md:2 引向手册，手册第 2、6、10 行要求任何工作先读所有阶段、全部验收历史和生产发布细则，违反按当前任务获取必要说明的要求；文件拆分及链接存在不能证明按需阅读。

最小方向：使工程检查脱离服务凭据依赖，保留真实服务启动的凭据要求；现有入口按当前动作指向必要章节，完整流程仍可查。修复后复核无凭据检查及普通验证阅读路径。本次未修复。

限制：同一未参与实现的评估者按初始化→接收串行完成，共享上下文，第二角色可能受第一角色影响；不是两次互盲、统计对照或跨宿主证明。未读取旧评估报告／主任务历史，未运行主仓库 work、安装、启动服务、外调或改动 fixture／Skills／任务状态。服务真实启动、生产、CI 与修复后行为未覆盖。

本项判据是独立评估能否发现给定交付的真实职责/读取缺口；故fixture工程检查失败是该评估发现问题的证据，不是Mio工程检查失败。判定：skills=pass（限定本次两个案例）。未提供预期答案，主控核对报告、文件摘要和命令原件。不是两次互盲、不是旧新版统计对照。

独立观察原件 SHA256 407b5fade361e5bb08c15f377015a114bd93a86d6d3a0a5b9eb95ff86709b34c；命令原件 SHA256 0b0e90394af89a7638114d144a57eaa2af325f54d262406e49aca2fa4b45d108。原件含个人路径，只在本地保留，公共附件采用本判定。

当前实际读取的技术/说明文件摘要：
- project-harness-bootstrap/SKILL.md：a9ba5327143b36f9cc993c8de3ba502da1a46fd51aeffce6fe971dd2f5b6ed82
- project-task-orchestrator/references/skill-collaboration.md：361ad44bb668498cac60979c4531987014049a369f0aca47c97ed8d484a364c7
- project-harness-bootstrap/references/maintenance.md：0f9032a3240d41283ac14ef7abaa3e434a9ba8e07c95232a36d90bf330445bb8
- project-harness-bootstrap/references/initialize.md：c9a762df653356a0293af13801e75dfe5d8d43c2a8bf2e4f500a4981762c08aa
- project-harness-bootstrap/references/structure-and-boundaries.md：62209e96a8fe50b814283d64a42617c2176416af6c062b3339a477f1657fbf55
- project-task-orchestrator/SKILL.md：99eb8266f3536ec2a211653ed375cb2529eb7563246c695d96eb065401d17f17
- project-task-orchestrator/references/implementation-validation.md：9c6af4515072a505291d4554a97acc0eba3dfb1eb39983616701438203a17d6b

未改fixture、主源码、公共契约或Skills；保留历史评估原件，当前结果不继承历史PASS。

```
