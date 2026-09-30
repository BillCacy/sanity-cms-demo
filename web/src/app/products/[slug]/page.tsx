import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PortableText } from "next-sanity";
import { client } from "@/sanity/client";
import { urlFor } from "@/sanity/image";
import { PRODUCT_QUERY } from "@/sanity/queries";

const options = { next: { revalidate: 30 } };

const formatPrice = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await client.fetch(PRODUCT_QUERY, { slug }, options);

  if (!product) notFound();

  const [mainImage, ...otherImages] = product.images ?? [];

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-16">
      <Link href="/" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
        ← All products
      </Link>

      <div className="mt-8 grid grid-cols-1 gap-12 md:grid-cols-2">
        <div className="space-y-4">
          {mainImage?.asset && (
            <Image
              src={urlFor(mainImage).width(900).height(900).fit("crop").url()}
              alt={mainImage.alt ?? product.title ?? ""}
              width={900}
              height={900}
              priority
              className="w-full rounded-lg bg-zinc-100 dark:bg-zinc-900"
            />
          )}
          {otherImages.length > 0 && (
            <div className="grid grid-cols-4 gap-4">
              {otherImages.map(
                (image) =>
                  image.asset && (
                    <Image
                      key={image._key}
                      src={urlFor(image).width(300).height(300).fit("crop").url()}
                      alt={image.alt ?? ""}
                      width={300}
                      height={300}
                      className="rounded-md bg-zinc-100 dark:bg-zinc-900"
                    />
                  ),
              )}
            </div>
          )}
        </div>

        <div>
          {product.brand?.name && (
            <p className="text-sm uppercase tracking-wide text-zinc-500">{product.brand.name}</p>
          )}
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{product.title}</h1>

          {typeof product.price === "number" && (
            <p className="mt-4 text-2xl">
              {formatPrice(product.price)}
              {typeof product.compareAtPrice === "number" &&
                product.compareAtPrice > product.price && (
                  <span className="ml-3 text-lg text-zinc-500 line-through">
                    {formatPrice(product.compareAtPrice)}
                  </span>
                )}
            </p>
          )}

          {product.summary && <p className="mt-6 text-lg">{product.summary}</p>}

          {Array.isArray(product.description) && (
            <div className="mt-6 space-y-4">
              <PortableText value={product.description} />
            </div>
          )}

          {product.categories && product.categories.length > 0 && (
            <ul className="mt-8 flex flex-wrap gap-2">
              {product.categories.map((category) => (
                <li
                  key={category._id}
                  className="rounded-full bg-zinc-100 px-3 py-1 text-sm dark:bg-zinc-800"
                >
                  {category.title}
                </li>
              ))}
            </ul>
          )}

          {product.sku && <p className="mt-8 text-xs text-zinc-500">SKU: {product.sku}</p>}
        </div>
      </div>
    </main>
  );
}
