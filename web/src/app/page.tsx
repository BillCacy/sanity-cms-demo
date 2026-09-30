import Image from "next/image";
import Link from "next/link";
import { client } from "@/sanity/client";
import { urlFor } from "@/sanity/image";
import { PRODUCTS_QUERY } from "@/sanity/queries";

const options = { next: { revalidate: 30 } };

const formatPrice = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

export default async function Home() {
  const products = await client.fetch(PRODUCTS_QUERY, {}, options);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-16">
      <h1 className="mb-10 text-3xl font-semibold tracking-tight">Products</h1>

      {products.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">
          No products yet. Publish a product in the Studio to see it here.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <li key={product._id}>
              <Link href={`/products/${product.slug}`} className="group block">
                <div className="aspect-square overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900">
                  {product.image?.asset && (
                    <Image
                      src={urlFor(product.image).width(600).height(600).fit("crop").url()}
                      alt={product.image.alt ?? product.title ?? ""}
                      width={600}
                      height={600}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  )}
                </div>
                <h2 className="mt-4 font-medium">{product.title}</h2>
                {typeof product.price === "number" && (
                  <p className="mt-1 text-zinc-700 dark:text-zinc-300">
                    {formatPrice(product.price)}
                    {typeof product.compareAtPrice === "number" &&
                      product.compareAtPrice > product.price && (
                        <span className="ml-2 text-sm text-zinc-500 line-through">
                          {formatPrice(product.compareAtPrice)}
                        </span>
                      )}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
