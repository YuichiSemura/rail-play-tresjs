import { defineConfig } from "vite";
import { templateCompilerOptions } from "@tresjs/core";
import vue from "@vitejs/plugin-vue";
import glsl from "vite-plugin-glsl";

export default defineConfig({
  plugins: [vue({ ...templateCompilerOptions }), glsl()],
});
