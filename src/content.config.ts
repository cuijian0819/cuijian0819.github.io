import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const news = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/news' }),
  schema: z.object({
    date: z.coerce.date(),
  }),
})

const thoughts = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/thoughts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    /** Optional one-line italic standfirst under the title, as on the index rows. */
    summary: z.string().optional(),
  }),
})

export const collections = { news, thoughts }
