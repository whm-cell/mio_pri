# 协调工具的实现边界

操作判断与生命周期只在[协调协议](../coordination.md)维护，字段与命令只在[记录索引](../work-records.md)维护。本页用于修改工具时核对实现保证。

2026-11-06 团队采用 [任务协调协议](../coordination.md) 和 [记录命令](../work-records.md)。每位成员开发时维护自己的 `.work`，公共协议与工具随仓库交付；这是团队共同要求，不依赖个人技能安装。任务协调位于 `scripts/harness/work/`，与工程护栏同属 `scripts/harness/`；Profile、启动和产物 smoke 位于 `scripts/service/`。两者分别声明为 development 源码根及允许依赖，不得被运行时导入。其格式、类型、lint、源码盘点和行为测试进入现有统一检查；不新增运行时服务或依赖。

公共检查仍不要求任何成员的私人记录存在；本地协调记录由 `pnpm work check <task>` 显式检查。源码盘点区分生产、测试、开发脚本、配置、文档与生成/运行资料；遇到未识别文件明确报错，由修改者登记真实归属。该检查不能证明业务职责合理，也不是秘密内容扫描器。

仓库 [协调协议](../coordination.md#开始任务) 维护从 PRD 形成执行任务、C0/C1 与下一步的判断方法。ensure 按文档与稳定任务键生成／复用记录；update 以 revision 更新契约及进度，保留候选、原件和恢复保护。旧 v1 记录兼容，交接不继承授权／通过。Agent 负责需求判断，CLI 负责可确定事实；仅有预填任务数据的工具测试不能证明 Agent 自主拆解，实际验证边界见 [验收入口](../acceptance.md#无个人-skills-的任务路线验证)。

正文按 `guide <action>`／`context <task> <action>` 输出共同规则与当前动作；记录摘要不含旧 notes、完整 checkpoint 或原始日志。动作章节由 Markdown AST 定位，缺失或重复章节显式报错；文件内示例的代码围栏不构成导航标题。固定公共策略仍参与完整文件摘要，正文加载与完整性核对分开。该入口使按需取用可执行，不能强制任意宿主或执行者永远不读取全文。

QUALITY-01 将已有审阅要求接入任务验收，补上“没有登记审查项也能交付”的缺口。通过护栏配置中的源码范围和显式 `.ts` 路径保守触发，包含开发工具、测试、计划新增路径和删除最后一个源文件；不另维护可被 sync 覆盖的语义 diff 基线。纯格式的源码任务仍需说明不适用理由，文档任务的只读源码 inputs 不触发。代价是源码范围过宽时多一次适用性判断，执行者应声明真实范围。

实现归属 `scripts/harness/work/quality-review.ts`，复用已有 Markdown AST 元数据解析、候选与证据存储。新增任务和显式 update 补入标准，旧记录只读不迁移；缺项需显式对账，旧通过不重新绑定。三维原件防止漏项和把 fail／pending 标成 pass，候选字段防止把旧报告直接登记为新候选。维护验证通过真实 CLI 覆盖源代码／文档范围、旧记录、缺证、失败／待确认、完整原件及候选变化。公共 CI 运行协议测试，仍不读取个人 `.work`，也不能证明所有协作者已执行真实审查。此机制不增加模型依赖或后台调度；人类接受保持独立。

逐个流程任务生成公共报告会混淆 PRD 进度、护栏维护与个人过程。公共交付因此按显式 `plan.result={prd,key}` 收敛为一份 PRD 一个成果入口：prepare 只留私有草稿，complete 只在同候选证据和真实接受齐备时按 key 更新已接受开发成果，保留其他结果。维护、检查和演练不发布公共 complete，验证后按需 archive；原 task 包与索引原字节移入 history，历史接受不改写也不算 PRD 进度。成果数不能证明整份 PRD 完成。

为保留脏工作区身份，公开版本绑定包含受验候选、HEAD、文件摘要和契约摘要，省略个人状态、author 和整份 plan。自身输出只包括索引、汇总导航及本 key 附件；同 PRD 其他附件仍按真实依赖受验。实际依赖登记代码、契约或必要附件，不以汇总正文充当版本依赖。新增 key 无需先提交旧 book；替换同 key 要求其旧结果和附件可从 HEAD 恢复。check/context/status 核对当前候选、原件和私有草稿，多文件 journal 保留中断恢复及冲突拒绝。维护成本限于两种格式读取、按 key 更新与恢复测试，不新增服务、数据库或调度平台。公共 guard 无需作者 `.work` 即可核对公开格式与完整性，但不认证接受真实性，也不能将摘要当作全部私人原件。

任务资料统一在 `docs/tasks/`，来源身份仍参与旧任务与 book 派生，直接以物理新路径建档会产生重复身份；只摘要旧跳转又会漏掉目标正文变化。`harness.config.json.taskDocuments` 是唯一注册来源，共享 resolver 供 ensure/update、capture、book、receive 与文档检查使用。只归一新请求，旧解析、接受内容与历史清单不修改；候选包含相关目标、alias 和配置。全部新旧 PRD 的成果只保存在 `docs/tasks/complete/`；活动正文、index/requirements 导航与 complete/history/pending 根分别分类，未知任务页与成果孤儿均拒绝。

任务总索引保留 v2 的 prds/history 元数据，固定正文新增 requirements.md 导航，再列已接受成果与历史。读取只兼容旧、新两种完整规范模板，额外正文仍拒绝；新 complete 始终保留活动导航，首次写入与未完成重放都先核对真实导航文件存在。工具不生成空任务目录或改写旧 journal 的 before/after；索引即使改成另一种合法模板，与旧操作字节不符时仍拒绝覆盖。

注册只含类别、稳定身份、当前位置与短导航 aliases；任务索引是读者导航，不维护第二份机器台账。`work documents` 只读输出分类与文档校验问题，手工受控迁移比自动批量改写、通用事务迁移平台更小。无该字段的旧 fixture 兼容，已注册实体缺失、重复、私有/越界/符号链接以及未知任务页明确失败；活动资料不能通过历史正文获得可达性。该机制证明位置和链接约束，不判断设计是否采用。

开发成果还需 plan.norms 和 norms-review，避免 complete 后才把已交付行为补进现行规范。声明把规范页面与理由纳入候选，原件逐页绑定实际摘要和观察；允许明确无影响的空集合。缺失时仅交付拒绝并引导显式 update，旧记录读取不迁移。complete 继续只写成果，不自动 promote 提案或改规范。新增成本是一个声明、现有 review 原件解析及对应回归，无模型调用、自动语义抽取或额外生命周期状态；语义覆盖与人工结论仍需审阅。

实施命令通过 `work exec` 在启动前检查任务归属、有效契约、候选、C1 实施阶段与未结束交付操作，补上依赖安装先于建档的已观察缺口；保留子进程退出码，不自动同步或伪造证据。该入口不安装宿主专属 Hook，不拦截绕过它的文件写入；直接编辑仍由 Agent 在写入前履行共同规则。复用现有进程调用与交付 journal，不增加后台服务或通用任务平台。

公共成果采用 v3：每个 PRD 的 report.md 仅导航到 results/<key>.md，详情保留完整 PublicResult 与精确版本，证据按 key 单独保存。导航、详情与证据都有摘要绑定；旧书内的 key 标题保留，旧 accepted 的 book 路径、key 与规范单成果摘要不改变。读取兼容 v2 内嵌成果和历史 v1；新生成仅写 v3，私人交付状态仍使用 v2 契约。仅本 key 详情和附件排除为自身输出，兄弟成果详情与附件仍按实际依赖参与候选。

## v2 公共成果存储维护

v2 内嵌成果可继续读取、receive，并可作为 HEAD 中可恢复的旧结果；单 key 替换不要求先提交纯存储拆分。含兄弟成果的 v2 book 不在某个开发成果的 complete 中隐式拆分：兄弟详情是实际输入，不能借迁移把它变成本人的输出。该情形在写入前拒绝，先用一个不设 result 的维护任务完成以下存储维护，再恢复原开发任务并核对 sources/inputs 与候选。

维护任务声明 PRD、公共索引及相应成果目录的实际范围，保存原 book、index、规范 PublicResult 与证据摘要；先 check、进入 C1，再用 work exec 执行。下面的脚本只拆分存储，不接受新能力，不修改历史或私人记录。将任务和 PRD 参数替换为当前实际对象：

```sh
pnpm work exec <maintenance-task> -- node --input-type=module - docs/prd-example.md .work/tasks/<maintenance-task>/book-backup <<'JS'
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { readBook, readIndex, resultPath, renderResultPage, renderBook, renderIndex, reportPath, indexPath, checkReports } from './scripts/harness/work/reports.ts';
import { digest, json, checkedPath } from './scripts/harness/work/records.ts';
import { markdown } from './scripts/harness/work/delivery.ts';
import { inventory, loadConfig } from './scripts/harness/inventory.ts';
const [prd, backup] = process.argv.slice(2);
if (!backup.startsWith('.work/')) throw new Error('Use the maintenance private backup');
const { index, source: indexBefore } = await readIndex('.');
const { book, source: bookBefore } = await readBook('.', prd, index);
if (book.version === 3) process.exit(0); // readBook already checked the package
await mkdir(await checkedPath('.', backup), { recursive: true });
await writeFile(`${backup}/index-v2.md`, indexBefore, { flag: 'wx' });
await writeFile(`${backup}/book-v2.md`, bookBefore, { flag: 'wx' });
const details = {};
for (const result of book.results)
  details[resultPath({ prd, key: result.key })] = await markdown(renderResultPage(prd, result));
for (const path of Object.keys(details)) {
  try { await readFile(await checkedPath('.', path)); throw new Error(`Existing target: ${path}`); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
const source = await markdown(renderBook(book, details));
index.prds.find(entry => entry.prd === prd).report.sha256 = digest(source);
const outputs = { ...details, [reportPath(prd)]: source, [indexPath]: await markdown(renderIndex(index)) };
await writeFile(`${backup}/outputs.json`, json(outputs), { flag: 'wx' });
for (const [path, bytes] of Object.entries(outputs)) {
  const target = await checkedPath('.', path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, bytes);
}
const errors = await checkReports('.', (await inventory('.', await loadConfig('.'))).files);
if (errors.length) throw new Error(errors.join('\n'));
JS
```

这是单写入者的维护编辑，不是跨文件事务。中断时先比对备份的 outputs 清单和当前字节；只在确认未有其他编辑时恢复原 index/book 并撤回本次新增详情，保留备份，再重新核对和执行，不能覆盖不匹配文件。正常完成后比较前后规范 PublicResult 和旧证据摘要不变，运行相关回归及 pnpm check，再同步维护候选。历史正文不重新验收；本轮维护按需 archive，不生成公共 complete。
