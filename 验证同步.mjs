// dsh-csharp-preset 同步逻辑验证脚本（用临时 DSH_HOME，不碰真实环境）
import { syncPreset, presetSourceDir, compareVersions, PRESET_ID } from "./lib/sync.js";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const tmpHome = join(tmpdir(), `dsh-csharp-preset-verify-${Date.now()}`);
const target = join(tmpHome, ".agent-presets", PRESET_ID);
const source = presetSourceDir();
const version = "1.0.0";
let failed = 0;

const check = (label, cond) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
  if (!cond) failed++;
};

try {
  // 场景 1：全新安装
  let r = syncPreset({ source, target, packageVersion: version });
  check(`全新安装 → installed（实际: ${r.action}）`, r.action === "installed");
  check("agent.cordis.yml 已拷贝", existsSync(join(target, "agent.cordis.yml")));
  check("preset.yml 已拷贝", existsSync(join(target, "preset.yml")));
  check("SKILL.md 已拷贝", existsSync(join(target, "skills", PRESET_ID, "SKILL.md")));
  check("模板已拷贝", existsSync(join(target, "skills", PRESET_ID, "references", "templates", "组合根模板.cs")));
  check("版本标记已写入", readFileSync(join(target, ".plugin-managed"), "utf8").trim() === version);
  check("标记文件数量正确（无 .bak 残留）", !readdirSync(join(tmpHome, ".agent-presets")).some((n) => n.includes(".bak")));

  // 场景 2：再次运行 → up-to-date
  r = syncPreset({ source, target, packageVersion: version });
  check(`版本相同 → up-to-date（实际: ${r.action}）`, r.action === "up-to-date");

  // 场景 3：插件升级（标记旧版本）→ updated
  writeFileSync(join(target, ".plugin-managed"), "0.9.0", "utf8");
  r = syncPreset({ source, target, packageVersion: "1.1.0" });
  check(`版本升级 → updated（实际: ${r.action}）`, r.action === "updated");
  check("升级后标记为最新版本", readFileSync(join(target, ".plugin-managed"), "utf8").trim() === "1.1.0");
  check("升级后预设文件完好", existsSync(join(target, "agent.cordis.yml")));
  check("升级不残留 .bak", !readdirSync(join(tmpHome, ".agent-presets")).some((n) => n.includes(".bak")));

  // 场景 4：用户手动管理（无标记）→ 绝不覆盖
  rmSync(target, { recursive: true, force: true });
  mkdirSync(join(target, "自定义目录"), { recursive: true });
  writeFileSync(join(target, "用户改动.txt"), "用户内容", "utf8");
  r = syncPreset({ source, target, packageVersion: "2.0.0" });
  check(`用户自有 → skipped-user-owned（实际: ${r.action}）`, r.action === "skipped-user-owned");
  check("用户文件未被覆盖", readFileSync(join(target, "用户改动.txt"), "utf8") === "用户内容");
  check("未产生 .plugin-managed", !existsSync(join(target, ".plugin-managed")));

  // 版本比较
  check("compareVersions(1.0.0, 1.0.10) < 0", compareVersions("1.0.0", "1.0.10") < 0);
  check("compareVersions(1.0.10, 1.0.2) > 0", compareVersions("1.0.10", "1.0.2") > 0);
  check("compareVersions(1.0.0, 1.0.0) === 0", compareVersions("1.0.0", "1.0.0") === 0);
} finally {
  rmSync(tmpHome, { recursive: true, force: true });
}

console.log(failed === 0 ? "\n全部通过 ✅" : `\n${failed} 项失败 ❌`);
process.exit(failed === 0 ? 0 : 1);
