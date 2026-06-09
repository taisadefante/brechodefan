import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  CartItem,
  CustomerData,
  DeliveryType,
  OptionType,
  Product,
  Sale,
  SaleStatus,
} from "@/types";

export async function getProducts(includeSold = false): Promise<Product[]> {
  const snap = await getDocs(
    query(collection(db, "products"), orderBy("createdAt", "desc")),
  );

  const now = Date.now();

  const products = snap.docs.map(
    (item) =>
      ({
        id: item.id,
        ...item.data(),
      }) as Product,
  );

  const expired = products.filter(
    (product) =>
      product.status === "reservado" &&
      product.reservedUntil &&
      product.reservedUntil < now,
  );

  await Promise.all(
    expired.map((product) =>
      updateDoc(doc(db, "products", product.id), {
        status: "disponivel",
        reservedUntil: null,
      }),
    ),
  );

  return products
    .map((product) =>
      product.status === "reservado" &&
      product.reservedUntil &&
      product.reservedUntil < now
        ? { ...product, status: "disponivel", reservedUntil: null }
        : product,
    )
    .filter((product) => includeSold || product.status !== "vendido");
}

export async function getProduct(id: string): Promise<Product | null> {
  const snap = await getDoc(doc(db, "products", id));

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...snap.data(),
  } as Product;
}

export async function saveProduct(product: Omit<Product, "id">, id?: string) {
  const cleanProduct: Omit<Product, "id"> = {
    name: product.name || "",
    description: product.description || "",
    price: Number(product.price || 0),
    category: product.category || "",
    size: product.size || "",
    age: product.age || "",
    color: product.color || "",
    gender: product.gender || "",
    brand: product.brand || "",
    condition: product.condition || "",
    measurements: product.measurements || "",
    stock: Number(product.stock || 1),
    weight: Number(product.weight || 0),
    height: Number(product.height || 0),
    width: Number(product.width || 0),
    length: Number(product.length || 0),
    images: product.images || [],
    status: product.status || "disponivel",
    reservedUntil: product.reservedUntil || null,
    createdAt: product.createdAt || Date.now(),
    soldAt: product.soldAt || null,
  };

  if (id) {
    await updateDoc(doc(db, "products", id), cleanProduct);
    return id;
  }

  const created = await addDoc(collection(db, "products"), cleanProduct);
  return created.id;
}

export async function deleteProduct(productId: string) {
  await deleteDoc(doc(db, "products", productId));
}

export async function reserveProduct(productId: string) {
  await updateDoc(doc(db, "products", productId), {
    status: "reservado",
    reservedUntil: Date.now() + 2 * 60 * 60 * 1000,
  });
}

export async function releaseProduct(productId: string) {
  await updateDoc(doc(db, "products", productId), {
    status: "disponivel",
    reservedUntil: null,
  });
}

export async function markProductSold(productId: string) {
  await updateDoc(doc(db, "products", productId), {
    status: "vendido",
    soldAt: Date.now(),
    reservedUntil: null,
  });
}

export async function getOptions(type: OptionType): Promise<string[]> {
  const snap = await getDocs(
    query(collection(db, "options", type, "items"), orderBy("name", "asc")),
  );

  return snap.docs.map((item) => String(item.data().name || ""));
}

export async function getOptionDocs(type: OptionType) {
  const snap = await getDocs(
    query(collection(db, "options", type, "items"), orderBy("name", "asc")),
  );

  return snap.docs.map((item) => ({
    id: item.id,
    name: String(item.data().name || ""),
  }));
}

export async function addOption(type: OptionType, name: string) {
  await addDoc(collection(db, "options", type, "items"), {
    name: name || "",
    createdAt: Date.now(),
  });
}

export async function editOption(type: OptionType, id: string, name: string) {
  await updateDoc(doc(db, "options", type, "items", id), {
    name: name || "",
  });
}

export async function deleteOption(type: OptionType, id: string) {
  await deleteDoc(doc(db, "options", type, "items", id));
}

