import { defineType, defineField } from 'sanity'
import { PlayIcon } from '@sanity/icons'

export const slideVimeo = defineType({
  name: 'slideVimeo',
  title: 'Vidéo Vimeo',
  type: 'object',
  icon: PlayIcon,
  fields: [
    defineField({
      name: 'vimeoId',
      title: 'ID Vidéo Vimeo',
      type: 'string',
      description: 'Ex: 76979871 (depuis vimeo.com/76979871)',
      validation: (rule) =>
        rule.required().regex(/^\d+$/, {
          name: 'vimeoId',
          invert: false,
        }).error('Entrez uniquement l\'ID numérique'),
    }),
    defineField({
      name: 'scale',
      title: 'Echelle (%)',
      type: 'number',
      initialValue: 100,
      validation: (rule) => rule.min(1).max(200),
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
      description: 'Durée d\'affichage avant passage au slide suivant',
    }),
  ],
  preview: {
    select: {
      vimeoId: 'vimeoId',
      scale: 'scale',
    },
    prepare({ vimeoId, scale }) {
      return {
        title: `Vimeo ${vimeoId}`,
        subtitle: `${scale || 100}%`,
      }
    },
  },
})
