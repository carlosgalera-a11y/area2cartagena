import { FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { db } from '../lib/admin';

export type AuditAction =
  | 'patient.create'
  | 'patient.update'
  | 'patient.delete'
  | 'note.create'
  | 'note.update'
  | 'note.delete'
  | 'ai.ask'
  | 'ai.cache_hit'
  | 'ai.quota_exhausted'
  | 'ai.provider_fail'
  | 'user.login'
  | 'user.export'
  | 'user.deleteAll'
  | 'admin.invite'
  | 'admin.quotaChange';

export interface AuditEntry {
  uid: string;
  tenantId: string;
  action: AuditAction;
  resourceType?: 'patient' | 'note' | 'ai' | 'user' | 'admin' | 'tenant';
  resourceId?: string;
  ip?: string;
  ua?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await db.collection(`tenants/${entry.tenantId}/auditLogs`).add({
      ...entry,
      ua: entry.ua?.slice(0, 200),
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    // Auditoria nunca debe romper la peticion principal.
    logger.error('audit_write_failed', { err: (err as Error).message, action: entry.action });
  }
}
