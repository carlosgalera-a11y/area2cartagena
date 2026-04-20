import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../lib/admin';

const DEFAULT_DAILY_QUOTA = 50;

export interface QuotaResult {
  remaining: number;
  limit: number;
  used: number;
}

/**
 * Decrementa la cuota diaria del usuario en una transaccion.
 * Lanza Error('quota_exhausted') si esta agotada.
 */
export async function consumeDailyQuota(
  tenantId: string,
  uid: string,
): Promise<QuotaResult> {
  const today = new Date().toISOString().slice(0, 10);
  const userRef = db.doc(`tenants/${tenantId}/users/${uid}`);
  const quotaRef = db.doc(`tenants/${tenantId}/users/${uid}/aiQuota/${today}`);

  return db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    const limit =
      (userSnap.exists && (userSnap.get('quotas.aiPerDay') as number | undefined)) ||
      DEFAULT_DAILY_QUOTA;

    const quotaSnap = await tx.get(quotaRef);
    const used = (quotaSnap.exists && (quotaSnap.get('count') as number | undefined)) || 0;

    if (used >= limit) {
      const err = new Error('quota_exhausted');
      (err as any).limit = limit;
      (err as any).used = used;
      throw err;
    }

    tx.set(
      quotaRef,
      {
        count: used + 1,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    // Ensure user doc exists with quota stub for first-time users.
    if (!userSnap.exists) {
      tx.set(
        userRef,
        {
          quotas: { aiPerDay: DEFAULT_DAILY_QUOTA },
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    return { remaining: limit - used - 1, limit, used: used + 1 };
  });
}
