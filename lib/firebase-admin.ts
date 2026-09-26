import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Singleton pattern — Next.js hot-reloads modules in dev, and re-calling
// initializeApp() on an already-initialized app throws. This guards against that.
function getFirebaseAdminApp(): App {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0];
  }

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // .env stores the key as a flat string with literal \n sequences —
      // convert them back into real newlines or the PEM parsing fails.
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export const firebaseAdminAuth = getAuth(getFirebaseAdminApp());

/**
 * Verifies a Firebase ID token sent from the client and returns its decoded
 * claims (uid, email, etc.) if valid. Throws if the token is invalid/expired.
 */
export async function verifyFirebaseIdToken(idToken: string) {
  return firebaseAdminAuth.verifyIdToken(idToken);
}