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

type NumberOrEmpty = number | "";

type ProductForm = Omit<
  Product,
  "id" | "price" | "stock" | "weight" | "height" | "width" | "length"
> & {
  price: NumberOrEmpty;
  stock: NumberOrEmpty;
  weight: NumberOrEmpty;
  height: NumberOrEmpty;
  width: NumberOrEmpty;
  length: NumberOrEmpty;
  shippingProfile?: ShippingProfile | "";
  type?: string;
  subtype?: string;
  costPrice?: NumberOrEmpty;
  desiredMargin?: NumberOrEmpty;
};

const CROP_PREVIEW_SIZE = 520;
const OUTPUT_SIZE = 1200;

const DEFAULT_BRAND = "Sem Marca";
const DEFAULT_CONDITION = "Semi novo";
const DEFAULT_SHIPPING_PROFILE: ShippingProfile = "leve";

const shippingProfiles: Record<
  ShippingProfile,
  { label: string; weight: number; height: number; width: number; length: number }
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
  price: "",
  costPrice: "",
  desiredMargin: "",
  category: "",
  type: "",
  subtype: "",
  size: "",
  age: "",
  color: "",
  gender: "",
  brand: DEFAULT_BRAND,
  condition: DEFAULT_CONDITION,
  measurements: "",
  stock: "",
  shippingProfile: DEFAULT_SHIPPING_PROFILE,
  weight: shippingProfiles.leve.weight,
  height: shippingProfiles.leve.height,
  width: shippingProfiles.leve.width,
  length: shippingProfiles.leve.length,
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
  { key: "size", label: "Tamanho / Idade", type: "tamanhos" },
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

    if (cleanName && !map.has(key)) map.set(key, cleanName);
  });

  return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
}

function ensureOption(options: string[], value: string) {
  const cleanValue = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  const exists = options.some(
    (item) =>
      item
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim() === cleanValue,
  );

  return exists ? options : [value, ...options];
}

function createInitialCrop(): Crop {
  return {
    unit: "%",
    x: 8,
    y: 8,
    width: 84,
    height: 84,
  };
}

function createFullImagePixelCrop(image: HTMLImageElement): PixelCrop {
  return {
    unit: "px",
    x: 0,
    y: 0,
    width: image.width,
    height: image.height,
  };
}

