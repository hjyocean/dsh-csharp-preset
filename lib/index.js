/**
 * dsh-csharp-preset —— C# 专用设计模式 Agent 预设分发插件。
 *
 * cordis 插件行（profile 层）：激活时把包内 presets/csharp-solid-tdd-mvvm-wpf
 * 同步到 $DSH_HOME/.agent-presets/。同步失败只记录警告，绝不影响 profile 启动。
 */
import { createRequire } from "node:module";
import { syncPreset } from "./sync.js";

const require = createRequire(import.meta.url);
const packageVersion = require("../package.json").version;

export const name = "csharp-preset-sync";

/** @param {import('@deepseek-ai/cordis').Context} ctx */
export function apply() {
  try {
    const result = syncPreset({ packageVersion });
    if (result.action === "installed") {
      console.info("[dsh-csharp-preset] 已安装预设 csharp-solid-tdd-mvvm-wpf（随附技能与模板）。");
    } else if (result.action === "updated") {
      console.info("[dsh-csharp-preset] 预设 csharp-solid-tdd-mvvm-wpf 已升级到插件版本。");
    } else if (result.action === "skipped-user-owned") {
      console.info("[dsh-csharp-preset] 检测到本地已有 csharp-solid-tdd-mvvm-wpf 预设（非插件管理），保持不动。");
    }
  } catch (err) {
    console.warn(`[dsh-csharp-preset] 预设同步失败（不影响本次启动）：${err?.message ?? err}`);
  }
}
