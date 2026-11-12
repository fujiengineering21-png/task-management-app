import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // 画面は 5173 番だけで動かす。使われていたら別の番号に逃げずに止まる（CLAUDE.md のルール6）
    port: 5173,
    strictPort: true,
    // /api で始まる依頼を APIサーバーへ中継する（開発中は CORS がいらない）
    // localhost と書くと IPv6 の ::1 に向かって失敗することがあるので、127.0.0.1 と書く（技術スタック 2章）
    proxy: {
      '/api': 'http://127.0.0.1:8080',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/test/**', 'src/**/*.test.{ts,tsx}'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
})
