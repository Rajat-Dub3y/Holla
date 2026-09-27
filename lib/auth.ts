import { NextRequest } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/firebase-admin";
import { db } from "@/lib/db";
import { users } from "@/lib/Schema";
import { eq } from "drizzle-orm";

/**
 * Expects an `Authorization: Bearer <firebase-id-token>` header. Returns the
 * internal users.id (uuid) for the caller, or null if unauthenticated/invalid.
 * The frontend should attach this header on every authenticated API call —
 * `user.getIdToken()` from the Firebase client SDK, refreshed automatically
 * by the SDK as needed.
 */
export async function getAuthenticatedUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const idToken = authHeader.slice("Bearer ".length);

  try {
    const decoded = await verifyFirebaseIdToken(idToken);
    const user = await db.query.users.findFirst({
      where: eq(users.firebaseUid, decoded.uid),
    });
    return user?.id ?? null;
  } catch {
    return null;
  }
}