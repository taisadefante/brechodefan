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
import { db } from "./firebase";
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

  const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);

  const expiredReserved = products.filter(
    (product) =>
      product.status === "reservado" &&
      product.reservedUntil !== undefined &&
      product.reservedUntil !== null &&
      product.reservedUntil < now,
  );

  await Promise.all(
    expiredReserved.map((product) =>
      updateDoc(doc(db, "products", product.id), {
        status: "disponivel",
        reservedUntil: null,
        updatedAt: now,
      }),
    ),
  );

  const normalizedProducts: Product[] = products.map((product) => {
    if (
      product.status === "reservado" &&
      product.reservedUntil !== undefined &&
      product.reservedUntil !== null &&
      product.reservedUntil < now
    ) {
      const normalizedProduct: Product = {
        ...product,
        status: "disponivel",
        reservedUntil: null,
        updatedAt: now,
      };

      return normalizedProduct;
    }

    return product;
  });

  return normalizedProducts.filter(
    (product) => includeSold || product.status !== "vendido",
  );
}

export async function getProduct(id: string): Promise<Product | null> {
  const snap = await getDoc(doc(db, "products", id));

  if (!snap.exists()) return null;

  return { id: snap.id, ...snap.data() } as Product;
}

export async function saveProduct(
  product: Product | Omit<Product, "id">,
  id?: string,
): Promise<string> {
  const productId = id || ("id" in product ? product.id : undefined);

  const payload = {
    ...product,
    updatedAt: Date.now(),
  };

  delete (payload as Partial<Product>).id;

  if (productId) {
    await updateDoc(doc(db, "products", productId), payload);
    return productId;
  }

  const created = await addDoc(collection(db, "products"), {
    ...payload,
    createdAt: Date.now(),
  });

  return created.id;
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, "products", id));
}

export async function reserveProduct(productId: string): Promise<void> {
  await updateDoc(doc(db, "products", productId), {
    status: "reservado",
    reservedUntil: Date.now() + 2 * 60 * 60 * 1000,
    updatedAt: Date.now(),
  });
}

export async function releaseProduct(productId: string): Promise<void> {
  await updateDoc(doc(db, "products", productId), {
    status: "disponivel",
    reservedUntil: null,
    updatedAt: Date.now(),
  });
}

export async function markProductSold(productId: string): Promise<void> {
  await updateDoc(doc(db, "products", productId), {
    status: "vendido",
    soldAt: Date.now(),
    reservedUntil: null,
    updatedAt: Date.now(),
  });
}

export async function getOptions(type: OptionType): Promise<string[]> {
  const snap = await getDocs(
    query(collection(db, "options", type, "items"), orderBy("name", "asc")),
  );

  return snap.docs.map((d) => String(d.data().name || ""));
}

export async function getOptionDocs(
  type: OptionType,
): Promise<Array<{ id: string; name: string }>> {
  const snap = await getDocs(
    query(collection(db, "options", type, "items"), orderBy("name", "asc")),
  );

  return snap.docs.map((d) => ({
    id: d.id,
    name: String(d.data().name || ""),
  }));
}

export async function addOption(type: OptionType, name: string): Promise<void> {
  const cleanName = name.trim();

  if (!cleanName) {
    throw new Error("Informe um nome válido.");
  }

  await addDoc(collection(db, "options", type, "items"), {
    name: cleanName,
    createdAt: Date.now(),
  });
}

export async function editOption(
  type: OptionType,
  id: string,
  name: string,
): Promise<void> {
  const cleanName = name.trim();

  if (!cleanName) {
    throw new Error("Informe um nome válido.");
  }

  await updateDoc(doc(db, "options", type, "items", id), {
    name: cleanName,
    updatedAt: Date.now(),
  });
}

export async function deleteOption(
  type: OptionType,
  id: string,
): Promise<void> {
  await deleteDoc(doc(db, "options", type, "items", id));
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
}): Promise<string> {
  const total = params.subtotal + params.deliveryPrice;

  const sale: Omit<Sale, "id"> = {
    userId: params.userId,
    customer: params.customer,
    items: params.items,
    subtotal: params.subtotal,
    deliveryType: params.deliveryType,
    deliveryPrice: params.deliveryPrice,
    total,
    status: "aguardando_pagamento",
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

  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Sale);
}

export async function getAllSales(): Promise<Sale[]> {
  const snap = await getDocs(
    query(collection(db, "sales"), orderBy("createdAt", "desc")),
  );

  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Sale);
}

export async function updateSaleStatus(
  id: string,
  status: SaleStatus,
  trackingCode?: string,
): Promise<void> {
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
    const sale = saleSnap.data() as Sale | undefined;

    if (sale?.items?.length) {
      await Promise.all(sale.items.map((item) => markProductSold(item.id)));
    }
  }
}

export async function requestCancelSale(
  id: string,
  reason: string,
): Promise<void> {
  await updateDoc(doc(db, "sales", id), {
    status: "cancelamento_solicitado",
    cancelRequested: true,
    cancelReason: reason,
    updatedAt: Date.now(),
  });
}

export async function approveCancelSale(id: string): Promise<void> {
  const saleSnap = await getDoc(doc(db, "sales", id));
  const sale = saleSnap.data() as Sale | undefined;

  await updateDoc(doc(db, "sales", id), {
    status: "cancelado",
    updatedAt: Date.now(),
  });

  if (sale?.items?.length) {
    await Promise.all(sale.items.map((item) => releaseProduct(item.id)));
  }
}

export async function saveCustomerData(
  userId: string,
  data: CustomerData,
): Promise<void> {
  await setDoc(doc(db, "customers", userId), data, { merge: true });
}

export async function getCustomerData(
  userId: string,
): Promise<CustomerData | null> {
  const snap = await getDoc(doc(db, "customers", userId));

  if (!snap.exists()) return null;

  return snap.data() as CustomerData;
}
