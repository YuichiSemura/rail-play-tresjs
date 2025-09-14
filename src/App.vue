<template>
  <v-app>
    <v-main>
      <v-app-bar color="primary" dark>
        <v-app-bar-nav-icon @click="sidebarOpen = !sidebarOpen" />
        <v-app-bar-title class="d-flex align-center">
          <v-icon class="mr-3">mdi-train</v-icon>
          レール遊びゲーム
        </v-app-bar-title>
      </v-app-bar>

      <RailPlayGame :sidebar-open="sidebarOpen" />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref } from "vue";
import RailPlayGame from "./components/RailPlayGame.vue";

const sidebarOpen = ref(true);
</script>
