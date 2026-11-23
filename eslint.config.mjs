import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  { ignores: ["**/dist/**", "**/coverage/**", "upload/**", ".codex/**"] },
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    extends: [tseslint.configs.recommended],
    rules: {
      "@typescript-eslint/naming-convention": [
        "error",
        { selector: "typeLike", format: ["PascalCase"] },
        { selector: "function", format: ["camelCase"] },
        { selector: "variable", modifiers: ["const"], format: ["camelCase", "UPPER_CASE"] },
        { selector: "variable", format: ["camelCase"] },
      ],
    },
  },
  {
    files: ["client/**/*.{js,ts,tsx}"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["**/*.config.{js,mjs,cjs}", "scripts/**/*.{js,mjs,cjs}"],
    languageOptions: { globals: globals.node },
  },
]);
