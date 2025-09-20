import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createServer } from "./server";

export default defineConfig(({ mode }) => ({
  server: {
    host: "localhost", // "::" di jagah localhost rakh, safer
    port: 8080,
    fs: {
      allow: [
        path.resolve(__dirname, "."),        // project root allow
        path.resolve(__dirname, "./client"), // client allow
        path.resolve(__dirname, "./shared"), // shared allow
      ],
      deny: [
        ".env",
        ".env.*",
        "*.{crt,pem}",
        "**/.git/**",
        "server/**",
      ],
    },
  },
  build: {
    outDir: "dist/spa",
  },
  plugins: [react(), expressPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // Only in dev
    configureServer(server) {
      const app = createServer();
      server.middlewares.use(app); // Mount express on Vite
    },
  };
}
