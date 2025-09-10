<template>
  <v-app>
    <v-main>
      <v-app-bar color="primary" dark>
        <v-app-bar-nav-icon v-if="showGame" @click="sidebarOpen = !sidebarOpen" />
        <v-app-bar-title class="d-flex align-center">
          <v-icon class="mr-3">mdi-train</v-icon>
          レール遊びゲーム
        </v-app-bar-title>
        <v-spacer />
        <v-btn v-if="showGame" @click="showGame = false" text>
          <v-icon>mdi-home</v-icon>
          ホーム
        </v-btn>
      </v-app-bar>
      <div v-if="!showGame" class="home-screen">
        <v-container class="fill-height">
          <v-row align="center" justify="center">
            <v-col cols="12" md="8" lg="6">
              <v-card class="mx-auto" max-width="500">
                <v-card-title class="text-center text-h4 py-8">
                  <v-icon size="64" class="mb-4 d-block mx-auto">mdi-train</v-icon>
                  レール遊びゲーム
                </v-card-title>

                <v-card-text class="text-center">
                  <p class="text-h6 mb-4">TresJS + Vue + Vuetify で作る3Dレール配置ゲーム</p>
                  <v-divider class="my-4" />

                  <v-list class="text-left">
                    <v-list-item>
                      <v-list-item-icon>
                        <v-icon color="primary">mdi-play</v-icon>
                      </v-list-item-icon>
                      <v-list-item-content>
                        <v-list-item-title>線路を配置して電車を走らせよう</v-list-item-title>
                      </v-list-item-content>
                    </v-list-item>

                    <v-list-item>
                      <v-list-item-icon>
                        <v-icon color="success">mdi-puzzle</v-icon>
                      </v-list-item-icon>
                      <v-list-item-content>
                        <v-list-item-title>直線とカーブを組み合わせて周回コースを作ろう</v-list-item-title>
                      </v-list-item-content>
                    </v-list-item>

                    <v-list-item>
                      <v-list-item-icon>
                        <v-icon color="info">mdi-rotate-3d-variant</v-icon>
                      </v-list-item-icon>
                      <v-list-item-content>
                        <v-list-item-title>線路の回転や削除もできます</v-list-item-title>
                      </v-list-item-content>
                    </v-list-item>
                  </v-list>
                </v-card-text>

                <v-card-actions class="justify-center pb-8">
                  <v-btn color="primary" size="large" @click="startGame">
                    <v-icon class="mr-2">mdi-play</v-icon>
                    ゲームを始める
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </div>

      <RailPlayGame v-else :sidebar-open="sidebarOpen" />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref } from "vue";
import RailPlayGame from "./components/RailPlayGame.vue";

const showGame = ref(false);
const sidebarOpen = ref(true);

const startGame = () => {
  showGame.value = true;
};
</script>

<style scoped>
.home-screen {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  /* 上部バー（v-app-bar）を差し引いた高さにする */
  min-height: calc(100dvh - var(--v-layout-top, 64px));
}
</style>
