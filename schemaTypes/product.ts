import {defineArrayMember, defineField, defineType} from 'sanity'
import {PackageIcon} from '@sanity/icons/Package'

export const product = defineType({
  name: 'product',
  title: 'Product',
  type: 'document',
  icon: PackageIcon,
  groups: [
    {name: 'details', title: 'Details', default: true},
    {name: 'media', title: 'Media'},
    {name: 'commerce', title: 'Pricing & inventory'},
  ],
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      group: 'details',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      group: 'details',
      options: {source: 'title'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'summary',
      type: 'text',
      rows: 2,
      group: 'details',
      description: 'Short description used in product listings.',
      validation: (rule) => rule.max(200).warning('Keep it under 200 characters'),
    }),
    defineField({
      name: 'description',
      type: 'array',
      group: 'details',
      of: [defineArrayMember({type: 'block'})],
    }),
    defineField({
      name: 'brand',
      type: 'reference',
      group: 'details',
      to: [{type: 'brand'}],
    }),
    defineField({
      name: 'categories',
      type: 'array',
      group: 'details',
      of: [defineArrayMember({type: 'reference', to: [{type: 'category'}]})],
      validation: (rule) => rule.unique(),
    }),
    defineField({
      name: 'images',
      type: 'array',
      group: 'media',
      description: 'The first image is used as the main product image.',
      of: [
        defineArrayMember({
          type: 'image',
          options: {hotspot: true},
          fields: [
            defineField({
              name: 'alt',
              title: 'Alternative text',
              type: 'string',
              validation: (rule) => rule.required().warning('Alt text helps accessibility and SEO'),
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'sku',
      title: 'SKU',
      type: 'string',
      group: 'commerce',
      description: 'Links this product to its stock level in the store database.',
      validation: (rule) =>
        rule.required().custom(async (sku, context) => {
          if (!sku) return true
          const client = context.getClient({apiVersion: '2026-09-30'})
          const id = context.document?._id.replace(/^drafts\./, '')
          const duplicates = await client.fetch<number>(
            'count(*[_type == "product" && sku == $sku && !(_id in [$id, "drafts." + $id])])',
            {sku, id},
          )
          return duplicates === 0 || 'Another product already uses this SKU'
        }),
    }),
    defineField({
      name: 'price',
      type: 'number',
      group: 'commerce',
      description: 'Price in USD.',
      validation: (rule) => rule.required().min(0).precision(2),
    }),
    defineField({
      name: 'compareAtPrice',
      title: 'Compare-at price',
      type: 'number',
      group: 'commerce',
      description: 'Optional original price, shown struck through when higher than the price.',
      validation: (rule) =>
        rule
          .min(0)
          .precision(2)
          .custom((value, context) => {
            const price = context.document?.price as number | undefined
            if (value !== undefined && price !== undefined && value <= price) {
              return 'Compare-at price should be higher than the price'
            }
            return true
          }),
    }),
    defineField({
      name: 'status',
      type: 'string',
      group: 'commerce',
      description: 'Hidden products are not shown or sold in the storefront.',
      initialValue: 'active',
      options: {
        list: [
          {title: 'Active', value: 'active'},
          {title: 'Hidden', value: 'hidden'},
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {title: 'title', sku: 'sku', price: 'price', status: 'status', media: 'images.0'},
    prepare({title, sku, price, status, media}) {
      const parts = [
        sku,
        typeof price === 'number' ? `$${price.toFixed(2)}` : undefined,
        status === 'hidden' ? 'Hidden' : undefined,
      ].filter(Boolean)
      return {title, subtitle: parts.join(' · '), media}
    },
  },
})
