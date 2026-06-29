"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { Product } from "@/types";
import { theme } from "@/lib/theme";

type FilterBarProps = {
  products: Product[];
  search: string;
  setSearch: (value: string) => void;
  filters: Record<string, string>;
  setFilters: React.Dispatch<React.SetStateAction<Record<string, string>>>;
};

const filterFields = [
  "category",
  "type",
  "subtype",
  "size",
  "age",
  "gender",
  "status",
  "brand",
];

const filterLabels: Record<string, string> = {
  category: "Categoria",
  type: "Tipo",
  subtype: "Subtipo",
  size: "Tamanho",
  age: "Idade",
  gender: "Sexo",
  status: "Status",
  brand: "Marca",
};

function normalize(value?: string | number | null) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function statusLabel(value: string) {
  if (value === "disponivel") return "Disponível";
  if (value === "reservado") return "Reservado";
  if (value === "vendido") return "Vendido";
  if (value === "arquivado") return "Arquivado";
  return value;
}

function getProductValue(product: Product, field: string) {
  const value = product[field as keyof Product];

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return "";
}

export function productMatchesFilters(
  product: Product,
  search: string,
  filters: Record<string, string>,
) {
  const searchTerm = normalize(search);

  const searchableText = normalize(
    [
      product.name,
      product.brand,
      product.category,
      product.type,
      product.subtype,
      product.size,
      product.age,
      product.gender,
      product.status,
    ].join(" "),
  );

  const matchesSearch = !searchTerm || searchableText.includes(searchTerm);

  const matchesFilters = Object.entries(filters).every(([field, value]) => {
    if (!value) return true;

    return normalize(getProductValue(product, field)) === normalize(value);
  });

  return matchesSearch && matchesFilters;
}

export default function FilterBar({
  products,
  search,
  setSearch,
  filters,
  setFilters,
}: FilterBarProps) {
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const optionsByField = useMemo(() => {
    const result: Record<string, string[]> = {};

    filterFields.forEach((field) => {
      result[field] = Array.from(
        new Set(
          products
            .map((product) => getProductValue(product, field))
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b, "pt-BR"));
    });

    return result;
  }, [products]);

  const activeCount = Object.values(filters).filter(Boolean).length;

  function calculateMenuPosition(field: string) {
    const button = buttonRefs.current[field];
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const menuWidth = 240;
    const padding = 12;

    setMenuPosition({
      top: rect.bottom + 8,
      left: Math.max(
        padding,
        Math.min(rect.left, window.innerWidth - menuWidth - padding),
      ),
    });
  }

  function openMenu(field: string) {
    calculateMenuPosition(field);
    setOpenFilter((current) => (current === field ? null : field));
  }

  function updateFilter(field: string, value: string) {
    setFilters((current) => {
      const next = { ...current };

      if (!value) delete next[field];
      else next[field] = value;

      return next;
    });

    setOpenFilter(null);
  }

  function clearAll() {
    setSearch("");
    setFilters({});
    setOpenFilter(null);
  }

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      const target = event.target as HTMLElement;

      if (
        target.closest("[data-filter-button]") ||
        target.closest("[data-filter-menu]")
      ) {
        return;
      }

      setOpenFilter(null);
    }

    function reposition() {
      if (openFilter) calculateMenuPosition(openFilter);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [openFilter]);

  return (
    <section
      className="mb-4"
      style={{
        width: "100%",
        maxWidth: 1320,
        margin: "0 auto",
        background: theme.ivory2,
        borderRadius: 26,
        boxShadow: theme.shadow,
        border: `1px solid ${theme.border}`,
        padding: 16,
        position: "relative",
        zIndex: 20,
      }}
    >
      <div
        className="d-flex align-items-center gap-2 mb-3"
        style={{
          background: "#fff",
          border: `1px solid ${theme.border}`,
          borderRadius: 999,
          padding: "11px 16px",
        }}
      >
        <Search size={17} color={theme.brownSoft} />

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar produto, marca, categoria..."
          style={{
            border: 0,
            outline: 0,
            background: "transparent",
            width: "100%",
            fontSize: 14,
            color: theme.brownDark,
          }}
        />

        {(search || activeCount > 0) && (
          <button
            type="button"
            onClick={clearAll}
            style={{
              border: 0,
              background: "transparent",
              color: theme.brown,
              fontWeight: 800,
              fontSize: 13,
              whiteSpace: "nowrap",
            }}
          >
            Limpar
          </button>
        )}
      </div>

      <div
        style={{
          width: "100%",
          overflowX: "auto",
          overflowY: "hidden",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "nowrap",
            gap: 10,
            width: "max-content",
            minWidth: "100%",
            justifyContent: "center",
            alignItems: "center",
            paddingBottom: 8,
          }}
        >
          {filterFields.map((field) => {
            const options = optionsByField[field] || [];
            const selectedValue = filters[field];

            if (!options.length) return null;

            return (
              <button
                key={field}
                data-filter-button="true"
                ref={(element) => {
                  buttonRefs.current[field] = element;
                }}
                type="button"
                onClick={() => openMenu(field)}
                style={{
                  flex: "0 0 auto",
                  border: `1px solid ${
                    selectedValue ? theme.brown : theme.border
                  }`,
                  background: selectedValue ? theme.brown : "#fff",
                  color: selectedValue ? "#fff" : theme.brownDark,
                  borderRadius: 999,
                  padding: "9px 15px",
                  fontSize: 13,
                  fontWeight: 800,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  whiteSpace: "nowrap",
                  boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
                  cursor: "pointer",
                }}
              >
                {selectedValue
                  ? `${filterLabels[field]}: ${
                      field === "status"
                        ? statusLabel(selectedValue)
                        : selectedValue
                    }`
                  : filterLabels[field]}

                <ChevronDown size={15} />
              </button>
            );
          })}

          {activeCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              style={{
                flex: "0 0 auto",
                border: `1px solid ${theme.border}`,
                background: "#fff",
                color: theme.brown,
                borderRadius: 999,
                padding: "9px 15px",
                fontSize: 13,
                fontWeight: 800,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                whiteSpace: "nowrap",
                cursor: "pointer",
              }}
            >
              <X size={14} />
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {openFilter && (
        <div
          data-filter-menu="true"
          style={{
            position: "fixed",
            top: menuPosition.top,
            left: menuPosition.left,
            zIndex: 99999,
            width: 240,
            maxHeight: 280,
            overflowY: "auto",
            background: "#fff",
            borderRadius: 18,
            border: `1px solid ${theme.border}`,
            boxShadow: "0 18px 45px rgba(0,0,0,0.18)",
            padding: 8,
          }}
        >
          <button
            type="button"
            onClick={() => updateFilter(openFilter, "")}
            style={{
              width: "100%",
              border: 0,
              background: "transparent",
              textAlign: "left",
              padding: "10px 11px",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 800,
              color: theme.brownSoft,
              cursor: "pointer",
            }}
          >
            Todos
          </button>

          {(optionsByField[openFilter] || []).map((option) => {
            const active = filters[openFilter] === option;

            return (
              <button
                type="button"
                key={option}
                onClick={() => updateFilter(openFilter, option)}
                style={{
                  width: "100%",
                  border: 0,
                  background: active ? theme.ivory : "transparent",
                  textAlign: "left",
                  padding: "10px 11px",
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: active ? 900 : 600,
                  color: theme.brownDark,
                  cursor: "pointer",
                }}
              >
                {openFilter === "status" ? statusLabel(option) : option}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}