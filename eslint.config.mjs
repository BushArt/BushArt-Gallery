import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextVitals,
  {
    // Enforce the 09-Coding-Standards.md §12 invariant: no bare console.* in
    // committed src code. All logging goes through src/lib/logger.ts.
    files: ["src/**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    rules: {
      "no-console": "error",
    },
  },
  {
    // The logger wrapper itself is the sanctioned console boundary.
    files: ["src/lib/logger.ts"],
    rules: {
      "no-console": "off",
    },
  },
];

export default eslintConfig;
