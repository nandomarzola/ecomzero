import nextConfig from "eslint-config-next";

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  { ignores: ["src/generated/**", ".next/**"] },
  ...nextConfig,
];

export default eslintConfig;
