// Project health check:  npm run check
// 1) syntax-checks every JS file   2) verifies every local file referenced by the HTML pages exists
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
let failed = 0;

const jsFiles = fs.readdirSync(path.join(ROOT, "js")).filter((f) => f.endsWith(".js"));
for (const f of jsFiles) {
  try {
    execFileSync(process.execPath, ["--check", path.join(ROOT, "js", f)], { stdio: "pipe" });
    console.log("  ok    js/" + f);
  } catch (e) {
    failed++;
    console.log("  FAIL  js/" + f + "\n" + e.stderr.toString());
  }
}

const htmlFiles = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html"));
for (const page of htmlFiles) {
  const html = fs.readFileSync(path.join(ROOT, page), "utf8");
  const refs = [...html.matchAll(/(?:src|href)="([^"#?]+)"/g)]
    .map((m) => m[1])
    .filter((r) => !/^(https?:|mailto:|tel:|data:|javascript:)/.test(r));
  for (const ref of refs) {
    if (!fs.existsSync(path.join(ROOT, ref))) {
      failed++;
      console.log(`  FAIL  ${page} -> missing ${ref}`);
    }
  }
  console.log(`  ok    ${page} (${refs.length} local refs)`);
}

console.log(failed ? `\n${failed} problem(s) found.` : "\nAll checks passed.");
process.exit(failed ? 1 : 0);
