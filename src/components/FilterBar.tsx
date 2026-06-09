"use client";

import { Product } from "@/types";
import { theme } from "@/lib/theme";

type Props = {
  products: Product[];
  search: string;
  setSearch: (v: string) => void;
  filters: Record<string, string>;
  setFilters: (v: Record<string, string>) => void;
};

export default function FilterBar({ products, search, setSearch, filters, setFilters }: Props) {
  const fields = [
    ["category", "Categoria"],
    ["size", "Tamanho"],
    ["gender", "Sexo"],
    ["age", "Idade"],
    ["color", "Cor"],
    ["condition", "Estado"]
  ];

  function unique(key: keyof Product) {
    return Array.from(new Set(products.map((p) => String(p[key] || "")).filter(Boolean))).sort();
  }

  return (
    <div className="p-3 mb-4" style={{ background: theme.ivory2, border: `1px solid ${theme.border}`, borderRadius: 24, boxShadow: theme.shadow }}>
      <div className="row g-2">
        <div className="col-md-3">
          <input
            className="form-control"
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ borderRadius: 999 }}
          />
        </div>

        {fields.map(([key, label]) => (
          <div className="col-md" key={key}>
            <select
              className="form-select"
              value={filters[key] || ""}
              onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
              style={{ borderRadius: 999 }}
            >
              <option value="">{label}</option>
              {unique(key as keyof Product).map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
        ))}

        <div className="col-md-auto">
          <button className="btn" style={{ background: theme.brownDark, color: "#fff", borderRadius: 999 }} onClick={() => setFilters({})}>
            Limpar
          </button>
        </div>
      </div>
    </div>
  );
}
