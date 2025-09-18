import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const rawBase = env.VITE_GITHUB_PAGES_BASE?.trim()
  const base = rawBase && rawBase.startsWith('/') ? rawBase : '/'

  return {
    base,
    plugins: [react()],
  }
})
