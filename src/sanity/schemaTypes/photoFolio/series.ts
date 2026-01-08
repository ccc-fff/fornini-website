import { defineType, defineField } from 'sanity'

export const series = defineType({
  name: 'series',
  title: 'Série',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Titre',
      type: 'object',
      options: { collapsible: false, columns: 2 },
      fields: [
        { name: 'fr', type: 'string', title: '🇫🇷 Français', validation: (rule) => rule.required() },
        { name: 'en', type: 'string', title: '🇬🇧 English', validation: (rule) => rule.required() },
      ],
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title.fr' },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'orderRank',
      type: 'string',
      hidden: true,
    }),
    defineField({
      name: 'hidden',
      title: 'Masquer',
      type: 'boolean',
    }),
    defineField({
      name: 'gridCount',
      title: 'Images sur la grille',
      type: 'number',
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'images',
      type: 'array',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
          fields: [{ name: 'alt', type: 'string', title: 'Texte alternatif' }],
        },
      ],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'description',
      type: 'object',
      options: { collapsible: false },
      fields: [
        { name: 'fr', type: 'array', title: '🇫🇷 Français', of: [{ type: 'richTextBlock' }] },
        { name: 'en', type: 'array', title: '🇬🇧 English', of: [{ type: 'richTextBlock' }] },
      ],
    }),
    defineField({
      name: 'shortDescription',
      title: 'Description courte',
      type: 'object',
      options: { collapsible: false, columns: 2 },
      fields: [
        { name: 'fr', type: 'string', title: '🇫🇷 Français' },
        { name: 'en', type: 'string', title: '🇬🇧 English' },
      ],
    }),
    defineField({
      name: 'client',
      type: 'object',
      options: { collapsible: false, columns: 2 },
      fields: [
        { name: 'fr', type: 'string', title: '🇫🇷 Français' },
        { name: 'en', type: 'string', title: '🇬🇧 English' },
      ],
    }),
    defineField({
      name: 'backgroundColor',
      title: 'Couleur de fond',
      type: 'color',
      options: { disableAlpha: true },
    }),
  ],
  preview: {
    select: {
      title: 'title.fr',
      subtitle: 'client.fr',
      media: 'images.0',
    },
  },
})
