import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
  ]),
  {
    // Financial-math guardrail (ADR-029): src/lib/format/README.md
    // documents that DecimalString values are never converted to a JS
    // number, anywhere. This rule makes that structural, not just
    // documented, in the two places product/UI code lives — a component
    // or page that writes `Number(sim.final_value)` fails lint before it
    // ships, rather than relying on code review catching it.
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    ignores: ["**/__tests__/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.name='Number'], CallExpression[callee.name='parseFloat'], CallExpression[callee.name='parseInt']",
          message:
            "Do not convert a financial value to a JS number in product/UI code. Use src/lib/format (see its README.md) — it formats DecimalString values via string-only digit math, never Number()/parseFloat()/parseInt().",
        },
        {
          selector: "UnaryExpression[operator='+']",
          message:
            "Do not use unary + to coerce a value to a number in product/UI code. Use src/lib/format for any financial-value display formatting.",
        },
      ],
    },
  },
]);

export default eslintConfig;
