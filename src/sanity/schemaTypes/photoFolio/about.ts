import { defineType, defineField } from 'sanity'

export const about = defineType({
  name: 'about',
  title: 'À propos',
  type: 'document',
  fields: [
    defineField({
      name: 'bio',
      title: 'Biographie',
      type: 'object',
      options: { collapsible: false },
      fields: [
        { name: 'fr', type: 'array', title: '🇫🇷 Français', of: [{ type: 'richTextBlock' }] },
        { name: 'en', type: 'array', title: '🇬🇧 English', of: [{ type: 'richTextBlock' }] },
      ],
    }),
    defineField({
      name: 'contacts',
      title: 'Liens de contact',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'label',
              title: 'Nom affiché',
              type: 'object',
              options: { collapsible: false, columns: 2 },
              fields: [
                { name: 'fr', type: 'string', title: '🇫🇷 Français' },
                { name: 'en', type: 'string', title: '🇬🇧 English' },
              ],
            },
            {
              name: 'value',
              title: 'Valeur',
              type: 'string',
              validation: (rule) => rule.required(),
            },
            {
              name: 'type',
              type: 'string',
              options: {
                list: [
                  { title: 'Email', value: 'email' },
                  { title: 'URL externe', value: 'url' },
                  { title: 'Texte simple', value: 'text' },
                ],
                layout: 'radio',
              },
            },
          ],
          preview: {
            select: {
              title: 'label.fr',
              subtitle: 'value',
            },
          },
        },
      ],
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'À propos',
        subtitle: 'Bio et liens de contact',
      }
    },
  },
})