function toNumber(value: NumberOrEmpty | undefined) {
  return Number(value || 0);
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${value.toFixed(2).replace(".", ",")}%`;
}

function formatCurrencyPreview(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function calculateMargin(costPrice: number, salePrice: number) {
  if (!salePrice || salePrice <= 0) return 0;
  return ((salePrice - costPrice) / salePrice) * 100;
}

function calculateSalePriceByMargin(costPrice: number, margin: number) {
  if (!costPrice || costPrice <= 0) return 0;
  if (!margin || margin <= 0) return costPrice;
  if (margin >= 100) return costPrice;
  return costPrice / (1 - margin / 100);
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
          age: "",
          price: Number(currentProduct.price || 0),
          costPrice: Number(currentProduct.costPrice || 0),
          desiredMargin: Number(currentProduct.desiredMargin || 0),
          shippingProfile:
            currentProduct.shippingProfile || DEFAULT_SHIPPING_PROFILE,
          brand: currentProduct.brand || DEFAULT_BRAND,
          condition: currentProduct.condition || DEFAULT_CONDITION,
          weight: Number(currentProduct.weight || shippingProfiles.leve.weight),
          height: Number(currentProduct.height || shippingProfiles.leve.height),
          width: Number(currentProduct.width || shippingProfiles.leve.width),
          length: Number(currentProduct.length || shippingProfiles.leve.length),
          images: currentProduct.images || [],
          updatedAt: Date.now(),
        }
      : {
          ...emptyForm,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
  );

  const [options, setOptions] = useState<Record<string, string[]>>({
    categorias: [],
    cores: [],
    sexos: [],
    condicoes: [DEFAULT_CONDITION],
    marcas: [DEFAULT_BRAND],
  });

  const [typeDocs, setTypeDocs] = useState<OptionDoc[]>([]);
  const [subtypeDocs, setSubtypeDocs] = useState<OptionDoc[]>([]);
  const [sizeDocs, setSizeDocs] = useState<OptionDoc[]>([]);

  const [manager, setManager] = useState<{
    type: ExtendedOptionType;
    title: string;
  } | null>(null);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [cropSrc, setCropSrc] = useState("");
  const [crop, setCrop] = useState<Crop>(createInitialCrop());
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const costPrice = toNumber(form.costPrice);
  const salePrice = toNumber(form.price);
  const grossProfit = salePrice - costPrice;
  const currentMargin = calculateMargin(costPrice, salePrice);

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

  const availableSizes = useMemo(() => {
    if (!form.category) return [];

    return uniqueNames(
      sizeDocs
        .filter((item) => item.parentCategory === form.category)
        .map((item) => item.name),
    );
  }, [sizeDocs, form.category]);

  async function loadOptions() {
    const loaded: Record<string, string[]> = {};

    const optionTypes: OptionType[] = [
      "categorias",
      "cores",
      "sexos",
      "condicoes",
      "marcas",
    ];

    for (const optionType of optionTypes) {
      loaded[optionType] = await getOptions(optionType);
    }

    loaded.marcas = ensureOption(loaded.marcas || [], DEFAULT_BRAND);
    loaded.condicoes = ensureOption(loaded.condicoes || [], DEFAULT_CONDITION);

    const [loadedTypes, loadedSubtypes, loadedSizes] = await Promise.all([
      getOptionDocs("tipos"),
      getOptionDocs("subtipos"),
      getOptionDocs("tamanhos"),
    ]);

    setOptions(loaded);
    setTypeDocs(loadedTypes);
    setSubtypeDocs(loadedSubtypes);
    setSizeDocs(loadedSizes);
  }

  useEffect(() => {
    loadOptions();
  }, []);

  function handleCostChange(value: NumberOrEmpty) {
    if (value === "") {
      setForm((prev) => ({
        ...prev,
        costPrice: "",
        price: "",
        desiredMargin: "",
      }));
      return;
    }

    const cleanCost = Number(value || 0);

    setForm((prev) => {
      const margin = Number(prev.desiredMargin || 0);

      if (margin > 0 && margin < 100) {
        return {
          ...prev,
          costPrice: cleanCost,
          price: Number(calculateSalePriceByMargin(cleanCost, margin).toFixed(2)),
        };
      }

      return {
        ...prev,
        costPrice: cleanCost,
      };
    });
  }

  function handleSalePriceChange(value: NumberOrEmpty) {
    if (value === "") {
      setForm({
        ...form,
        price: "",
        desiredMargin: "",
      });
      return;
    }

    const cleanPrice = Number(value || 0);
    const margin = calculateMargin(Number(form.costPrice || 0), cleanPrice);

    setForm({
      ...form,
      price: cleanPrice,
      desiredMargin: Number(margin.toFixed(2)),
    });
  }

  function handleDesiredMarginChange(value: NumberOrEmpty) {
    if (value === "") {
      setForm({
        ...form,
        desiredMargin: "",
      });
      return;
    }

    const cleanMargin = Number(value || 0);
    const newSalePrice = calculateSalePriceByMargin(
      Number(form.costPrice || 0),
      cleanMargin,
    );

    setForm({
      ...form,
      desiredMargin: cleanMargin,
      price: Number(newSalePrice.toFixed(2)),
    });
  }

  function onCropImageSelected(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Selecione apenas arquivos de imagem.");
      return;
    }

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

  function handleDropImage(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();

    setIsDraggingImage(false);

    if (uploading || saving) return;

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/"),
    );

    if (imageFiles.length === 0) {
      alert("Arraste apenas imagens.");
      return;
    }

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(imageFiles[0]);

    onCropImageSelected(dataTransfer.files);
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
          : createFullImagePixelCrop(image);

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
    const key = (value || DEFAULT_SHIPPING_PROFILE) as ShippingProfile;
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
    if (fieldType === "tamanhos") return availableSizes;

    return options[fieldType] || [];
  }

  function getPlaceholder(fieldType: ExtendedOptionType) {
    if (fieldType === "tipos" && !form.category) {
      return "Selecione a categoria primeiro";
    }

    if (fieldType === "subtipos" && !form.type) {
      return "Selecione o tipo primeiro";
    }

    if (fieldType === "tamanhos" && !form.category) {
      return "Selecione a categoria primeiro";
    }

    return "Selecione";
  }

  function selectIsDisabled(fieldType: ExtendedOptionType) {
    if (fieldType === "tipos") return !form.category;
    if (fieldType === "subtipos") return !form.type;
    if (fieldType === "tamanhos") return !form.category;

    return false;
  }

  function handleOptionChange(key: keyof ProductForm, value: string) {
    if (key === "category") {
      setForm({ ...form, category: value, type: "", subtype: "", size: "" });
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

    if (field.type === "tamanhos" && !form.category) {
      alert("Selecione uma categoria antes de cadastrar o tamanho / idade.");
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
      alert("Informe o valor de venda do produto.");
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
          age: "",
          images: finalImages,
          price: Number(form.price || 0),
          costPrice: Number(form.costPrice || 0),
          desiredMargin: Number(form.desiredMargin || 0),
          stock: Number(form.stock || 1),
          brand: form.brand || DEFAULT_BRAND,
          condition: form.condition || DEFAULT_CONDITION,
          weight: Number(form.weight || shippingProfiles.leve.weight),
          height: Number(form.height || shippingProfiles.leve.height),
          width: Number(form.width || shippingProfiles.leve.width),
          length: Number(form.length || shippingProfiles.leve.length),
          shippingProfile: form.shippingProfile || DEFAULT_SHIPPING_PROFILE,
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

  function renderSelectField(field: {
    key: keyof ProductForm;
    label: string;
    type: ExtendedOptionType;
  }) {
    const selectOptions = getSelectOptions(field.type);

    return (
      <div className="col-md-4" key={String(field.key)}>
        <label className="form-label">{field.label}</label>

        <div className="input-group">
          <select
            className="form-select"
            value={String(form[field.key] || "")}
            disabled={selectIsDisabled(field.type)}
            onChange={(e) => handleOptionChange(field.key, e.target.value)}
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
      <style jsx global>{`
        .mobile-crop-wrapper .ReactCrop {
          max-width: 100%;
          touch-action: none;
        }

        .mobile-crop-wrapper .ReactCrop__crop-selection {
          touch-action: none;
          border: 2px solid #ffffff;
          box-shadow:
            0 0 0 9999em rgba(0, 0, 0, 0.35),
            0 0 0 1px rgba(0, 0, 0, 0.25);
        }

        .mobile-crop-wrapper .ReactCrop__drag-handle {
          width: 18px;
          height: 18px;
          background: #ffffff;
          border: 2px solid #5c4033;
          border-radius: 50%;
          opacity: 1;
        }

        .mobile-crop-wrapper .ReactCrop__drag-handle::after {
          display: none;
        }

        @media (max-width: 768px) {
          .product-modal-card {
            padding: 16px !important;
            border-radius: 22px !important;
          }

          .mobile-crop-wrapper .ReactCrop__drag-handle {
            width: 26px;
            height: 26px;
          }

          .mobile-crop-wrapper .ReactCrop__drag-handle.ord-n {
            top: -13px;
          }

          .mobile-crop-wrapper .ReactCrop__drag-handle.ord-s {
            bottom: -13px;
          }

          .mobile-crop-wrapper .ReactCrop__drag-handle.ord-e {
            right: -13px;
          }

          .mobile-crop-wrapper .ReactCrop__drag-handle.ord-w {
            left: -13px;
          }

          .mobile-crop-wrapper .ReactCrop__drag-handle.ord-nw {
            top: -13px;
            left: -13px;
          }

          .mobile-crop-wrapper .ReactCrop__drag-handle.ord-ne {
            top: -13px;
            right: -13px;
          }

          .mobile-crop-wrapper .ReactCrop__drag-handle.ord-sw {
            bottom: -13px;
            left: -13px;
          }

          .mobile-crop-wrapper .ReactCrop__drag-handle.ord-se {
            bottom: -13px;
            right: -13px;
          }
        }
      `}</style>

      <div className="container my-4">
        <div
          className="product-modal-card"
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
                Cadastre categoria, preço, custo, margem e informações completas
                da peça.
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
              <label className="form-label">Valor de venda</label>

              <input
                className="form-control"
                type="number"
                step="0.01"
                min="0"
                placeholder="Ex: 50,00"
                value={form.price}
                onChange={(e) =>
                  handleSalePriceChange(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Custo do produto</label>

              <input
                className="form-control"
                type="number"
                step="0.01"
                min="0"
                placeholder="Ex: 20,00"
                value={form.costPrice}
                onChange={(e) =>
                  handleCostChange(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Margem desejada (%)</label>

              <input
                className="form-control"
                type="number"
                step="0.01"
                min="0"
                max="99.99"
                placeholder="Ex: 40"
                value={form.desiredMargin}
                onChange={(e) =>
                  handleDesiredMarginChange(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Resultado</label>

              <div
                style={{
                  background: "#fff",
                  borderRadius: 14,
                  border: `1px solid ${theme.border}`,
                  padding: "8px 12px",
                  minHeight: 38,
                  fontSize: 13,
                }}
              >
                <strong>Lucro:</strong> {formatCurrencyPreview(grossProfit)}
                <br />
                <strong>Margem atual:</strong> {formatPercent(currentMargin)}
              </div>
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

            {optionFields.map((field) => renderSelectField(field))}

            <div className="col-md-4">
              <label className="form-label">Perfil de frete</label>

              <select
                className="form-select"
                value={form.shippingProfile || DEFAULT_SHIPPING_PROFILE}
                onChange={(e) => handleShippingProfile(e.target.value)}
              >
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
                placeholder="Ex: 1"
                value={form.stock}
                onChange={(e) =>
                  setForm({
                    ...form,
                    stock: e.target.value === "" ? "" : Number(e.target.value),
                  })
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

              <div
                onClick={() => {
                  if (!uploading && !saving) {
                    fileInputRef.current?.click();
                  }
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingImage(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingImage(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingImage(false);
                }}
                onDrop={handleDropImage}
                style={{
                  background: isDraggingImage ? "#f8efe5" : "#fff",
                  border: `2px dashed ${
                    isDraggingImage ? theme.brown : theme.border
                  }`,
                  borderRadius: 22,
                  padding: 22,
                  cursor: uploading || saving ? "not-allowed" : "pointer",
                  textAlign: "center",
                  transition: "0.2s ease",
                  marginBottom: 16,
                }}
              >
                <p className="fw-bold mb-1">
                  Arraste a imagem do produto aqui
                </p>

                <small style={{ color: theme.brownSoft }}>
                  ou clique para anexar uma imagem
                </small>

                <div className="d-flex gap-2 flex-wrap justify-content-center mt-3">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      cameraInputRef.current?.click();
                    }}
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
                  className="mt-4 p-3 mobile-crop-wrapper"
                  style={{ background: "#fff", borderRadius: 18 }}
                >
                  <p className="fw-bold mb-1">Editar nova imagem</p>

                  <small style={{ color: theme.brownSoft }}>
                    No celular, toque e arraste as bolinhas brancas para diminuir
                    altura e largura.
                  </small>

                  <div
                    className="mt-3"
                    style={{
                      width: CROP_PREVIEW_SIZE,
                      maxWidth: "100%",
                      background: "#f3eadf",
                      borderRadius: 18,
                      overflow: "visible",
                      border: `1px solid ${theme.border}`,
                    }}
                  >
                    <ReactCrop
                      crop={crop}
                      onChange={(_, percentCrop) => setCrop(percentCrop)}
                      onComplete={(pixelCrop) => setCompletedCrop(pixelCrop)}
                      keepSelection
                      ruleOfThirds
                      style={{
                        touchAction: "none",
                        maxWidth: "100%",
                      }}
                    >
                      <img
                        ref={imageRef}
                        src={cropSrc}
                        alt="Cortar"
                        onLoad={() => {
                          setCrop(createInitialCrop());
                          setCompletedCrop(null);
                        }}
                        style={{
                          width: "100%",
                          height: "auto",
                          display: "block",
                          touchAction: "none",
                          userSelect: "none",
                          WebkitUserSelect: "none",
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
                        setCrop(createInitialCrop());
                        setCompletedCrop(null);
                      }}
                      style={{ borderRadius: 999 }}
                    >
                      Resetar corte
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
            manager.type === "tipos" ||
            manager.type === "subtipos" ||
            manager.type === "tamanhos"
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