import {defineField, defineType} from 'sanity'
import {TagsIcon} from '@sanity/icons/Tags'

export const brand = defineType({
  name: 'brand',
  title: 'Brand',
  type: 'document',
  icon: TagsIcon,
  fields: [
    defineField({
      name: 'name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'name'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'logo',
      type: 'image',
      fields: [defineField({name: 'alt', title: 'Alternative text', type: 'string'})],
    }),
  ],
})
