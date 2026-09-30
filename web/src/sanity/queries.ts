import { defineQuery } from "next-sanity";

export const PRODUCTS_QUERY = defineQuery(`
  *[_type == "product" && status == "active" && defined(slug.current)] | order(title asc) {
    _id,
    title,
    "slug": slug.current,
    summary,
    price,
    compareAtPrice,
    "image": images[0]{ asset, alt, hotspot, crop }
  }
`);

export const PRODUCT_QUERY = defineQuery(`
  *[_type == "product" && status == "active" && slug.current == $slug][0] {
    _id,
    title,
    summary,
    description,
    sku,
    price,
    compareAtPrice,
    images[]{ _key, asset, alt, hotspot, crop },
    brand->{ name },
    categories[]->{ _id, title }
  }
`);
