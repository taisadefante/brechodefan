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

function getFirebaseAdminConfig() {
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  const clientEmail =
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

  if (!projectId) {
    throw new Error(
      "FIREBASE_ADMIN_PROJECT_ID ou NEXT_PUBLIC_FIREBASE_PROJECT_ID não foi configurado no servidor.",
    );
  }

  if (!clientEmail) {
    throw new Error(
      "FIREBASE_ADMIN_CLIENT_EMAIL não foi configurado no servidor.",
    );
  }

  return {
    projectId,
    clientEmail,
    privateKey: getPrivateKey(),
  };
}

export function getAdminDb() {
  const existingApp = getApps()[0];

  if (existingApp) {
    return getFirestore(existingApp);
  }

  const {
    projectId,
    clientEmail,
    privateKey,
  } = getFirebaseAdminConfig();

  const app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  return getFirestore(app);
}