import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, "gds-adoption.json"), "utf8"));
const forbidden = new Set(manifest.compliance.forbiddenUiImports || []);
const allowed = new Set(manifest.compliance.approvedEntrypoints || []);
const scanDirs = ["app", "components"];
const violations = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

for (const dir of scanDirs) {
  for (const file of walk(path.join(root, dir))) {
    const source = fs.readFileSync(file, "utf8");
    const matches = [...source.matchAll(/from\\s+[\"']([^\"']+)[\"']/g)].map((match) => match[1]);
    for (const imported of matches) {
      if (forbidden.has(imported)) {
        const relative = path.relative(root, file);
        if (relative === "app/layout.tsx" && imported === "@mantine/core") continue;
        violations.push(`${relative}: forbidden UI import ${imported}`);
      }
      if (imported.startsWith("@doneisbetter/gds") && !allowed.has(imported)) {
        violations.push(`${path.relative(root, file)}: unapproved GDS entrypoint ${imported}`);
      }
    }
  }
}

if (violations.length) {
  console.error(violations.join("\\n"));
  process.exit(1);
}

console.log("GDS compliance check passed.");
