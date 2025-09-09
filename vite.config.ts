import { defineConfig } from "vite";
import { templateCompilerOptions } from "@tresjs/core";
import vue from "@vitejs/plugin-vue";
import glsl from "vite-plugin-glsl";

export default defineConfig({
  // GitHub Pages で /<repo>/ 配下に配置されるためベースパスを設定
  // 例: https://yuichisemura.github.io/rail-play-tresjs/
  base: "/rail-play-tresjs/",
  plugins: [vue({ ...templateCompilerOptions }), glsl()],
});
