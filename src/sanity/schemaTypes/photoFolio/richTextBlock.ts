import { defineType } from 'sanity'

export const richTextBlock = defineType({
  name: 'richTextBlock',
  title: 'Rich Text Block',
  type: 'block',
  styles: [{ title: 'Normal', value: 'normal' }],
  lists: [],
  marks: {
    decorators: [
      { title: 'Gras', value: 'strong' },
      { title: 'Medium', value: 'medium' },
      { title: 'Italique', value: 'em' },
    ],
    annotations: [
      {
        name: 'link',
        title: 'Lien',
        type: 'object',
        fields: [
          {
            name: 'href',
            title: 'URL',
            type: 'url',
            validation: (rule) => rule.required(),
          },
        ],
      },
    ],
  },
})
