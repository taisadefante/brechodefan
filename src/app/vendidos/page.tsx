"use client";

import { useEffect, useState } from "react";
import { getProducts } from "@/lib/firestore";
import { Product } from "@/types";
import ProductCard from "@/components/ProductCard";

export default function VendidosPage() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    getProducts(true).then((list) => setProducts(list.filter((p) => p.status === "vendido")));
  }, []);

  return (
    <main className="container py-5">
      <h1 className="fw-bold">Produtos vendidos</h1>
      <p>Peças que já encontraram uma nova casa.</p>

      <div className="row g-4">
        {products.map((product) => (
          <div className="col-md-6 col-lg-4" key={product.id}>
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </main>
  );
}
