"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";

import {
  addOption,
  deleteOption,
  editOption,
  getOptionDocs,
  getOptions,
} from "@/lib/firestore";

import { OptionDoc, OptionType } from "@/types";
import { theme } from "@/lib/theme";

export type ExtendedOptionType = OptionType;

export default function OptionManagerModal({
  type,
  title,
  parentCategory,
  parentType,
  onClose,
  onChange,
}: {
  type: ExtendedOptionType;
  title: string;
  parentCategory?: string;
  parentType?: string;
  onClose: () => void;
  onChange: () => void;
}) {
  const [items, setItems] = useState<OptionDoc[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [selectedParentCategory, setSelectedParentCategory] = useState(
    parentCategory || "",
  );
  const [selectedParentType, setSelectedParentType] = useState(parentType || "");
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isType = type === "tipos";
  const isSubtype = type === "subtipos";

  const helpText = useMemo(() => {
    if (isType) return "O tipo fica vinculado à categoria selecionada.";
    if (isSubtype) return "O subtipo fica vinculado ao tipo selecionado.";
    return "Cadastre, edite ou exclua opções usadas no produto.";
  }, [isType, isSubtype]);

  async function load() {
    const [docs, loadedCategories] = await Promise.all([
      getOptionDocs(type),
      isType || isSubtype ? getOptions("categorias") : Promise.resolve([]),
    ]);

    setItems(docs);
    setCategories(loadedCategories);

    const categoryToUse =
      parentCategory || selectedParentCategory || loadedCategories[0] || "";

    if ((isType || isSubtype) && !selectedParentCategory && categoryToUse) {
      setSelectedParentCategory(categoryToUse);
    }

    if (isSubtype) {
      const loadedTypes = categoryToUse
        ? await getOptions("tipos", categoryToUse)
        : await getOptions("tipos");

      setTypes(loadedTypes);

      const typeToUse = parentType || selectedParentType || loadedTypes[0] || "";

      if (!selectedParentType && typeToUse) {
        setSelectedParentType(typeToUse);
      }
    }
  }

  useEffect(() => {
    load();
  }, [type]);

  useEffect(() => {
    setSelectedParentCategory(parentCategory || "");
  }, [parentCategory]);

  useEffect(() => {
    setSelectedParentType(parentType || "");
  }, [parentType]);

  useEffect(() => {
    async function reloadTypesByCategory() {
      if (!isSubtype) return;

      const loadedTypes = selectedParentCategory
        ? await getOptions("tipos", selectedParentCategory)
        : await getOptions("tipos");

      setTypes(loadedTypes);

      if (!parentType && !loadedTypes.includes(selectedParentType)) {
        setSelectedParentType(loadedTypes[0] || "");
      }
    }

    reloadTypesByCategory();
  }, [isSubtype, selectedParentCategory, parentType, selectedParentType]);

  async function save() {
    if (!name.trim()) {
      alert("Informe o nome da opção.");
      return;
    }

    if (isType && !selectedParentCategory) {
      alert("Selecione a categoria para vincular o tipo.");
      return;
    }

    if (isSubtype && !selectedParentType) {
      alert("Selecione o tipo para vincular o subtipo.");
      return;
    }

    setSaving(true);

    try {
      const parentValue = isType
        ? selectedParentCategory
        : isSubtype
          ? selectedParentType
          : "";

      if (editing) {
        await editOption(type, editing, name.trim(), parentValue);
      } else {
        await addOption(type, name.trim(), parentValue);
      }

      setName("");
      setEditing(null);

      await load();
      onChange();
    } catch (error) {
      console.error("Erro ao salvar opção:", error);
      alert(error instanceof Error ? error.message : "Erro ao salvar opção.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta opção?")) return;

    try {
      await deleteOption(type, id);
      await load();
      onChange();
    } catch (error) {
      console.error("Erro ao excluir opção:", error);
      alert("Erro ao excluir opção.");
    }
  }

  const visibleItems = useMemo(() => {
    if (isType && selectedParentCategory) {
      return items.filter(
        (item) => item.parentCategory === selectedParentCategory,
      );
    }

    if (isSubtype && selectedParentType) {
      return items.filter((item) => item.parentType === selectedParentType);
    }

    return items;
  }, [items, isType, isSubtype, selectedParentCategory, selectedParentType]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: theme.ivory2,
          borderRadius: 28,
          padding: 24,
          maxWidth: 620,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: theme.shadow,
          border: `1px solid ${theme.border}`,
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h4 className="fw-bold m-0">{title}</h4>
            <small style={{ color: theme.brownSoft }}>{helpText}</small>
          </div>

          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={onClose}
            title="Fechar"
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {isType && (
          <div className="mb-3">
            <label className="form-label">Categoria vinculada</label>

            <select
              className="form-select"
              value={selectedParentCategory}
              onChange={(e) => {
                setSelectedParentCategory(e.target.value);
                setEditing(null);
                setName("");
              }}
              disabled={Boolean(parentCategory)}
            >
              <option value="">Selecione a categoria</option>

              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        )}

        {isSubtype && (
          <>
            <div className="mb-3">
              <label className="form-label">Categoria do tipo</label>

              <select
                className="form-select"
                value={selectedParentCategory}
                onChange={(e) => {
                  setSelectedParentCategory(e.target.value);
                  setSelectedParentType("");
                  setEditing(null);
                  setName("");
                }}
                disabled={Boolean(parentCategory)}
              >
                <option value="">Selecione a categoria</option>

                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">Tipo vinculado</label>

              <select
                className="form-select"
                value={selectedParentType}
                onChange={(e) => {
                  setSelectedParentType(e.target.value);
                  setEditing(null);
                  setName("");
                }}
                disabled={Boolean(parentType)}
              >
                <option value="">Selecione o tipo</option>

                {types.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <div className="input-group mb-3">
          <input
            className="form-control"
            placeholder={
              isType
                ? "Nome do tipo"
                : isSubtype
                  ? "Nome do subtipo"
                  : "Nome da opção"
            }
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
            }}
          />

          <button
            type="button"
            onClick={save}
            disabled={saving}
            title={editing ? "Salvar" : "Adicionar"}
            style={{
              background: theme.brown,
              color: "#fff",
              border: "none",
              width: 54,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Plus size={18} />
          </button>
        </div>

        {visibleItems.map((item) => (
          <div
            key={item.id}
            className="d-flex justify-content-between align-items-center border-bottom py-2 gap-3"
          >
            <div>
              <strong>{item.name}</strong>

              {isType && item.parentCategory && (
                <div style={{ fontSize: 12, color: theme.brownSoft }}>
                  Categoria: {item.parentCategory}
                </div>
              )}

              {isSubtype && item.parentType && (
                <div style={{ fontSize: 12, color: theme.brownSoft }}>
                  Tipo: {item.parentType}
                </div>
              )}
            </div>

            <div className="d-flex gap-2">
              <button
                type="button"
                title="Editar"
                className="btn btn-outline-primary"
                onClick={() => {
                  setEditing(item.id);
                  setName(item.name);

                  if (isType) {
                    setSelectedParentCategory(
                      item.parentCategory || parentCategory || "",
                    );
                  }

                  if (isSubtype) {
                    setSelectedParentType(item.parentType || parentType || "");
                  }
                }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Pencil size={16} />
              </button>

              <button
                type="button"
                title="Excluir"
                className="btn btn-outline-danger"
                onClick={() => remove(item.id)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}

        {!visibleItems.length && (
          <div
            className="p-3 text-center"
            style={{
              background: "#fff",
              borderRadius: 18,
              color: theme.brownSoft,
            }}
          >
            Nenhuma opção cadastrada ainda.
          </div>
        )}
      </div>
    </div>
  );
}
