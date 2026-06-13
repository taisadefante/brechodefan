"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Plus } from "lucide-react";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

import { getOptionDocs, getOptions, saveProduct } from "@/lib/firestore";
import { storage } from "@/lib/firebase";
import { OptionDoc, OptionType, Product, ShippingProfile } from "@/types";
import { theme } from "@/lib/theme";
import OptionManagerModal, { ExtendedOptionType } from "./OptionManagerModal";

type ProductForm = Omit<Product, "id"> & {
  shippingProfile?: ShippingProfile | "";
  type?: string;
  subtype?: string;
};

const CROP_PREVIEW_SIZE = 520;
const OUTPUT_SIZE = 1200;

const shippingProfiles: Record<
  ShippingProfile,
  {
    label: string;
    weight: number;
    height: number;
    width: number;
    length: number;
  }
> = {
  leve: {
    label: "Leve - body, blusa, short, saia",
    weight: 0.15,
    height: 4,
    width: 10,
    length: 15,
  },
  medio: {
    label: "Médio - vestido, calça, conjunto, macacão",
    weight: 0.3,
    height: 4,
    width: 10,
    length: 15,
  },
  kit: {
    label: "Kit / lote / casaco",
    weight: 0.6,
    height: 4,
    width: 10,
    length: 15,
  },
};

const emptyForm: ProductForm = {
  name: "",
  description: "",
  price: 0,
  category: "",
  type: "",
  subtype: "",
  size: "",
  age: "",
  color: "",
  gender: "",
  brand: "",
  condition: "",
  measurements: "",
  stock: 1,
  shippingProfile: "",
  weight: 0.15,
  height: 4,
  width: 10,
  length: 15,
  images: [],
  status: "disponivel",
  reservedUntil: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  soldAt: null,
};

const optionFields: {
  key: keyof ProductForm;
  label: string;
  type: ExtendedOptionType;
}[] = [
  { key: "category", label: "Categoria", type: "categorias" },
  { key: "type", label: "Tipo", type: "tipos" },
  { key: "subtype", label: "Subtipo", type: "subtipos" },
  { key: "size", label: "Tamanho", type: "tamanhos" },
  { key: "age", label: "Idade", type: "idades" },
  { key: "color", label: "Cor", type: "cores" },
  { key: "gender", label: "Sexo", type: "sexos" },
  { key: "brand", label: "Marca", type: "marcas" },
  { key: "condition", label: "Estado da peça", type: "condicoes" },
];

function uniqueNames(names: string[]) {
  const map = new Map<string, string>();

  names.forEach((name) => {
    const cleanName = String(name || "").trim();

    const key = cleanName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    if (cleanName && !map.has(key)) {
      map.set(key, cleanName);
    }
  });

  return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
}

function createInitialCrop(): Crop {
  return {
    unit: "%",
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  };
}

