/**
 * dsh-csharp-preset 预设同步逻辑（与 cordis 上下文解耦，可独立测试/调用）。
 *
 * 目标：把包内 presets/csharp-solid-tdd-mvvm-wpf 目录同步到
 * $DSH_HOME/.agent-presets/csharp-solid-tdd-mvvm-wpf，使预设被 DSH 的
 * agent-presets 发现机制接管（发现、切换、删除行为与手动创建完全一致）。
 *
 * 同步策略（幂等、不破坏用户改动）：
 *  - 目标不存在            → 整体拷贝 + 写入版本标记
 *  - 目标存在且有版本标记   → 标记版本 < 包版本时：先拷贝到临时目录，成功后
 *                            备份旧目录并原子换名；否则不动作
 *  - 目标存在但无版本标记   → 判定为用户手动创建/编辑，绝不覆盖
 */
import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

/** 本插件分发的预设 id（也是目标目录名）。 */
export const PRESET_ID = "csharp-solid-tdd-mvvm-wpf";

/** 版本标记文件名：存在且可读时，目标目录被视为"由插件管理"。 */
export const MANAGED_MARKER = ".plugin-managed";

/** 解析 $DSH_HOME（环境变量优先，缺省 ~/.dsh）。 */
export function dshHome() {
  return process.env.DSH_HOME || join(homedir(), ".dsh");
}

/** 包内预设源目录（presets/<PRESET_ID>/）。 */
export function presetSourceDir() {
  return fileURLToPath(new URL(`../presets/${PRESET_ID}/`, import.meta.url));
}

/** 目标预设目录（$DSH_HOME/.agent-presets/<PRESET_ID>/）。 */
export function presetTargetDir(home = dshHome()) {
  return join(home, ".agent-presets", PRESET_ID);
}

/** 比较语义化版本号（"1.0.0" 与 "1.0.10" 按段比较，不依赖字典序）。 */
export function compareVersions(a, b) {
  const pa = String(a ?? "0").split(".").map((n) => parseInt(n, 10) || 0);
  const pb = String(b ?? "0").split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da < db ? -1 : 1;
  }
  return 0;
}

/**
 * 执行一次预设同步。
 * @param options.source         包内预设源目录（可覆盖，便于测试）
 * @param options.target         目标预设目录（可覆盖，便于测试）
 * @param options.packageVersion 插件包版本（写入版本标记）
 * @returns {{ action: string, backup?: string }} 动作结果：
 *   installed —— 首次安装；updated —— 版本升级（backup 为备份路径，已删除）；
 *   up-to-date —— 已是最新；skipped-user-owned —— 目标被用户手动管理，未动。
 */
export function syncPreset({
  source = presetSourceDir(),
  target = presetTargetDir(),
  packageVersion = "0.0.0",
} = {}) {
  const managedFile = join(target, MANAGED_MARKER);

  if (existsSync(target)) {
    if (existsSync(managedFile)) {
      const installed = readFileSync(managedFile, "utf8").trim();
      if (compareVersions(packageVersion, installed) <= 0) {
        return { action: "up-to-date" };
      }
      // 版本升级：先拷到临时目录，成功后再替换，失败不破坏现状。
      const tmp = `${target}.tmp-${Date.now()}`;
      cpSync(source, tmp, { recursive: true });
      writeFileSync(join(tmp, MANAGED_MARKER), String(packageVersion), "utf8");
      const backup = `${target}.bak-${Date.now()}`;
      renameSync(target, backup);
      try {
        renameSync(tmp, target);
      } catch (err) {
        renameSync(backup, target);
        rmSync(tmp, { recursive: true, force: true });
        throw err;
      }
      rmSync(backup, { recursive: true, force: true });
      return { action: "updated" };
    }
    return { action: "skipped-user-owned" };
  }

  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true });
  writeFileSync(managedFile, String(packageVersion), "utf8");
  return { action: "installed" };
}
