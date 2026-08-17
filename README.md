# dsh-csharp-preset

C# 专用设计模式（**SOLID + TDD + MVVM + WPF**）的 DeepSeek Harness（DSH）Agent 预设分发插件。

安装本插件后，DSH 的 Agent 预设列表中会出现 **C# 专用模式** 预设，自动附带完整技能
（`csharp-solid-tdd-mvvm-wpf`）与代码模板。凡涉及 C# / .NET / WPF 桌面开发的任务，
该模式自动生效，无需每次提醒。

## 包含内容

```
dsh-csharp-preset/
├── cordis.patch.yml            # profile 层 patch：挂载同步插件
├── lib/
│   ├── index.js                # cordis 插件（激活时同步预设）
│   └── sync.js                 # 预设同步逻辑（幂等，可独立测试）
└── presets/
    └── csharp-solid-tdd-mvvm-wpf/
        ├── agent.cordis.yml    # 预设组合（persona 内嵌模式规则 + 标准工具装配）
        ├── preset.yml          # 预设元数据（显示名：C# 专用模式）
        └── skills/
            └── csharp-solid-tdd-mvvm-wpf/
                ├── SKILL.md                # 完整规范（四层架构 / SOLID / MVVM / TDD / 中文化）
                └── references/
                    ├── ProjectLayout.md    # 解决方案目录与工程文件配置
                    └── templates/          # 视图模型 / 测试 / 组合根模板
```

## 安装

`dsh plugin` 只是 pnpm 的转发器：等价于在 `$DSH_HOME/profiles/<profile>/` 下执行
`pnpm add <包>`，安装完成后会自动把声明了 `dsh.bundle` 的包加入
`dsh.profile.bundles` 层列表。以下命令均以 profile 名为 `web` 为例（换成你自己的
profile 名即可）。

安装完成后 **重启 dsh web**（或新建会话），插件激活时会把预设同步到
`$DSH_HOME/.agent-presets/csharp-solid-tdd-mvvm-wpf`，预设即刻出现在列表。

### 方式一：本地目录安装（个人开发，推荐）

适合只有你在维护这份源码的场景。注意 pnpm 的 `file:` 协议是**拷贝快照**：
`node_modules` 里是源码的独立副本，改完源码后需**重新执行一次 add 刷新**，
再重启 dsh web（更新流程见下文"本地安装的更新"）：

```bash
dsh plugin --profile web add "file:<你的源码目录>\dsh-csharp-preset"
```

> 路径要写成本机实际存放源码的位置（公开仓库中请勿写死本机绝对路径）；
> Windows 下反斜杠/正斜杠均可。
>
> 想"改源码即时生效"（免去每次重新 add）：把依赖协议从 `file:` 换成 `link:`
> （符号链接，与本仓库 `dsh-token-cost` 的做法一致）：
>
> ```bash
> dsh plugin --profile web add "link:<你的源码目录>\dsh-csharp-preset"
> ```

### 方式二：GitHub 私有仓库安装（团队分发）

适合把插件分享给团队内部使用。本仓库为**私有**，使用者需满足两个前提：

