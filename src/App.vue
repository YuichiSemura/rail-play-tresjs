<template>
  <v-app>
    <v-main>
      <!-- サイドバー表示切替ボタン -->
      <v-btn class="sidebar-toggle-btn" icon color="primary" @click="sidebarOpen = !sidebarOpen">
        <v-icon>{{ sidebarOpen ? "mdi-chevron-left" : "mdi-menu" }}</v-icon>
      </v-btn>

      <RailPlayGame :sidebar-open="sidebarOpen" @closeSidebar="sidebarOpen = false" />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref } from "vue";
import RailPlayGame from "./components/RailPlayGame.vue";

const sidebarOpen = ref(true);
</script>

<style scoped>
.sidebar-toggle-btn {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 50; /* サイドバー本体より低く、シーンより高く */
  background: rgba(25, 118, 210, 0.9) !important;
  backdrop-filter: blur(4px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
}
</style>
