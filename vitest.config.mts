import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // nos testes, módulos de servidor podem ser importados diretamente
      "server-only": fileURLToPath(new URL("./tests/stubs/vazio.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    // os testes de banco compartilham o mesmo Postgres local: rodar um arquivo por vez
    fileParallelism: false,
  },
});
