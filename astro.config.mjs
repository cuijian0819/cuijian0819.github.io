import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://cuijian0819.github.io',

  // Every one of these is a URL that was live on the Jekyll site. None may 404.
  // /publications/ in particular may be linked from a CV or a paper footer, so
  // it stays a redirect source even though the section is now called papers.
  // Astro emits <dir>/index.html for each; GitHub Pages sends /blog to /blog/.
  redirects: {
    '/publications/': '/#papers',
    '/cv/': '/assets/pdf/CV_Jian.pdf',
    '/blog/': '/',
    '/projects/': '/',
  },
})
