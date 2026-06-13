"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";

import { Product } from "@/types";
import { normalizeText } from "@/lib/utils";
import { theme } from "@/lib/theme";

export type ProductFilters = {
  category?: string;
  type?: string;
  subtype?: string;
  size?: string;
  color?: string;
  gender?: string;
  brand?: string;
  condition?: string;
  minPrice?: string;
  maxPrice?: string;
};

type FilterBarProps = {
  products: Product[];
  search: string;
  setSearch: (value: string) => void;
  filters: ProductFilters;
  setFilters: (value: ProductFilters) => void;
};

function uniqueValues(products: Product[], key: keyof Product) {
  return Array.from(
    new Set(
      products
        .map((product) => String(product[key] || "").trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));
}

function uniqueSizeAgeValues(products: Product[]) {
  return Array.from(
    new Set(
      products
        .flatMap((product) => [
          String(product.size || "").trim(),
          String(product.age || "").trim(),
        ])
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));
}

function filteredOptionsByCurrentSelection(
  products: Product[],
  filters: ProductFilters,
  key: keyof Product,
) {
  return products.filter((product) => {
    if (key !== "category" && filters.category) {
      if (product.category !== filters.category) return false;
    }

    if (key !== "type" && filters.type) {
      if (product.type !== filters.type) return false;
    }

    if (key !== "subtype" && filters.subtype) {
      if (product.subtype !== filters.subtype) return false;
    }

    return true;
  });
}

export function productMatchesFilters(
  product: Product,
  search: string,
  filters: ProductFilters,
) {
  const text = normalizeText(
    [
      product.name,
      product.description,
      product.category,
      product.type,
      product.subtype,
      product.size,
      product.age,
      product.color,
      product.gender,
      product.brand,
      product.condition,
      product.measurements,
    ]
      .filter(Boolean)
      .join(" "),
  );

  const searchOk = !search || text.includes(normalizeText(search));

  const categoryOk = !filters.category || product.category === filters.category;
  const typeOk = !filters.type || product.type === filters.type;
  const subtypeOk = !filters.subtype || product.subtype === filters.subtype;

  const sizeOk =
    !filters.size ||
    product.size === filters.size ||
    product.age === filters.size;

  const colorOk = !filters.color || product.color === filters.color;
  const genderOk = !filters.gender || product.gender === filters.gender;
  const brandOk = !filters.brand || product.brand === filters.brand;
  const conditionOk =
    !filters.condition || product.condition === filters.condition;

  const price = Number(product.price || 0);

  const minPriceOk =
    !filters.minPrice || price >= Number(filters.minPrice || 0);

  const maxPriceOk =
    !filters.maxPrice || price <= Number(filters.maxPrice || 0);

  return (
    searchOk &&
    categoryOk &&
    typeOk &&
    subtypeOk &&
    sizeOk &&
    colorOk &&
    genderOk &&
    brandOk &&
    conditionOk &&
    minPriceOk &&
    maxPriceOk
  );
}

export default function FilterBar({
  products,
  search,
  setSearch,
  filters,
  setFilters,
}: FilterBarProps) {
  const categoryProducts = filteredOptionsByCurrentSelection(
    products,
    filters,
    "category",
  );

  const typeProducts = filteredOptionsByCurrentSelection(
    products,
    filters,
    "type",
  );

  const subtypeProducts = filteredOptionsByCurrentSelection(
    products,
    filters,
    "subtype",
  );

  const fields: {
    key: keyof ProductFilters;
    label: string;
    options: string[];
  }[] = [
    {
      key: "category",
      label: "Categoria",
      options: uniqueValues(categoryProducts, "category"),
    },
    {
      key: "type",
      label: "Tipo",
      options: uniqueValues(typeProducts, "type"),
    },
    {
      key: "subtype",
      label: "Subtipo",
      options: uniqueValues(subtypeProducts, "subtype"),
    },
    {
      key: "gender",
      label: "Sexo",
      options: uniqueValues(products, "gender"),
    },
    {
      key: "size",
      label: "Tamanho / Idade",
      options: uniqueSizeAgeValues(products),
    },
    {
      key: "color",
      label: "Cor",
      options: uniqueValues(products, "color"),
    },
    {
      key: "brand",
      label: "Marca",
      options: uniqueValues(products, "brand"),
    },
    {
      key: "condition",
      label: "Estado",
      options: uniqueValues(products, "condition"),
    },
  ];

  function updateFilter(key: keyof ProductFilters, value: string) {
    const nextFilters: ProductFilters = {
      ...filters,
      [key]: value,
    };

    if (key === "category") {
      nextFilters.type = "";
      nextFilters.subtype = "";
    }

    if (key === "type") {
      nextFilters.subtype = "";
    }

    setFilters(nextFilters);
  }

  function clearFilters() {
    setSearch("");
    setFilters({});
  }

  const hasFilters =
    Boolean(search) || Object.values(filters).some((value) => Boolean(value));

  return (
    <div
      className="mb-4"
      style={{
        background: "#fffaf3",
        borderRadius: 26,
        padding: 18,
        boxShadow: "0 14px 34px rgba(92,54,34,.08)",
        border: `1px solid ${theme.border}`,
      }}
    >
      <div className="d-flex align-items-center gap-2 mb-3">
        <SlidersHorizontal size={20} color={theme.brown} />

        <h5 className="fw-bold mb-0">Filtros</h5>

        {hasFilters && (
          <button
            type="button"
            className="btn btn-sm ms-auto"
            onClick={clearFilters}
            style={{
              borderRadius: 999,
              background: theme.ivory,
              color: theme.brown,
              border: `1px solid ${theme.border}`,
            }}
          >
            <X size={14} className="me-1" />
            Limpar
          </button>
        )}
      </div>

      <div className="row g-2">
        <div className="col-12 col-lg-4">
          <div className="input-group">
            <span
              className="input-group-text"
              style={{
                background: theme.ivory,
                borderColor: theme.border,
                borderRadius: "999px 0 0 999px",
              }}
            >
              <Search size={17} />
            </span>

            <input
              className="form-control"
              placeholder="Buscar produto, marca, cor..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{
                borderColor: theme.border,
                borderRadius: "0 999px 999px 0",
              }}
            />
          </div>
        </div>

        {fields.map((field) => (
          <div className="col-6 col-md-4 col-lg-2" key={field.key}>
            <select
              className="form-select"
              value={filters[field.key] || ""}
              onChange={(event) => updateFilter(field.key, event.target.value)}
              style={{
                borderRadius: 999,
                borderColor: theme.border,
                color: theme.brownDark,
              }}
            >
              <option value="">{field.label}</option>

              {field.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        ))}

        <div className="col-6 col-md-4 col-lg-2">
          <input
            className="form-control"
            type="number"
            min="0"
            placeholder="Preço mín."
            value={filters.minPrice || ""}
            onChange={(event) => updateFilter("minPrice", event.target.value)}
            style={{
              borderRadius: 999,
              borderColor: theme.border,
            }}
          />
        </div>

        <div className="col-6 col-md-4 col-lg-2">
          <input
            className="form-control"
            type="number"
            min="0"
            placeholder="Preço máx."
            value={filters.maxPrice || ""}
            onChange={(event) => updateFilter("maxPrice", event.target.value)}
            style={{
              borderRadius: 999,
              borderColor: theme.border,
            }}
          />
        </div>
      </div>
    </div>
  );
}