# provenance-review

Representation: excerpt; original SHA256: da0872ae07cce024e40c60d26a160e010b5f482db2de8337ea78fd760f806fe7.

```text
# 基础护栏恢复与当前候选审阅

2026-11-07；candidate dec07b6a78b05b0e3e4ec3c0720c1ab79941ddd241b1de7716ba104f27f0fc51；HEAD fe010f2c98fd911a5671128baae464d1a515c913，分支codex/work-coordination。mode=change；work_performed=false（源码审阅阶段），acceptance_requested=true，release_requested=false。

本次恢复公共索引中已有foundation-guardrails，先检查确认没有该ID的本地state，再用兼容start与revision update恢复当前记录；不是新增需求，不回填历史ACCEPT。原范围/授权来自docs/foundation.md及Git b921a835:docs/acceptance.md初始化节，当前用户授权顺序收尾。最小范围仍是固定DSH插件、探针/受保护能力查询、默认工具拒绝、工程护栏；auth等后续能力不宣称为初始化业务已完成。

历史工程身份：.work/evidence/candidate.json列29个文件，按路径、NUL、字节、NUL逐个摘要，得到dae9bc840960e19c53feef9dd6d9b3355526e52f763864133149ab6326e0fcf3；实际git show 044c17c3b39fdf909894790e82b1e1069cee2a5b和7c7a2679a4c2cbf8ea8cb698bf7be8bdbdf83f7d均重现相同摘要。历史当时无HEAD的描述保留，不因后来提交改写。干净安装/构建/产物smoke日志仍在.work/evidence；只证明当时候选，不算本次执行。

有效比较：git diff --find-renames 044c17c HEAD及逐路径git show比较。src/http.ts、src/contracts.ts、cordis.patch.yml与历史同字节；原scripts/profile/start/prepare-profile与现scripts/service对应文件同字节。当前源码差异是后续auth接入与harness协调/模块边界，已按各自独立原件及当前回归核对。工作区当前只有任务报告和索引改动，无生产实现、staged或凭证改动。

实际契约核对：HTTP先校验部署token/origin，固定探针与能力入口，错误凭据401/不允许Origin403/方法405/路径404，requestId和no-store响应；capabilities仍tools=[]、sessions=false。plugin在await可选auth前登记工具拒绝，正常/失败/卸载路由与资源生命周期有当前集成断言；已确认的可选auth不会把服务token当用户身份。正式pack不含src/.work，独立Profile复用安装树而不加载插件源码，退出后端口可再次绑定。

护栏核对：sourceRoots覆盖TS检查与生产构建；未知/未分类源码不默许，真实导入关系使用AST/NodeNext模式，harness/service边界独立，公共文档禁止私人路径/跟踪凭据与运行目录。原初始化独立审查的漏类型/构建root P2已保留对应合法违规回归；后续DSH/auth/协调的已接受报告与独立原件分别支持其增量，不把通过等同安全证明。

当前正式证据：70ff2e29-ee82-43f2-b195-79b51173f8a9.log为pnpm check退出0，6文件121测试、格式/类型/lint/AST/公共文档、构建及正式DSH插件smoke通过；f45dc39c-6a7d-4992-ab23-7b4f4f5fd2ae.log为pnpm peers check退出0，No peer dependency issues found。均绑定当前候选且contextChanged=false。环境darwin/arm64 Node v24.22.2，当前安装依赖；认证集成仅临时本地DB，不访问既有业务库。

独立来源及适用性：初始化公共记录；auth-quality-review原件实际审查当前src/http/contracts/plugin/profile及固定依赖和卸载边界，相关实现经当前字节核对；DSH/layout/current Agent审查覆盖后续检查器和协调消费者。主控本轮实读这些关系；未声称全部手工探针新跑。

Snapshot/Artifact provenance与Lifecycle由打包真实入口/当前原件和资源释放测试支持。Retry/unknown及业务parallel join不属于最小底座契约，无新增外部重试。Code review=NO_SUPPORTED_FINDINGS；本地底座行为PASS；当前干净安装NOT_RUN、历史安装只作历史；浏览器/模型/项目业务/生产/远端CI均未跑；Release=NOT_REQUESTED。


```