1. 已被添加为该仓库的**协作者**（仓库 Settings → Collaborators）；
2. 已配置 GitHub **SSH key**（[生成并添加](https://docs.github.com/zh/authentication/connecting-to-github-with-ssh)），
   私有仓库用 SSH 拉取无需每次输密码。

安装命令（SSH 形式）：

```bash
dsh plugin --profile web add "git+ssh://git@github.com/hjyocean/dsh-csharp-preset.git"
```

> 没有 SSH key 时可用 HTTPS + 个人访问令牌（PAT）替代：
> `dsh plugin --profile web add "git+https://<用户名>:<PAT>@github.com/hjyocean/dsh-csharp-preset.git"`
> （PAT 在 GitHub Settings → Developer settings → Personal access tokens 生成，需 `repo` 权限；注意 PAT 会随命令出现在 shell 历史中，尽量用 SSH。）
>
> 发布更新时建议给仓库打 tag（如 `v1.1.0`），使用者可按 tag 安装固定版本：
>
> ```bash
> dsh plugin --profile web add "git+ssh://git@github.com/hjyocean/dsh-csharp-preset.git#v1.1.0"
> ```

### 方式三：发布到 npm（可选）

把插件发布到 npm 后可按包名安装，适合正式分发：

```bash
dsh plugin --profile web add dsh-csharp-preset
```

## 使用

1. 在 DSH Web 界面的 Agent 预设选择器中选中 **C# 专用模式**（或将其设为默认，见下）。
2. 开始任何 C# / .NET / WPF 任务即可；persona 会声明模式自动生效。
3. 模式附带的技能 `csharp-solid-tdd-mvvm-wpf` 会在任务开始时自动加载，提供
   分层架构、MVVM 模板、TDD 纪律与中文化命名规范等完整细节。

设为默认预设（写入 `$DSH_HOME/settings.yaml`）：

```yaml
agent-presets:
  default: csharp-solid-tdd-mvvm-wpf
```

> 会话一旦产生内容便无法更换预设；默认值只影响之后新建的会话。

## 同步策略（重要）

插件激活时执行幂等同步，规则如下：

| 目标目录状态 | 行为 |
|---|---|
| 不存在 | 整体拷贝（含技能与模板），写入版本标记 `.plugin-managed` |
| 存在 + 插件版本标记 | 标记版本低于插件版本时备份旧目录后升级；否则不动 |
| 存在 + 无标记 | 判定为用户手动创建/编辑，**绝不覆盖** |

因此：

- **首次安装**：预设自动就位。
- **插件升级**：已由插件管理的预设自动跟随升级（旧版先备份再替换）。
- **想自定义预设**：直接编辑 `$DSH_HOME/.agent-presets/csharp-solid-tdd-mvvm-wpf/`
  下的文件，然后**删除**该目录里的 `.plugin-managed` 标记文件，插件此后不会再覆盖它。
- **想恢复插件版本**：删除整个目标目录，重启 dsh web 即可重新同步。

## 源码更新后如何应用到 DSH（日常维护流程）

同步的触发开关是**版本号**：`$DSH_HOME/.agent-presets/<id>/.plugin-managed`
标记里的版本低于插件 `package.json` 的 `version` 时，dsh web 启动时插件会
**备份旧目录并整体替换**；否则判定"已是最新"不动。因此**每次改完源码必须同步
bump 插件版本**，否则改了也白改。

### 本地安装的更新（个人开发）

1. **改源码**：编辑 `presets/csharp-solid-tdd-mvvm-wpf/` 下的文件
   （`agent.cordis.yml`、`SKILL.md`、模板等）。
2. **bump 版本**：把 `package.json` 的 `version` 升一档（如 `1.1.0` → `1.1.1`），
   与 `SKILL.md` 元数据的 `version` 保持一致。
3. **刷新安装**：重新执行一次 add（`file:` 是拷贝快照，必须刷新才能拿到新源码）：
   ```bash
   dsh plugin --profile web add "file:<你的源码目录>\dsh-csharp-preset"
   ```
4. **重启 dsh web**：插件激活时自动执行同步，日志会打印
   `[dsh-csharp-preset] 预设 csharp-solid-tdd-mvvm-wpf 已升级到插件版本。`。

> 若改用 `link:` 协议安装（符号链接），源码修改即时可见，可跳过第 3 步，
> 直接 bump 版本后重启即可。

### GitHub 安装的更新（团队分发）

维护者侧：

1. 改源码 + bump `package.json` 的 `version`（与 `SKILL.md` 元数据一致）；
2. 提交并推送，同时打 tag：`git tag v1.1.1 && git push --tags`。

使用者侧（获取更新，二选一）：

```bash
# 方式 A：直接重新 add（拉取最新代码）
dsh plugin --profile web add "git+ssh://git@github.com/hjyocean/dsh-csharp-preset.git"

# 方式 B：先移除再安装（最稳，彻底刷新依赖，可指定 tag）
dsh plugin --profile web remove dsh-csharp-preset
dsh plugin --profile web add "git+ssh://git@github.com/hjyocean/dsh-csharp-preset.git#v1.1.1"
```

然后重启 dsh web，插件自动把预设升级到新版本。

验证是否生效（两种安装方式通用）：

```bash
cat "$DSH_HOME/.agent-presets/csharp-solid-tdd-mvvm-wpf/.plugin-managed"   # 应等于 package.json 的 version
```

**特殊情况：目标预设不是插件管理的（目录存在但无 `.plugin-managed` 标记）**

例如早期手动复制过、或按上文删过标记。此时插件会判定为"用户手动管理"，
**绝不覆盖**。想让插件接管并自动升级，需一次性处理：

1. 确认目录内没有需要保留的手动改动（有则先备份）；
2. 删除该目录：`Remove-Item -Recurse -Force "$env:USERPROFILE\.dsh\.agent-presets\csharp-solid-tdd-mvvm-wpf"`；
3. 重启 dsh web，插件重新整体拷贝并写入标记，此后按上面三步维护即可。

## 卸载

```bash
dsh plugin --profile web remove dsh-csharp-preset
```

卸载插件不会删除已同步到 `$DSH_HOME/.agent-presets/` 的预设（它是独立文件，与插件无关）。

## 不安装插件的手动方式（备选）

直接把 `presets/csharp-solid-tdd-mvvm-wpf` 整个目录复制到 `$DSH_HOME/.agent-presets/`
即可，效果相同；插件只是把这个步骤自动化并处理升级。

## 常见问题

- **预设列表里没出现？** 确认插件已加入 `dsh.profile.bundles`（见 profile 的
  `package.json`），并已重启 dsh web；插件日志会打印同步结果
  （`[dsh-csharp-preset] 已安装预设 ...`）。
- **修改后又被覆盖？** 删掉目标目录里的 `.plugin-managed` 标记（见同步策略）。
- **与其它预设插件冲突？** 本插件采用"启动同步"方案，不 patch
  `agent-presets` 的 roots 配置，因此不会与任何其它插件互相覆盖配置。
