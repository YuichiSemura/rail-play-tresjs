<template>
  <v-app>
    <v-main>
      <!-- サイドバー表示切替ボタン -->
      <v-btn
        class="sidebar-toggle-btn"
        icon
        color="primary"
        @click="sidebarOpen = !sidebarOpen"
      >
        <v-icon>{{ sidebarOpen ? 'mdi-chevron-left' : 'mdi-menu' }}</v-icon>
      </v-btn>

      <RailPlayGame :sidebar-open="sidebarOpen" />
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
  top: 16px;
  right: 16px;
  z-index: 1000;
  background: rgba(25, 118, 210, 0.9) !important;
  backdrop-filter: blur(4px);
}
</style>
