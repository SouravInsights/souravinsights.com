import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

// Matches the previous `.eslintrc.json` (`next/core-web-vitals`).
//
// eslint-config-next 16 turns on the React Compiler hook rules
// (`set-state-in-effect`, `immutability`, `refs`, `purity`) as errors. The
// codebase predates them; 55 existing sites trip them. They are downgraded to
// warnings so `lint` keeps passing while the debt stays visible. Fix them in
// their own change, not in the deploy-speedup one.
export default defineConfig([
  ...nextCoreWebVitals,
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