export default function ProductModal({
  product,
  onClose,
  onSaved,
}: {
  product?: Product | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const currentProduct = product || null;

  const [form, setForm] = useState<ProductForm>(
    currentProduct
      ? {
          ...emptyForm,
          ...currentProduct,
          type: currentProduct.type || "",
          subtype: currentProduct.subtype || "",
          shippingProfile: currentProduct.shippingProfile || "",
          weight: Number(currentProduct.weight || 0.15),
          height: Number(currentProduct.height || 4),
          width: Number(currentProduct.width || 10),
          length: Number(currentProduct.length || 15),
          images: currentProduct.images || [],
          updatedAt: Date.now(),
        }
      : emptyForm,
  );

  const [options, setOptions] = useState<Record<string, string[]>>({
    categorias: [],
    tamanhos: [],
    idades: [],
    cores: [],
    sexos: [],
    condicoes: [],
    marcas: [],
  });

  const [typeDocs, setTypeDocs] = useState<OptionDoc[]>([]);
  const [subtypeDocs, setSubtypeDocs] = useState<OptionDoc[]>([]);

  const [manager, setManager] = useState<{
    type: ExtendedOptionType;
    title: string;
  } | null>(null);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cropSrc, setCropSrc] = useState("");

  const [crop, setCrop] = useState<Crop>(createInitialCrop());
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const availableTypes = useMemo(() => {
    if (!form.category) return [];

    return uniqueNames(
      typeDocs
        .filter((item) => item.parentCategory === form.category)
        .map((item) => item.name),
    );
  }, [typeDocs, form.category]);

  const availableSubtypes = useMemo(() => {
    if (!form.type) return [];

    return uniqueNames(
      subtypeDocs
        .filter((item) => item.parentType === form.type)
        .map((item) => item.name),
    );
  }, [subtypeDocs, form.type]);

  async function loadOptions() {
    const loaded: Record<string, string[]> = {};

    for (const field of optionFields) {
      if (field.type !== "tipos" && field.type !== "subtipos") {
        loaded[field.type] = await getOptions(field.type as OptionType);
      }
    }

    const [loadedTypes, loadedSubtypes] = await Promise.all([
      getOptionDocs("tipos"),
      getOptionDocs("subtipos"),
    ]);

    setOptions(loaded);
    setTypeDocs(loadedTypes);
    setSubtypeDocs(loadedSubtypes);
  }

  useEffect(() => {
    loadOptions();
  }, []);

  function onCropImageSelected(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      setCropSrc(String(reader.result || ""));
      setCrop(createInitialCrop());
      setCompletedCrop(null);
    };

    reader.readAsDataURL(file);

    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  async function uploadBase64Image(base64: string) {
    const response = await fetch(base64);
    const blob = await response.blob();

    const fileRef = ref(
      storage,
      `products/${Date.now()}-${Math.random().toString(36).slice(2)}.png`,
    );

    await uploadBytes(fileRef, blob);
    return getDownloadURL(fileRef);
  }

  async function saveCroppedImage() {
    if (!imageRef.current) return null;

    setUploading(true);

    try {
      const image = imageRef.current;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) return null;

      const cropToUse =
        completedCrop?.width && completedCrop?.height
          ? completedCrop
          : {
              x: 0,
              y: 0,
              width: image.width,
              height: image.height,
            };

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      const sourceX = cropToUse.x * scaleX;
      const sourceY = cropToUse.y * scaleY;
      const sourceWidth = cropToUse.width * scaleX;
      const sourceHeight = cropToUse.height * scaleY;

      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;

      ctx.fillStyle = "#f3eadf";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const fitRatio = Math.min(
        canvas.width / sourceWidth,
        canvas.height / sourceHeight,
      );

      const drawWidth = sourceWidth * fitRatio;
      const drawHeight = sourceHeight * fitRatio;
      const drawX = (canvas.width - drawWidth) / 2;
      const drawY = (canvas.height - drawHeight) / 2;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        drawX,
        drawY,
        drawWidth,
        drawHeight,
      );

      const base64 = canvas.toDataURL("image/png");
      const uploadedUrl = await uploadBase64Image(base64);

      setForm((prev) => ({
        ...prev,
        images: [...prev.images, uploadedUrl],
      }));

      setCropSrc("");
      setCompletedCrop(null);
      setCrop(createInitialCrop());

      return uploadedUrl;
    } finally {
      setUploading(false);
    }
  }

  function handleShippingProfile(value: string) {
    if (!value) {
      setForm({
        ...form,
        shippingProfile: "",
        weight: 0.15,
        height: 4,
        width: 10,
        length: 15,
      });

      return;
    }

    const key = value as ShippingProfile;
    const profile = shippingProfiles[key];

    setForm({
      ...form,
      shippingProfile: key,
      weight: profile.weight,
      height: profile.height,
      width: profile.width,
      length: profile.length,
    });
  }

  function getSelectOptions(fieldType: ExtendedOptionType) {
    if (fieldType === "tipos") return availableTypes;
    if (fieldType === "subtipos") return availableSubtypes;

    return options[fieldType] || [];
  }

  function getPlaceholder(fieldType: ExtendedOptionType) {
    if (fieldType === "tipos" && !form.category) {
      return "Selecione a categoria primeiro";
    }

    if (fieldType === "subtipos" && !form.type) {
      return "Selecione o tipo primeiro";
    }

    return "Selecione";
  }

  function selectIsDisabled(fieldType: ExtendedOptionType) {
    if (fieldType === "tipos") return !form.category;
    if (fieldType === "subtipos") return !form.type;

    return false;
  }

  function handleOptionChange(key: keyof ProductForm, value: string) {
    if (key === "category") {
      setForm({ ...form, category: value, type: "", subtype: "" });
      return;
    }

    if (key === "type") {
      setForm({ ...form, type: value, subtype: "" });
      return;
    }

    setForm({ ...form, [key]: value });
  }

  function openManager(field: {
    key: keyof ProductForm;
    label: string;
    type: ExtendedOptionType;
  }) {
    if (field.type === "tipos" && !form.category) {
      alert("Selecione uma categoria antes de cadastrar o tipo.");
      return;
    }

    if (field.type === "subtipos" && !form.type) {
      alert("Selecione um tipo antes de cadastrar subtipo.");
      return;
    }

    setManager({ type: field.type, title: field.label });
  }

  async function save() {
    if (!form.name.trim()) {
      alert("Informe o nome do produto.");
      return;
    }

    if (!Number(form.price || 0)) {
      alert("Informe o preço do produto.");
      return;
    }

    if (!form.category) {
      alert("Selecione a categoria.");
      return;
    }

    if (!form.type) {
      alert("Selecione o tipo do produto.");
      return;
    }

    if (!form.shippingProfile) {
      alert("Selecione o perfil de frete.");
      return;
    }

    setSaving(true);

    try {
      let finalImages = [...form.images];

      if (cropSrc) {
        const uploadedUrl = await saveCroppedImage();

        if (uploadedUrl) {
          finalImages = [...finalImages, uploadedUrl];
        }
      }

      await saveProduct(
        {
          ...form,
          images: finalImages,
          price: Number(form.price || 0),
          stock: Number(form.stock || 1),
          weight: Number(form.weight || 0.15),
          height: Number(form.height || 4),
          width: Number(form.width || 10),
          length: Number(form.length || 15),
          shippingProfile: form.shippingProfile || "",
          createdAt: form.createdAt || Date.now(),
          updatedAt: Date.now(),
        },
        currentProduct?.id,
      );

      onSaved();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      alert("Erro ao salvar produto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        zIndex: 998,
        overflowY: "auto",
        padding: 16,
      }}
    >
      <div className="container my-4">
        <div
          style={{
            background: theme.ivory2,
            borderRadius: 30,
            padding: 24,
          }}
        >
          <div className="d-flex justify-content-between align-items-center mb-4 gap-3">
            <div>
              <h3 className="fw-bold mb-1">
                {currentProduct ? "Editar produto" : "Cadastrar produto"}
              </h3>

              <p className="mb-0" style={{ color: theme.brownSoft }}>
                Cadastre categoria, tipo, subtipo e informações completas da peça.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onClose}
              disabled={uploading || saving}
              style={{ borderRadius: 999 }}
            >
              Fechar
            </button>
          </div>

          <div className="row g-3">
            <div className="col-md-8">
              <label className="form-label">Nome</label>

              <input
                className="form-control"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Preço</label>

              <input
                className="form-control"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) =>
                  setForm({ ...form, price: Number(e.target.value) })
                }
              />
            </div>

            <div className="col-12">
              <label className="form-label">Descrição</label>

              <textarea
                className="form-control"
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>

            {optionFields.map((field) => {
              const selectOptions = getSelectOptions(field.type);

              return (
                <div className="col-md-4" key={String(field.key)}>
                  <label className="form-label">{field.label}</label>

                  <div className="input-group">
                    <select
                      className="form-select"
                      value={String(form[field.key] || "")}
                      disabled={selectIsDisabled(field.type)}
                      onChange={(e) =>
                        handleOptionChange(field.key, e.target.value)
                      }
                    >
                      <option value="">{getPlaceholder(field.type)}</option>

                      {selectOptions.map((op, index) => (
                        <option key={`${field.type}-${op}-${index}`} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      title={`Cadastrar ${field.label}`}
                      aria-label={`Cadastrar ${field.label}`}
                      onClick={() => openManager(field)}
                      style={{
                        width: 44,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="col-md-4">
              <label className="form-label">Perfil de frete</label>

              <select
                className="form-select"
                value={form.shippingProfile || ""}
                onChange={(e) => handleShippingProfile(e.target.value)}
              >
                <option value="">Selecione</option>

                {Object.entries(shippingProfiles).map(([key, profile]) => (
                  <option key={key} value={key}>
                    {profile.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label">Estoque</label>

              <input
                className="form-control"
                type="number"
                min={1}
                value={form.stock}
                onChange={(e) =>
                  setForm({ ...form, stock: Number(e.target.value) })
                }
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Status</label>

              <select
                className="form-select"
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as Product["status"],
                  })
                }
              >
                <option value="disponivel">Disponível</option>
                <option value="reservado">Reservado</option>
                <option value="vendido">Vendido</option>
                <option value="arquivado">Arquivado</option>
              </select>
            </div>

            <div className="col-12">
              <label className="form-label">Medidas da peça</label>

              <input
                className="form-control"
                placeholder="Ex: comprimento, largura, busto, cintura..."
                value={form.measurements || ""}
                onChange={(e) =>
                  setForm({ ...form, measurements: e.target.value })
                }
              />
            </div>

            <div className="col-12">
              <label className="form-label">Imagens</label>

              <div className="d-flex gap-2 flex-wrap mb-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => onCropImageSelected(e.target.files)}
                />

                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  onChange={(e) => onCropImageSelected(e.target.files)}
                />

                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || saving}
                  style={{ borderRadius: 999 }}
                >
                  Anexar imagem
                </button>

                <button
                  type="button"
                  className="btn btn-outline-secondary d-flex align-items-center justify-content-center"
                  title="Tirar foto"
                  aria-label="Tirar foto"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={uploading || saving}
                  style={{
                    width: 44,
                    height: 38,
                    borderRadius: 10,
                  }}
                >
                  <Camera size={20} />
                </button>

                {uploading && <span>Enviando...</span>}
              </div>

              <div className="d-flex flex-wrap gap-2">
                {form.images.map((img, index) => (
                  <div key={`${img}-${index}`} style={{ position: "relative" }}>
                    <img
                      src={img}
                      alt=""
                      style={{
                        width: 110,
                        height: 110,
                        objectFit: "contain",
                        background: "#f3eadf",
                        borderRadius: 16,
                        border: `1px solid ${theme.border}`,
                      }}
                    />

                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      title="Remover imagem"
                      aria-label="Remover imagem"
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        padding: 0,
                      }}
                      disabled={uploading || saving}
                      onClick={() =>
                        setForm({
                          ...form,
                          images: form.images.filter((_, i) => i !== index),
                        })
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {cropSrc && (
                <div
                  className="mt-4 p-3"
                  style={{ background: "#fff", borderRadius: 18 }}
                >
                  <p className="fw-bold mb-1">Editar nova imagem</p>

                  <small style={{ color: theme.brownSoft }}>
                    Arraste as bordas para cortar livremente. Pode selecionar a
                    imagem toda ou apenas a parte desejada. Depois ela será
                    encaixada no card sem cortar.
                  </small>

                  <div
                    className="mt-3"
                    style={{
                      width: CROP_PREVIEW_SIZE,
                      maxWidth: "100%",
                      background: "#f3eadf",
                      borderRadius: 18,
                      overflow: "hidden",
                      border: `1px solid ${theme.border}`,
                    }}
                  >
                    <ReactCrop
                      crop={crop}
                      onChange={(_, percentCrop) => setCrop(percentCrop)}
                      onComplete={(pixelCrop) => setCompletedCrop(pixelCrop)}
                      keepSelection
                    >
                      <img
                        ref={imageRef}
                        src={cropSrc}
                        alt="Cortar"
                        onLoad={() => {
                          setCrop(createInitialCrop());
                        }}
                        style={{
                          width: "100%",
                          height: "auto",
                          display: "block",
                        }}
                      />
                    </ReactCrop>
                  </div>

                  <div className="d-flex flex-wrap gap-2 mt-3">
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={uploading || saving}
                      onClick={saveCroppedImage}
                      style={{
                        background: theme.brown,
                        color: "#fff",
                        borderRadius: 999,
                      }}
                    >
                      {uploading ? "Salvando imagem..." : "Salvar imagem"}
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      disabled={uploading || saving}
                      onClick={() => {
                        setCropSrc("");
                        setCompletedCrop(null);
                        setCrop(createInitialCrop());
                      }}
                      style={{ borderRadius: 999 }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            className="btn btn-lg mt-4"
            disabled={uploading || saving}
            onClick={save}
            style={{
              background: theme.brown,
              color: "#fff",
              borderRadius: 999,
            }}
          >
            {saving || uploading ? "Salvando..." : "Salvar produto"}
          </button>
        </div>
      </div>

      {manager && (
        <OptionManagerModal
          type={manager.type}
          title={manager.title}
          parentCategory={
            manager.type === "tipos" || manager.type === "subtipos"
              ? form.category || ""
              : ""
          }
          parentType={manager.type === "subtipos" ? form.type || "" : ""}
          onClose={() => setManager(null)}
          onChange={loadOptions}
        />
      )}
    </div>
  );
}