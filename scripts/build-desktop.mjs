import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { build as esbuild } from "esbuild";

const ROOT = process.cwd();
const API_DIR = path.join(ROOT, "src", "app", "api");
const NEXT_DIR = path.join(ROOT, ".next");
const OUT_DIR = path.join(ROOT, "out");
const DIST_ELECTRON_DIR = path.join(ROOT, "dist-electron");

function runCommand(cmd, args, env) {
  execFileSync(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
}

async function bundleElectronMainAndPreload() {
  fs.rmSync(DIST_ELECTRON_DIR, { recursive: true, force: true });
  fs.mkdirSync(DIST_ELECTRON_DIR, { recursive: true });

  const commonAliasPlugin = {
    name: "tsconfig-at-alias",
    setup(pluginBuild) {
      pluginBuild.onResolve({ filter: /^@\// }, (args) => {
        const subPath = args.path.slice(2);
        const candidates = [
          path.join(ROOT, "src", subPath),
          path.join(ROOT, "src", `${subPath}.ts`),
          path.join(ROOT, "src", `${subPath}.tsx`),
          path.join(ROOT, "src", subPath, "index.ts"),
        ];
        for (const candidate of candidates) {
          if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            return { path: candidate };
          }
        }
        return null;
      });
    },
  };

  await esbuild({
    entryPoints: [path.join(ROOT, "electron", "main.ts")],
    outfile: path.join(DIST_ELECTRON_DIR, "main.cjs"),
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node22",
    external: ["electron"],
    plugins: [commonAliasPlugin],
    sourcemap: false,
    minify: true,
  });

  await esbuild({
    entryPoints: [path.join(ROOT, "electron", "preload.ts")],
    outfile: path.join(DIST_ELECTRON_DIR, "preload.cjs"),
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node22",
    external: ["electron"],
    plugins: [commonAliasPlugin],
    sourcemap: false,
    minify: true,
  });
}

function buildNextStaticExport() {
  let stashRoot = null;
  let stashedApiDir = null;

  try {
    if (fs.existsSync(API_DIR)) {
      stashRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ag-api-stash-"));
      stashedApiDir = path.join(stashRoot, "api");
      fs.cpSync(API_DIR, stashedApiDir, { recursive: true });
      fs.rmSync(API_DIR, { recursive: true, force: true });
    }

    fs.rmSync(OUT_DIR, { recursive: true, force: true });
    fs.rmSync(path.join(NEXT_DIR, "types"), { recursive: true, force: true });
    fs.rmSync(path.join(NEXT_DIR, "dev", "types"), {
      recursive: true,
      force: true,
    });

    const nextBin = path.join(
      ROOT,
      "node_modules",
      ".bin",
      process.platform === "win32" ? "next.cmd" : "next",
    );

    runCommand(nextBin, ["build"], {
      ELECTRON_EXPORT: "1",
    });
  } finally {
    if (stashedApiDir && fs.existsSync(stashedApiDir)) {
      fs.rmSync(API_DIR, { recursive: true, force: true });
      fs.cpSync(stashedApiDir, API_DIR, { recursive: true });
    }
    if (stashRoot && fs.existsSync(stashRoot)) {
      fs.rmSync(stashRoot, { recursive: true, force: true });
    }
  }
}

async function main() {
  console.log("[desktop-build] 1/2 Building Next.js static export -> out/");
  buildNextStaticExport();

  console.log("[desktop-build] 2/2 Bundling Electron main & preload -> dist-electron/");
  await bundleElectronMainAndPreload();

  console.log("[desktop-build] Done.");
}

main().catch((err) => {
  console.error("[desktop-build] Failed:", err);
  process.exit(1);
});
