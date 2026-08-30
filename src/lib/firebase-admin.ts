import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getPrivateKey() {
  const value = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!value) {
    throw new Error(
      "FIREBASE_ADMIN_PRIVATE_KEY não foi configurada no servidor.",
    );
  }

  return value.replace(/\\n/g, "\n");
}

function getAdminApp() {
  if (getApps().length) {
    return getApps()[0]!;
  }

  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

  if (!projectId) {
    throw new Error(
      "FIREBASE_ADMIN_PROJECT_ID ou NEXT_PUBLIC_FIREBASE_PROJECT_ID não foi configurado.",
    );
  }

  if (!clientEmail) {
    throw new Error(
      "FIREBASE_ADMIN_CLIENT_EMAIL não foi configurado no servidor.",
    );
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: getPrivateKey(),
    }),
  });
}

export const adminDb = getFirestore(getAdminApp());
