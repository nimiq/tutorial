import vue from '@astrojs/vue'
import tutorialkit from '@tutorialkit/astro'
import { defineConfig } from 'astro/config'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

// Read package version at build time
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const packageJson = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'))

export default defineConfig({
  site: 'https://nimiq.guide/',
  devToolbar: {
    enabled: false,
  },
  vite: {
    define: {
      'import.meta.env.PACKAGE_VERSION': JSON.stringify(packageJson.version),
    },
  },
  integrations: [
    tutorialkit({
      components: {
        TopBar: './src/components/CustomTopBar.astro',
        HeadTags: './src/components/CustomHeadLinks.astro',
      },
    }),
    vue(),
  ],
})
