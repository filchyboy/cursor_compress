import fg from "fast-glob";
import fs from "fs";
import path from "path";
import clipboard from "clipboardy";

interface StructOpts {
  root?: string;
  ignore?: string; // comma‑sep patterns
  out?: string;
}

// Common high‑level buckets to group together for readability.
const DEFAULT_GROUPS = [
  "app",
  "components",
  "lib",
  "cli",
  "cms",
  "public",
  "db",
  "api",
  "utils",
  "tools",
  "tests",
];

export function compressStructure(options: StructOpts) {
  const rootDir = options.root ?? ".";
  const ignorePatterns = [
    "node_modules/**",
    ".git/**",
    ".next/**",
    "dist/**",
    ...(options.ignore ? options.ignore.split(",") : []),
  ];
  const outFile = options.out ?? "output/compressed-structure.txt";

  // Collect file paths
  const files = fg.sync(["**/*.*"], {
    cwd: rootDir,
    ignore: ignorePatterns,
    onlyFiles: true,
  });

  // Group -> file list mapping
  const grouped: Record<string, string[]> = {};
  const rootFiles: string[] = [];

  const norm = (p: string) => p.replace(/\\/g, "/");

  files.forEach((raw) => {
    const file = norm(raw);
    const segs = file.split("/");
    const top = segs.length === 1 ? "root" : segs[0];
    const group = DEFAULT_GROUPS.includes(top) ? top : segs.length === 1 ? "root" : top;
    const name = path.basename(file).replace(/\.[^.]+$/, "");

    if (group === "root") rootFiles.push(name);
    else {
      grouped[group] ||= [];
      grouped[group].push(name);
    }
  });

  const lines: string[] = [];
  [...DEFAULT_GROUPS, ...Object.keys(grouped).sort()].forEach((g) => {
    if (!grouped[g]) return;
    lines.push(`${g}: ${grouped[g].sort().join(", ")}`);
  });
  if (rootFiles.length) lines.push(`root: ${rootFiles.sort().join(", ")}`);

  const output = lines.join("\n");
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, output);
  try {
    clipboard.writeSync(output);
    // eslint-disable-next-line no-console
    console.log("📋  Structure copied to clipboard");
  } catch {
    /* clipboard unsupported */
  }
  // eslint-disable-next-line no-console
  console.log("✅ Compressed structure saved to", outFile);
}
