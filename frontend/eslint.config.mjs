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
    // Financial-math guardrail (ADR-029, scope expanded beyond app/**
    // and components/** per the M7 Phase 2 punch list): src/lib/format/
    // README.md documents that DecimalString values are never converted to
    // a JS number, anywhere. This rule makes that structural, not just
    // documented, everywhere product/UI code and shared client logic live
    // — a hook, provider, or lib helper that writes
    // `Number(sim.final_value)` fails lint before it ships, the same as a
    // component would, rather than relying on code review catching it.
    files: [
      "src/app/**/*.{ts,tsx}",
      "src/components/**/*.{ts,tsx}",
      "src/hooks/**/*.{ts,tsx}",
      "src/providers/**/*.{ts,tsx}",
      "src/lib/**/*.{ts,tsx}",
    ],
    // src/lib/format/** is exempted: it is the one sanctioned module
    // (decimal-string.ts, compare-decimal-string.ts) allowed to operate on
    // a DecimalString's raw digit characters, including the very
    // string-length/digit comparisons `compareDecimalStrings` is built
    // from — the rule this config defines exists to force everything
    // *else* through that module, not to forbid the module's own
    // implementation of itself.
    ignores: ["**/__tests__/**", "src/lib/format/**"],
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
        {
          // Financial-comparison guardrail (ADR-033): a bare relational
          // operator on two DecimalString values compares lexicographically
          // ("9" > "10"), not numerically — always wrong the moment
          // integer-part lengths differ. This selector is intentionally
          // broad (matches any <, >, <=, >= comparison, not only ones on a
          // DecimalString-typed operand) because ESLint has no type
          // information in this config, the same breadth-over-precision
          // tradeoff ADR-029 already accepted for Number()/parseFloat/
          // parseInt. A rare, genuinely non-financial comparison in these
          // directories needs a scoped, commented eslint-disable-next-line.
          selector: "BinaryExpression[operator=/^[<>]=?$/]",
          message:
            "Do not compare values with a raw </>/<=/>= operator in product/UI code. If this compares DecimalString financial values, use compareDecimalStrings from src/lib/format (ADR-033); a bare relational operator compares them as strings, not numbers. If this is a genuine non-financial comparison, disable this rule on this line with a comment explaining why.",
        },
      ],
    },
  },
]);

export default eslintConfig;
