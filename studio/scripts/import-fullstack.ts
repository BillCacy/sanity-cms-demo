/**
 * Imports the NimbusTech catalog (categories + products) from the FullStack
 * app's Postgres snapshot into Sanity. Stock is intentionally not imported:
 * it stays in Postgres and is joined to Sanity products on `sku`.
 *
 * Idempotent: categories are matched on slug, products on SKU, images on
 * their source URL (stored as the asset's `source.id`), so reruns update
 * existing documents instead of duplicating them.
 *
 * Run from the studio folder:
 *   npx sanity exec scripts/import-fullstack.ts --with-user-token
 */
import {readFileSync} from 'node:fs'
import {getCliClient} from 'sanity/cli'

type Snapshot = {
  categories: {name: string; slug: string}[]
  products: {
    name: string
    slug: string
    description: string
    priceCents: number
    sku: string
    imageUrl: string
    isActive: boolean
    category: string
  }[]
}

const client = getCliClient({apiVersion: '2026-09-30'})
const snapshot: Snapshot = JSON.parse(
  readFileSync(new URL('./fullstack-catalog.json', import.meta.url), 'utf8'),
)

const IMAGE_SOURCE = 'fullstack-import'

function toBlocks(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => ({
      _type: 'block',
      _key: Math.random().toString(36).slice(2, 10),
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: Math.random().toString(36).slice(2, 10),
          text: paragraph,
          marks: [],
        },
      ],
    }))
}

async function uploadImage(url: string, filename: string): Promise<string> {
  const existing = await client.fetch<string | null>(
    `*[_type == "sanity.imageAsset" && source.name == $name && source.id == $url][0]._id`,
    {name: IMAGE_SOURCE, url},
  )
  if (existing) return existing

  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to download ${url}: ${response.status}`)
  const buffer = Buffer.from(await response.arrayBuffer())
  const asset = await client.assets.upload('image', buffer, {
    filename,
    source: {name: IMAGE_SOURCE, id: url, url},
  })
  return asset._id
}

async function importCategories() {
  const idsBySlug = new Map<string, string>()
  for (const category of snapshot.categories) {
    const existingId = await client.fetch<string | null>(
      `*[_type == "category" && slug.current == $slug && !(_id in path("drafts.**"))][0]._id`,
      {slug: category.slug},
    )
    const fields = {title: category.name, slug: {_type: 'slug', current: category.slug}}
    const doc = existingId
      ? await client.patch(existingId).set(fields).commit()
      : await client.create({_type: 'category', ...fields})
    idsBySlug.set(category.slug, doc._id)
    console.log(`${existingId ? 'updated' : 'created'} category ${category.slug}`)
  }
  return idsBySlug
}

async function importProducts(categoryIds: Map<string, string>) {
  for (const product of snapshot.products) {
    const categoryId = categoryIds.get(product.category)
    if (!categoryId) throw new Error(`Unknown category "${product.category}" for ${product.sku}`)

    const assetId = await uploadImage(product.imageUrl, `${product.slug}.jpg`)
    const existingId = await client.fetch<string | null>(
      `*[_type == "product" && sku == $sku && !(_id in path("drafts.**"))][0]._id`,
      {sku: product.sku},
    )

    const fields = {
      title: product.name,
      slug: {_type: 'slug', current: product.slug},
      description: toBlocks(product.description),
      sku: product.sku,
      price: product.priceCents / 100,
      status: product.isActive ? 'active' : 'hidden',
      categories: [{_type: 'reference', _ref: categoryId, _key: product.category}],
      images: [
        {
          _type: 'image',
          _key: 'main',
          asset: {_type: 'reference', _ref: assetId},
          alt: product.name,
        },
      ],
    }

    if (existingId) {
      await client.patch(existingId).set(fields).commit()
    } else {
      await client.create({_type: 'product', ...fields})
    }
    console.log(`${existingId ? 'updated' : 'created'} product ${product.sku} ${product.name}`)
  }
}

const categoryIds = await importCategories()
await importProducts(categoryIds)

const counts = await client.fetch<{categories: number; products: number; withImage: number}>(`{
  "categories": count(*[_type == "category" && !(_id in path("drafts.**"))]),
  "products": count(*[_type == "product" && !(_id in path("drafts.**"))]),
  "withImage": count(*[_type == "product" && defined(images[0].asset) && !(_id in path("drafts.**"))])
}`)
console.log(
  `\nDone. Sanity now has ${counts.categories} categories and ${counts.products} products ` +
    `(${counts.withImage} with images). Snapshot had ${snapshot.categories.length} and ${snapshot.products.length}.`,
)
