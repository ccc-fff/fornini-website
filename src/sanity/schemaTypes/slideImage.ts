import { defineType, defineField } from 'sanity'
import { ImageIcon } from '@sanity/icons'

export const slideImage = defineType({
  name: 'slideImage',
  title: 'Image',
  type: 'object',
  icon: ImageIcon,
  fields: [
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: { hotspot: true },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'alt',
      title: 'Texte alternatif',
      type: 'string',
    }),
    defineField({
      name: 'scale',
      title: 'Echelle (%)',
      type: 'number',
      initialValue: 100,
      validation: (rule) => rule.min(1).max(200),
      description: '100 = taille normale, 50 = moitié, 200 = double',
    }),
    defineField({
      name: 'position',
      title: 'Position',
      type: 'string',
      options: {
        list: [
          { title: 'Haut Gauche', value: '11' },
          { title: 'Haut Centre', value: '21' },
          { title: 'Haut Droite', value: '31' },
          { title: 'Milieu Gauche', value: '12' },
          { title: 'Centre', value: '22' },
          { title: 'Milieu Droite', value: '32' },
          { title: 'Bas Gauche', value: '13' },
          { title: 'Bas Centre', value: '23' },
          { title: 'Bas Droite', value: '33' },
        ],
        layout: 'radio',
      },
      initialValue: '22',
    }),
    defineField({
      name: 'duration',
      title: 'Durée (ms)',
      type: 'number',
      description: 'Laisser vide pour utiliser la durée par défaut',
    }),
  ],
  preview: {
    select: {
      media: 'image',
      scale: 'scale',
      position: 'position',
    },
    prepare({ media, scale, position }) {
      return {
        title: `Image - ${scale || 100}%`,
        subtitle: `Position ${position || '22'}`,
        media,
      }
    },
  },
})
