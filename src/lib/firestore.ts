import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "./firebase";

import {
  CartItem,
  CustomerAddress,
  CustomerData,
  DeliveryType,
  OptionType,
  Product,
  Sale,
  SaleStatus,
  ShippingOption,
} from "@/types";

type SaleWithInventory = Sale & {
  inventoryProcessed?: boolean;
  inventoryRestored?: boolean;
};

function saleUsesStock(status: SaleStatus) {
  return [
    "aguardando_pagamento",
    "pago",
    "separando",
    "pronto_retirada",
    "enviado",
    "entregue",
  ].includes(status);
}

function getItemQuantity(item: CartItem) {
  return Math.max(Number(item.quantity || 1), 1);
}

async function reserveStockFromSale(sale: SaleWithInventory) {
  if (sale.inventoryProcessed) return;

  await runTransaction(db, async (transaction) => {
    const productRefs = sale.items.map((item) => doc(db, "products", item.id));
    const productSnaps = await Promise.all(
      productRefs.map((ref) => transaction.get(ref)),
    );

    productSnaps.forEach((productSnap, index) => {
      if (!productSnap.exists()) return;

      const item = sale.items[index];
      const product = productSnap.data() as Product;
      const quantity = getItemQuantity(item);
      const currentStock = Math.max(Number(product.stock || 0), 0);
      const newStock = Math.max(currentStock - quantity, 0);

      transaction.update(productRefs[index], {
        stock: newStock,
        status: newStock > 0 ? "disponivel" : "reservado",
        soldAt: null,
        reservedUntil: null,
        updatedAt: Date.now(),
      });
    });
  });
}

async function confirmStockFromSale(sale: SaleWithInventory) {
  await Promise.all(
    sale.items.map(async (item) => {
      const productRef = doc(db, "products", item.id);
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) return;

      const product = productSnap.data() as Product;
      const currentStock = Math.max(Number(product.stock || 0), 0);

      await updateDoc(productRef, {
        status: currentStock > 0 ? "disponivel" : "vendido",
        soldAt: currentStock > 0 ? null : Date.now(),
        reservedUntil: null,
        updatedAt: Date.now(),
      });
    }),
  );
}

async function restoreStockFromSale(sale: SaleWithInventory) {
  if (sale.inventoryRestored) return;

  await runTransaction(db, async (transaction) => {
    const saleRef = doc(db, "sales", sale.id);
    const saleSnap = await transaction.get(saleRef);

    if (!saleSnap.exists()) return;

    const currentSale = saleSnap.data() as SaleWithInventory;

    if (currentSale.inventoryRestored) return;

    const items = currentSale.items || sale.items || [];
    const productRefs = items.map((item) => doc(db, "products", item.id));
    const productSnaps = await Promise.all(
      productRefs.map((ref) => transaction.get(ref)),
    );

    productSnaps.forEach((productSnap, index) => {
      if (!productSnap.exists()) return;

      const item = items[index];
      const product = productSnap.data() as Product;
      const quantity = getItemQuantity(item);
      const currentStock = Math.max(Number(product.stock || 0), 0);
      const newStock = currentStock + quantity;

      transaction.update(productRefs[index], {
        stock: newStock,
        status: "disponivel",
        soldAt: null,
        reservedUntil: null,
        updatedAt: Date.now(),
      });
    });

    transaction.update(saleRef, {
      inventoryProcessed: false,
      inventoryRestored: true,
      updatedAt: Date.now(),
    });
  });
}

export async function getProducts(includeSold = false): Promise<Product[]> {
  const snap = await getDocs(
    query(collection(db, "products"), orderBy("createdAt", "desc")),
  );

  const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);

  return products.filter(
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
  const stock = Math.max(Number(product.stock || 0), 0);

  const payload = {
    ...product,
    stock,
    status:
      stock > 0 && product.status === "vendido"
        ? "disponivel"
        : product.status,
    soldAt:
      stock > 0 && product.status === "vendido" ? null : product.soldAt || null,
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
    updatedAt: Date.now(),
  });
}

export async function releaseProduct(productId: string): Promise<void> {
  await updateDoc(doc(db, "products", productId), {
    status: "disponivel",
    reservedUntil: null,
    soldAt: null,
    updatedAt: Date.now(),
  });
}

