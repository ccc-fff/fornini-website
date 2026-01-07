import { defineType, defineField, defineArrayMember } from 'sanity'
import { ImagesIcon } from '@sanity/icons'

export const slideshow = defineType({
  name: 'slideshow',
  title: 'Slideshow',
  type: 'document',
  icon: ImagesIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Titre (interne)',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slides',
      title: 'Slides',
      type: 'array',
      of: [
        defineArrayMember({ type: 'slideImage' }),
        defineArrayMember({ type: 'slideVimeo' }),
      ],
      validation: (rule) => rule.min(1).required(),
    }),
    defineField({
      name: 'defaultDuration',
      title: 'Durée par défaut (ms)',
      type: 'number',
      initialValue: 5000,
      validation: (rule) => rule.min(1000).max(60000),
      description: 'Durée par défaut pour les slides sans durée spécifiée',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      slides: 'slides',
    },
    prepare({ title, slides }) {
      return {
        title: title || 'Slideshow',
        subtitle: `${slides?.length || 0} slides`,
      }
    },
  },
})
