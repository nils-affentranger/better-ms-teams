import { defineConfig, type Plugin } from "vite";
import monkey from "vite-plugin-monkey";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as sass from "sass";

const DEV_PORT = 1423;

function devServer(): Plugin {
  let started = false;
  let isWatch = false;

  return {
    name: "dev-server",
    apply: "build",
    configResolved(config) {
      isWatch = !!config.build.watch;
    },
    closeBundle() {
      if (!isWatch || started) return;
      started = true;

      const scriptPath = resolve("dist", "teams.user.js");
      const scssPath = resolve("src/styles/main.scss");

      createServer((req, res) => {
        res.setHeader("Access-Control-Allow-Origin", "*");

        if (req.url === "/dev.user.js") {
          res.setHeader("Content-Type", "text/javascript");
          res.end(
            [
              "// ==UserScript==",
              "// @name         Teams Userscript [dev]",
              "// @match        https://teams.cloud.microsoft/*",
              "// @grant        GM_addStyle",
              "// @grant        GM_xmlhttpRequest",
              "// @connect      localhost",
              "// ==/UserScript==",
              "",
              "GM_xmlhttpRequest({",
              '  method: "GET",',
              `  url: "http://localhost:${DEV_PORT}/style.css",`,
              "  onload(r) { GM_addStyle(r.responseText); },",
              '  onerror(e) { console.error("[dev loader]", e); },',
              "});",
            ].join("\n"),
          );
          return;
        }

        if (req.url === "/style.css") {
          try {
            const result = sass.compile(scssPath, { style: "compressed" });
            res.setHeader("Content-Type", "text/css");
            res.end(result.css);
          } catch (e) {
            res.statusCode = 500;
            res.end(String(e));
          }
          return;
        }

        // Serve the full built script for production installation
        try {
          res.setHeader("Content-Type", "text/javascript");
          res.end(readFileSync(scriptPath));
        } catch {
          res.statusCode = 404;
          res.end("Not found");
        }
      }).listen(DEV_PORT, () => {
        console.log(
          `\n  Dev loader: http://localhost:${DEV_PORT}/dev.user.js\n`,
        );
      });
    },
  };
}

export default defineConfig({
  plugins: [
    monkey({
      entry: "src/index.ts",
      userscript: {
        name: "Teams Userscript",
        namespace: "https://github.com/yourname",
        version: "1.0.0",
        description: "A modern userscript with TypeScript and SCSS",
        match: ["https://teams.cloud.microsoft/*"],
      },
      build: {
        fileName: "teams.user.js",
      },
    }),
    devServer(),
  ],
});
