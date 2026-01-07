import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { schemaTypes } from './src/sanity/schemaTypes'

export default defineConfig({
  name: 'fornini',
  title: 'Fornini.com',

  projectId: 'nbpf7c4u',
  dataset: 'fornini',

  plugins: [structureTool()],

  schema: {
    types: schemaTypes,
  },
})