export async function saveCustomerData(userId: string, data: CustomerData) {
  const cleanData: CustomerData = {
    name: data.name || "",
    email: data.email || "",
    phone: data.phone || "",
    cep: data.cep || "",
    address: data.address || "",
    number: data.number || "",
    complement: data.complement || "",
    district: data.district || "",
    city: data.city || "",
    state: data.state || "",
  };

  await setDoc(doc(db, "customers", userId), cleanData, {
    merge: true,
  });
}

export async function getCustomerData(
  userId: string,
): Promise<CustomerData | null> {
  const snap = await getDoc(doc(db, "customers", userId));

  if (!snap.exists()) return null;

  const data = snap.data();

  return {
    name: String(data.name || ""),
    email: String(data.email || ""),
    phone: String(data.phone || ""),
    cep: String(data.cep || ""),
    address: String(data.address || ""),
    number: String(data.number || ""),
    complement: String(data.complement || ""),
    district: String(data.district || ""),
    city: String(data.city || ""),
    state: String(data.state || ""),
  };
}

export async function createSale(params: {
  userId: string;
  customer: CustomerData;
  items: CartItem[];
  subtotal: number;
  deliveryType: DeliveryType;
  deliveryPrice: number;
  paymentUrl?: string;
  mercadoPagoPreferenceId?: string;
}) {
  const total =
    Number(params.subtotal || 0) + Number(params.deliveryPrice || 0);

  const sale = {
    userId: params.userId,
    customer: {
      name: params.customer.name || "",
      email: params.customer.email || "",
      phone: params.customer.phone || "",
      cep: params.customer.cep || "",
      address: params.customer.address || "",
      number: params.customer.number || "",
      complement: params.customer.complement || "",
      district: params.customer.district || "",
      city: params.customer.city || "",
      state: params.customer.state || "",
    },
    items: params.items || [],
    subtotal: Number(params.subtotal || 0),
    deliveryType: params.deliveryType,
    deliveryPrice: Number(params.deliveryPrice || 0),
    total,
    status: "aguardando_pagamento" as SaleStatus,
    trackingCode: "",
    cancelRequested: false,
    cancelReason: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    paymentUrl: params.paymentUrl || "",
    mercadoPagoPreferenceId: params.mercadoPagoPreferenceId || "",
  };

  const ref = await addDoc(collection(db, "sales"), sale);
  return ref.id;
}

export async function getUserSales(userId: string): Promise<Sale[]> {
  const snap = await getDocs(
    query(
      collection(db, "sales"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
    ),
  );

  return snap.docs.map(
    (item) =>
      ({
        id: item.id,
        ...item.data(),
      }) as Sale,
  );
}

export async function getAllSales(): Promise<Sale[]> {
  const snap = await getDocs(
    query(collection(db, "sales"), orderBy("createdAt", "desc")),
  );

  return snap.docs.map(
    (item) =>
      ({
        id: item.id,
        ...item.data(),
      }) as Sale,
  );
}

export async function updateSaleStatus(
  id: string,
  status: SaleStatus,
  trackingCode?: string,
) {
  await updateDoc(doc(db, "sales", id), {
    status,
    trackingCode: trackingCode || "",
    updatedAt: Date.now(),
  });

  if (
    status === "pago" ||
    status === "separando" ||
    status === "pronto_retirada" ||
    status === "enviado"
  ) {
    const saleSnap = await getDoc(doc(db, "sales", id));

    if (!saleSnap.exists()) return;

    const sale = saleSnap.data() as Sale;

    if (sale?.items?.length) {
      await Promise.all(sale.items.map((item) => markProductSold(item.id)));
    }
  }
}

export async function requestCancelSale(id: string, reason: string) {
  await updateDoc(doc(db, "sales", id), {
    status: "cancelamento_solicitado",
    cancelRequested: true,
    cancelReason: reason || "",
    updatedAt: Date.now(),
  });
}

export async function approveCancelSale(id: string) {
  const saleSnap = await getDoc(doc(db, "sales", id));

  if (!saleSnap.exists()) return;

  const sale = saleSnap.data() as Sale;

  await updateDoc(doc(db, "sales", id), {
    status: "cancelado",
    updatedAt: Date.now(),
  });

  if (sale?.items?.length) {
    await Promise.all(sale.items.map((item) => releaseProduct(item.id)));
  }
}
