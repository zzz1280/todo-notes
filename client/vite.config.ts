import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // 开发时的代理：浏览器请求 /api/**，由 Vite 转发给后端 3001 端口。
    // 好处：前端代码里只写相对路径（/api/notes），不存在跨域问题；
    // 部署时只要让 nginx 等做同样的转发，前端代码一行不用改。
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
