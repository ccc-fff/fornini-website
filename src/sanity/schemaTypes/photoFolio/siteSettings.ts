import { defineType, defineField } from 'sanity'

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Paramètres du site',
  type: 'document',
  fields: [
    defineField({
      name: 'defaultBackgroundColor',
      title: 'Couleur de fond par défaut',
      type: 'color',
      options: { disableAlpha: true },
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'Paramètres du site',
        subtitle: 'Configuration globale',
      }
    },
  },
})
