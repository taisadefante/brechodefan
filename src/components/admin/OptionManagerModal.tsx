"use client";

import { useEffect, useState } from "react";
import { addOption, deleteOption, editOption, getOptionDocs } from "@/lib/firestore";
import { OptionType } from "@/types";
import { theme } from "@/lib/theme";

export default function OptionManagerModal({
  type,
  title,
  onClose,
  onChange
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: theme.ivory2, borderRadius: 28, padding: 24, maxWidth: 520, width: "100%" }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="fw-bold m-0">{title}</h4>
          <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>Fechar</button>
        </div>

        <div className="input-group mb-3">
          <input className="form-control" placeholder="Nome da opção" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn" style={{ background: theme.brown, color: "#fff" }} onClick={save}>
            {editing ? "Salvar" : "Adicionar"}
          </button>
        </div>

        {items.map((item) => (
          <div key={item.id} className="d-flex justify-content-between border-bottom py-2">
            <span>{item.name}</span>
            <div>
              <button className="btn btn-sm btn-outline-primary me-2" onClick={() => { setEditing(item.id); setName(item.name); }}>Editar</button>
              <button className="btn btn-sm btn-outline-danger" onClick={() => remove(item.id)}>Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
