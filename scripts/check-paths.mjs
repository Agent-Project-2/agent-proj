import { readdir } from "node:fs/promises";
import { join } from "node:path";

const sourceRoot = "game/client/src";
const typeScriptExtension = /\.(?:ts|tsx|mts|cts)$/u;
const typeScriptFilename = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:\.d)?\.(?:ts|tsx|mts|cts)$/u;
const entries = await readdir(sourceRoot, { recursive: true, withFileTypes: true }).catch(
  (error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  },
);

for (const entry of entries) {
  if (
    entry.isFile() &&
    typeScriptExtension.test(entry.name) &&
    !typeScriptFilename.test(entry.name)
  ) {
    console.error(`${join(entry.parentPath, entry.name)}: use kebab-case for TypeScript files.`);
    process.exitCode = 1;
  }
}
