import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import fg from 'fast-glob'

interface TutorialInfo {
  slug: string
  title: string
  dir: string
  lessons: LessonInfo[]
}

interface LessonInfo {
  number: number
  title: string
  contentPath: string
  solutionDir: string | null
}

async function scanTutorials(): Promise<TutorialInfo[]> {
  const tutorialDirs = await fg('src/content/tutorial/*-*/', { onlyDirectories: true })

  const tutorials: TutorialInfo[] = []

  for (const dir of tutorialDirs) {
    try {
      const metaPath = join(dir, 'meta.md')
      const metaContent = readFileSync(metaPath, 'utf-8')

      const titleMatch = metaContent.match(/title:\s*(.+)/)
      const title = titleMatch ? titleMatch[1].trim() : 'Untitled'

      const slug = dir.split('/').pop()!.replace(/^\d+-/, '')

      const lessonDirs = await fg(`${dir}/*-*/`, { onlyDirectories: true })
      const lessons: LessonInfo[] = []

      for (const lessonDir of lessonDirs) {
        const lessonName = lessonDir.split('/').pop()!
        const numberMatch = lessonName.match(/^(\d+)-/)
        const number = numberMatch ? Number.parseInt(numberMatch[1]) : 0

        const contentPath = join(lessonDir, 'content.md')
        const solutionDir = join(lessonDir, '_solution')

        const lessonContent = readFileSync(contentPath, 'utf-8')
        const lessonTitleMatch = lessonContent.match(/title:\s*(.+)/)
        const lessonTitle = lessonTitleMatch ? lessonTitleMatch[1].trim() : lessonName

        lessons.push({
          number,
          title: lessonTitle,
          contentPath,
          solutionDir: await fg(`${solutionDir}/*`).then(files => files.length > 0 ? solutionDir : null),
        })
      }

      lessons.sort((a, b) => a.number - b.number)

      tutorials.push({ slug, title, dir, lessons })
    }
    catch (error) {
      console.warn(`[llms-plugin] ⚠️  Skipping ${dir}: ${error}`)
      continue
    }
  }

  tutorials.sort((a, b) => a.dir.localeCompare(b.dir))

  return tutorials
}

async function generateTutorialFile(tutorial: TutorialInfo): Promise<string> {
  let content = `# ${tutorial.title}\n\n`

  for (const lesson of tutorial.lessons) {
    content += `## Lesson ${lesson.number}: ${lesson.title}\n\n`

    const lessonContent = readFileSync(lesson.contentPath, 'utf-8')
    const contentWithoutFrontmatter = lessonContent.replace(/^---\n[\s\S]*?\n---\n/, '')
    content += `${contentWithoutFrontmatter}\n\n`

    if (lesson.solutionDir) {
      content += `### Solution Code\n\n`

      const solutionFiles = (await fg(`${lesson.solutionDir}/*`)).sort()
      for (const file of solutionFiles) {
        const fileName = file.split('/').pop()!
        const fileContent = readFileSync(file, 'utf-8')
        const ext = fileName.split('.').pop()

        content += `#### ${fileName}\n\`\`\`${ext}\n${fileContent}\n\`\`\`\n\n`
      }
    }

    content += `---\n\n`
  }

  return content
}

function generateRootIndex(tutorials: TutorialInfo[]): string {
  let content = `# Nimiq Tutorials\n\n`
  content += `Learn to build on Nimiq blockchain through interactive tutorials.\n\n`
  content += `## Available Tutorials\n\n`

  for (const tutorial of tutorials) {
    content += `- [${tutorial.title}](/tutorial/${tutorial.slug}.txt): ${tutorial.title}\n`
  }

  content += `\n## Complete Documentation\n\n`
  content += `- [All Tutorials](/llms-full.txt): Full combined documentation\n`

  return content
}

async function generateAllFiles(outputDir = 'dist') {
  try {
    const tutorials = await scanTutorials()
    const tutorialDir = join(outputDir, 'tutorial')
    mkdirSync(tutorialDir, { recursive: true })

    // Cache content to avoid regenerating for llms-full.txt
    const tutorialContents: string[] = []
    for (const tutorial of tutorials) {
      const content = await generateTutorialFile(tutorial)
      tutorialContents.push(content)
      const outputPath = join(tutorialDir, `${tutorial.slug}.txt`)
      writeFileSync(outputPath, content, 'utf-8')
    }

    const rootIndex = generateRootIndex(tutorials)
    writeFileSync(join(outputDir, 'llms.txt'), rootIndex, 'utf-8')

    const fullContent = tutorialContents.join(`\n\n${'='.repeat(80)}\n\n`)
    writeFileSync(join(outputDir, 'llms-full.txt'), fullContent, 'utf-8')

    return tutorials.length
  }
  catch (error) {
    console.error('[llms-plugin] ❌ Error generating files:', error)
    throw error
  }
}

export function llmsPlugin() {
  let config: any

  return {
    name: 'llms-plugin',

    configResolved(resolvedConfig: any) {
      config = resolvedConfig
    },

    async buildEnd() {
      console.log('[llms-plugin] Generating llms.txt files...')
      const outputDir = config.build?.outDir || 'dist'
      const count = await generateAllFiles(outputDir)
      console.log(`[llms-plugin] ✅ Generated ${count} tutorial files`)
    },

    configureServer(server: any) {
      server.watcher.on('change', async (path: string) => {
        if (path.includes('src/content/tutorial') && (path.endsWith('.md') || path.includes('/_solution/'))) {
          console.log('[llms-plugin] Tutorial content changed, regenerating...')
          await generateAllFiles('dist')
          console.log('[llms-plugin] ✅ Regenerated llms.txt files')
        }
      })
    },
  }
}
