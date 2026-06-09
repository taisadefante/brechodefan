"use client";

import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { getOptions, saveProduct } from "@/lib/firestore";
import { OptionType, Product, ShippingProfile } from "@/types";
import { theme } from "@/lib/theme";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";
import OptionManagerModal from "./OptionManagerModal";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

type ProductForm = Omit<Product, "id"> & {
  shippingProfile?: ShippingProfile | "";
};

const CARD_IMAGE_WIDTH = 390;
const CARD_IMAGE_HEIGHT = 520;

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
  type: OptionType;
}[] = [
  { key: "category", label: "Categoria", type: "categorias" },
  { key: "size", label: "Tamanho", type: "tamanhos" },
  { key: "age", label: "Idade", type: "idades" },
  { key: "color", label: "Cor", type: "cores" },
  { key: "gender", label: "Sexo", type: "sexos" },
  { key: "brand", label: "Marca", type: "marcas" },
  { key: "condition", label: "Estado da peça", type: "condicoes" },
];

export default function ProductModal({
  product,
  onClose,
  onSaved,
}: {
  product?: Product | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ProductForm>(
    product
      ? {
          ...emptyForm,
          ...product,
          shippingProfile: product.shippingProfile || "",
          weight: Number(product.weight || 0.15),
          height: Number(product.height || 4),
          width: Number(product.width || 10),
          length: Number(product.length || 15),
          images: product.images || [],
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

  const [manager, setManager] = useState<{
    type: OptionType;
    title: string;
  } | null>(null);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cropSrc, setCropSrc] = useState("");
  const [imageScale, setImageScale] = useState(1);
  const [crop, setCrop] = useState<Crop>({
    unit: "%",
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  async function loadOptions() {
    const loaded: Record<string, string[]> = {};

    for (const field of optionFields) {
      loaded[field.type] = await getOptions(field.type);
    }

    setOptions(loaded);
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
      setImageScale(1);
      setCrop({
        unit: "%",
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });
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

      canvas.width = 1200;
      canvas.height = 1600;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

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

      const fitRatio = Math.min(
        canvas.width / sourceWidth,
        canvas.height / sourceHeight,
      );

      const finalRatio = fitRatio * imageScale;

      const drawWidth = sourceWidth * finalRatio;
      const drawHeight = sourceHeight * finalRatio;
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
      setImageScale(1);

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
        product?.id,
      );

      onSaved();
      onClose();
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
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h3 className="fw-bold mb-1">
                {product ? "Editar produto" : "Cadastrar produto"}
              </h3>
              <p className="mb-0" style={{ color: theme.brownSoft }}>
                Cadastre as informações da peça e selecione o perfil de frete.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onClose}
              disabled={uploading || saving}
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

            {optionFields.map((field) => (
              <div className="col-md-4" key={field.key}>
                <label className="form-label">{field.label}</label>

                <div className="input-group">
                  <select
                    className="form-select"
                    value={String(form[field.key] || "")}
                    onChange={(e) =>
                      setForm({ ...form, [field.key]: e.target.value })
                    }
                  >
                    <option value="">Selecione</option>

                    {options[field.type]?.map((op) => (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() =>
                      setManager({ type: field.type, title: field.label })
                    }
                  >
                    +
                  </button>
                </div>
              </div>
            ))}

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

              <small style={{ color: theme.brownSoft }}>
                Para roupa infantil, a caixa base é 4cm x 10cm x 15cm. No
                carrinho, a API aumenta a caixa conforme a quantidade de peças.
              </small>
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
                placeholder="Ex: 0 a 3 meses, veste P, comprimento 30cm..."
                value={form.measurements || ""}
                onChange={(e) =>
                  setForm({ ...form, measurements: e.target.value })
                }
              />
            </div>

            <div className="col-12 mt-3">
              <div
                className="p-3"
                style={{
                  background: "#fff",
                  borderRadius: 18,
                  border: `1px solid ${theme.border}`,
                }}
              >
                <h5 className="fw-bold mb-1">Frete automático</h5>
                <p className="mb-3" style={{ color: theme.brownSoft }}>
                  O cadastro salva o peso da peça. A caixa é calculada
                  automaticamente no carrinho conforme a quantidade de peças.
                </p>

                <div className="row g-3">
                  <div className="col-md-3">
                    <label className="form-label">Peso (kg)</label>
                    <input
                      className="form-control"
                      value={form.weight}
                      readOnly
                    />
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Altura (cm)</label>
                    <input
                      className="form-control"
                      value={form.height}
                      readOnly
                    />
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Largura (cm)</label>
                    <input
                      className="form-control"
                      value={form.width}
                      readOnly
                    />
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Comprimento (cm)</label>
                    <input
                      className="form-control"
                      value={form.length}
                      readOnly
                    />
                  </div>
                </div>
              </div>
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
                        height: 145,
                        objectFit: "contain",
                        background: "#f3eadf",
                        borderRadius: 16,
                      }}
                    />

                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                      }}
                      disabled={uploading || saving}
                      onClick={() =>
                        setForm({
                          ...form,
                          images: form.images.filter((_, i) => i !== index),
                        })
                      }
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>

              {cropSrc && (
                <div
                  className="mt-4 p-3"
                  style={{
                    background: "#fff",
                    borderRadius: 18,
                  }}
                >
                  <p className="fw-bold mb-1">Editar nova imagem</p>

                  <p className="small mb-3" style={{ color: "#6b7280" }}>
                    A área abaixo tem o mesmo formato da foto no card. Ajuste o
                    corte e o tamanho para ver como vai ficar.
                  </p>

                  <div className="mb-3">
                    <label className="form-label">Tamanho da foto</label>

                    <input
                      type="range"
                      min="0.5"
                      max="2.5"
                      step="0.05"
                      value={imageScale}
                      className="form-range"
                      onChange={(e) => setImageScale(Number(e.target.value))}
                    />
                  </div>

                  <div
                    style={{
                      width: CARD_IMAGE_WIDTH,
                      height: CARD_IMAGE_HEIGHT,
                      maxWidth: "100%",
                      background: "#f3eadf",
                      borderRadius: 18,
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ReactCrop
                      crop={crop}
                      onChange={(_, percentCrop) => setCrop(percentCrop)}
                      onComplete={(pixelCrop) => setCompletedCrop(pixelCrop)}
                    >
                      <img
                        ref={imageRef}
                        src={cropSrc}
                        alt="Cortar"
                        onLoad={() =>
                          setCrop({
                            unit: "%",
                            x: 0,
                            y: 0,
                            width: 100,
                            height: 100,
                          })
                        }
                        style={{
                          width: CARD_IMAGE_WIDTH,
                          height: CARD_IMAGE_HEIGHT,
                          objectFit: "contain",
                          transform: `scale(${imageScale})`,
                          transformOrigin: "center center",
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
                        setImageScale(1);
                      }}
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
          onClose={() => setManager(null)}
          onChange={loadOptions}
        />
      )}
    </div>
  );
}

