"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

import {
  addOption,
  deleteOption,
  editOption,
  getOptionDocs,
} from "@/lib/firestore";

import { OptionType } from "@/types";
import { theme } from "@/lib/theme";

export default function OptionManagerModal({
  type,
  title,
  onClose,
  onChange,
}: {
  type: OptionType;
  title: string;
  onClose: () => void;
  onChange: () => void;
}) {
  const [items, setItems] = useState<{ id: string; name: string }[]>([]);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  async function load() {
    setItems(await getOptionDocs(type));
  }

  useEffect(() => {
    load();
  }, [type]);

  async function save() {
    if (!name.trim()) return;

    if (editing) {
      await editOption(type, editing, name.trim());
    } else {
      await addOption(type, name.trim());
    }

    setName("");
    setEditing(null);

    await load();
    onChange();
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta opção?")) return;

    await deleteOption(type, id);

    await load();
    onChange();
  }

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
          maxWidth: 520,
          width: "100%",
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="fw-bold m-0">{title}</h4>

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

        <div className="input-group mb-3">
          <input
            className="form-control"
            placeholder="Nome da opção"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <button
            type="button"
            onClick={save}
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

        {items.map((item) => (
          <div
            key={item.id}
            className="d-flex justify-content-between align-items-center border-bottom py-2"
          >
            <span>{item.name}</span>

            <div className="d-flex gap-2">
              <button
                type="button"
                title="Editar"
                className="btn btn-outline-primary"
                onClick={() => {
                  setEditing(item.id);
                  setName(item.name);
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
      </div>
    </div>
  );
}