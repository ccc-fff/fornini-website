import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { colorInput } from '@sanity/color-input'
import { orderableDocumentListDeskItem } from '@sanity/orderable-document-list'
import { schemaTypes } from './src/sanity/schemaTypes'
import { photoFolioSchemaTypes } from './src/sanity/schemaTypes/photoFolio'

export default defineConfig([
  // creativeFolio - fornini.com (Direction Créative)
  {
    name: 'creativeFolio',
    title: 'creativeFolio',
    subtitle: 'fornini.com',
    projectId: 'nbpf7c4u',
    dataset: 'fornini',
    basePath: '/creative',
    plugins: [structureTool()],
    schema: {
      types: schemaTypes,
    },
  },
  // photoFolio - fredericfornini.com (Photographie)
  {
    name: 'photoFolio',
    title: 'photoFolio',
    subtitle: 'fredericfornini.com',
    projectId: 'nbpf7c4u',
    dataset: 'production',
    basePath: '/photo',
    plugins: [
      structureTool({
        structure: (S, context) =>
          S.list()
            .title('Contenu')
            .items([
              // Séries avec drag-and-drop pour l'ordre
              orderableDocumentListDeskItem({
                type: 'series',
                title: 'Séries (ordre)',
                S,
                context,
              }),
              // Séries en édition normale
              S.documentTypeListItem('series').title('Séries (édition)'),
              // À propos
              S.documentTypeListItem('about').title('À propos'),
              S.divider(),
              // Paramètres du site (singleton)
              S.listItem()
                .title('Paramètres du site')
                .child(
                  S.document()
                    .schemaType('siteSettings')
                    .documentId('9c0f5fd2-94e7-466b-95e4-3eb734034dce')
                ),
            ]),
      }),
      colorInput(),
    ],
    schema: {
      types: photoFolioSchemaTypes,
    },
  },
])
