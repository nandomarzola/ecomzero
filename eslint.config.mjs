import nextConfig from "eslint-config-next";

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  {
    // apps/admin é um projeto Next.js isolado, com seu próprio eslint.config.mjs
    // e lint próprio (`npm run lint` dentro de apps/admin).
    ignores: ["src/generated/**", "apps/**"],
  },
  ...nextConfig,
];

export default eslintConfig;