export async function markProductSold(productId: string): Promise<void> {
  const productRef = doc(db, "products", productId);
  const productSnap = await getDoc(productRef);

  if (!productSnap.exists()) return;

  const product = productSnap.data() as Product;
  const newStock = Math.max(Number(product.stock || 0) - 1, 0);

  await updateDoc(productRef, {
    stock: newStock,
    status: newStock > 0 ? "disponivel" : "vendido",
    soldAt: newStock > 0 ? null : Date.now(),
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

  if (!cleanName) throw new Error("Informe um nome válido.");

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

  if (!cleanName) throw new Error("Informe um nome válido.");

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
  shippingAddress?: CustomerAddress | null;
  items: CartItem[];
  subtotal: number;
  deliveryType: DeliveryType;
  deliveryPrice: number;
  shippingOption?: ShippingOption | null;
  paymentUrl?: string;
  mercadoPagoPreferenceId?: string;
}): Promise<string> {
  const total = params.subtotal + params.deliveryPrice;

  const saleData: Omit<SaleWithInventory, "id"> = {
    userId: params.userId,
    customer: params.customer,
    shippingAddress: params.shippingAddress || null,
    items: params.items,
    subtotal: params.subtotal,
    deliveryType: params.deliveryType,
    deliveryPrice: params.deliveryPrice,
    shippingOption: params.shippingOption || null,
    total,
    status: "aguardando_pagamento",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    paymentUrl: params.paymentUrl || "",
    mercadoPagoPreferenceId: params.mercadoPagoPreferenceId || "",
    melhorEnvioOrderId: "",
    melhorEnvioPrintUrl: "",
    trackingCode: "",
    inventoryProcessed: false,
    inventoryRestored: false,
  };

  const ref = await addDoc(collection(db, "sales"), saleData);

  const sale: SaleWithInventory = {
    id: ref.id,
    ...saleData,
  };

  await reserveStockFromSale(sale);

  await updateDoc(doc(db, "sales", ref.id), {
    inventoryProcessed: true,
    inventoryRestored: false,
    updatedAt: Date.now(),
  });

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
  const saleRef = doc(db, "sales", id);
  const saleSnap = await getDoc(saleRef);

  if (!saleSnap.exists()) return;

  const sale = {
    id: saleSnap.id,
    ...saleSnap.data(),
  } as SaleWithInventory;

  const previousStatus = sale.status;

  if (status === "cancelado") {
    await restoreStockFromSale(sale);

    await updateDoc(saleRef, {
      status: "cancelado",
      trackingCode: trackingCode || sale.trackingCode || "",
      cancelApproved: true,
      cancelApprovedAt: Date.now(),
      inventoryProcessed: false,
      inventoryRestored: true,
      updatedAt: Date.now(),
    });

    return;
  }

  if (
    sale.inventoryRestored &&
    status !== "cancelado" &&
    previousStatus === "cancelado"
  ) {
    await reserveStockFromSale({
      ...sale,
      inventoryProcessed: false,
      inventoryRestored: false,
    });
  }

  if (!sale.inventoryProcessed && saleUsesStock(status)) {
    await reserveStockFromSale(sale);
  }

  if (saleUsesStock(status)) {
    await confirmStockFromSale(sale);
  }

  await updateDoc(saleRef, {
    status,
    trackingCode: trackingCode || sale.trackingCode || "",
    inventoryProcessed: saleUsesStock(status),
    inventoryRestored: false,
    updatedAt: Date.now(),
  });
}

export async function updateSaleShippingLabel(
  id: string,
  data: {
    melhorEnvioOrderId?: string;
    melhorEnvioPrintUrl?: string;
    trackingCode?: string;
  },
): Promise<void> {
  await updateDoc(doc(db, "sales", id), {
    melhorEnvioOrderId: data.melhorEnvioOrderId || "",
    melhorEnvioPrintUrl: data.melhorEnvioPrintUrl || "",
    trackingCode: data.trackingCode || "",
    updatedAt: Date.now(),
  });
}

export async function updateSaleShippingOption(
  id: string,
  shippingOption: ShippingOption | null,
): Promise<void> {
  await updateDoc(doc(db, "sales", id), {
    shippingOption,
    updatedAt: Date.now(),
  });
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
  const saleRef = doc(db, "sales", id);
  const saleSnap = await getDoc(saleRef);

  if (!saleSnap.exists()) return;

  const sale = {
    id: saleSnap.id,
    ...saleSnap.data(),
  } as SaleWithInventory;

  await restoreStockFromSale(sale);

  await updateDoc(saleRef, {
    status: "cancelado",
    cancelApproved: true,
    cancelApprovedAt: Date.now(),
    inventoryProcessed: false,
    inventoryRestored: true,
    updatedAt: Date.now(),
  });
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

export async function getCustomerAddresses(
  userId: string,
): Promise<CustomerAddress[]> {
  const snap = await getDocs(
    query(
      collection(db, "customers", userId, "addresses"),
      orderBy("createdAt", "desc"),
    ),
  );

  return snap.docs.map(
    (d) =>
      ({
        id: d.id,
        userId,
        ...d.data(),
      }) as CustomerAddress,
  );
}

export async function saveCustomerAddress(
  userId: string,
  address: Omit<CustomerAddress, "id" | "userId">,
  id?: string,
): Promise<string> {
  const payload = {
    ...address,
    userId,
    updatedAt: Date.now(),
  };

  if (address.isDefault) {
    const addresses = await getCustomerAddresses(userId);

    await Promise.all(
      addresses.map((item) =>
        updateDoc(doc(db, "customers", userId, "addresses", item.id), {
          isDefault: false,
          updatedAt: Date.now(),
        }),
      ),
    );
  }

  if (id) {
    await updateDoc(doc(db, "customers", userId, "addresses", id), payload);
    return id;
  }

  const ref = await addDoc(collection(db, "customers", userId, "addresses"), {
    ...payload,
    createdAt: Date.now(),
  });

  return ref.id;
}

export async function deleteCustomerAddress(
  userId: string,
  addressId: string,
): Promise<void> {
  await deleteDoc(doc(db, "customers", userId, "addresses", addressId));
}

export async function setDefaultCustomerAddress(
  userId: string,
  addressId: string,
): Promise<void> {
  const addresses = await getCustomerAddresses(userId);

  await Promise.all(
    addresses.map((item) =>
      updateDoc(doc(db, "customers", userId, "addresses", item.id), {
        isDefault: item.id === addressId,
        updatedAt: Date.now(),
      }),
    ),
  );
}

export async function getAllCustomerAddresses(): Promise<CustomerAddress[]> {
  const customersSnap = await getDocs(collection(db, "customers"));
  const allAddresses: CustomerAddress[] = [];

  await Promise.all(
    customersSnap.docs.map(async (customerDoc) => {
      const addressesSnap = await getDocs(
        query(
          collection(db, "customers", customerDoc.id, "addresses"),
          orderBy("createdAt", "desc"),
        ),
      );

      addressesSnap.docs.forEach((addressDoc) => {
        allAddresses.push({
          id: addressDoc.id,
          userId: customerDoc.id,
          ...addressDoc.data(),
        } as CustomerAddress);
      });
    }),
  );

  return allAddresses.sort(
    (a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0),
  );
}