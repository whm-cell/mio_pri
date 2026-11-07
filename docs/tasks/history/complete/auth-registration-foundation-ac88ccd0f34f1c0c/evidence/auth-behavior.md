# auth-behavior

Representation: excerpt; original SHA256: 0f5046f21c7334e4180245915a4510ae06034c1b6523382328c5a792dbd5149c.

```text
实际命令：pnpm exec vitest run tests/auth.test.ts；来源：docs/auth.md与原任务acceptance。
当前候选：54b01395a4f817c1ca00af268c97f27a297df1abb14ec43d8fe55127e81eb18a
原件摘录：Test Files 1 passed (1); Tests 10 passed (10); Duration 10.24s; exitCode 0; signal null。
真实入口：隔离PostgreSQL、DSH HTTP和正式打包插件，非mock身份或伪数据库。
断言：自助注册立即登录、重复邮箱/错误密码；签名与持久会话、重载和过期；身份读取不误刷新而get-session可返回续期Cookie；密码更新和其他会话撤销、跨账号隔离；Origin/方法/JSON/正文限额/伪造IP限流；并发唯一性及事务回滚；显式迁移与不兼容结构；启动失败和启动中卸载释放连接；原工具拒绝边界保持。
运行使用本机临时集群并清理，不连接已有业务数据库。run记录contextChanged=false。
未跑：真实浏览器、邮件验证/找回、团队、多实例容量、项目CRUD、生成、远端CI和生产。
```
