import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { VaultSyncPutSchema, HEX_64_REGEX } from '../security/vaptGuards.js';
import { authGuard, getCurrentUser } from '../middleware/authGuard.js';
import { VaultService } from '../services/vaultService.js';

export const vaultRoutes = new Hono();

vaultRoutes.use('*', authGuard);

/**
 * 1. PUT /api/v1/vault/sync
 */
vaultRoutes.put('/sync', zValidator('json', VaultSyncPutSchema), async (c) => {
  const user = getCurrentUser(c);
  const body = c.req.valid('json');

  try {
    const result = await VaultService.syncVault(user.userId, body);
    return c.json({
      backupId: result.backup_id,
      newVersionNumber: result.version_number,
      syncedAtIso: result.created_at,
    });
  } catch (error: any) {
    if (error.message === 'VAULT_VERSION_CONFLICT_409') {
      return c.json(
        {
          errorCode: 'VAULT_VERSION_CONFLICT',
          message: 'The cloud vault has a newer version or concurrent update occurred.',
        },
        409
      );
    }
    if (error.message === 'STORAGE_SERVICE_UNAVAILABLE_503') {
      return c.json(
        {
          errorCode: 'VAULT_STORAGE_UNAVAILABLE',
          message: 'Encrypted storage backend is temporarily unavailable. Please retry shortly.',
        },
        503
      );
    }
    throw error;
  }
});

/**
 * 2. GET /api/v1/vault/sync/:panBlindIndexHmac
 */
vaultRoutes.get('/sync/:panBlindIndexHmac', async (c) => {
  const user = getCurrentUser(c);
  const panHmac = c.req.param('panBlindIndexHmac');
  const ay = c.req.query('ay') || '2026-27';

  if (!HEX_64_REGEX.test(panHmac)) {
    return c.json({ errorCode: 'INVALID_PAN_BLIND_INDEX_FORMAT' }, 400);
  }

  const vault = await VaultService.getVault(user.userId, panHmac, ay);
  if (!vault) {
    return c.json({ errorCode: 'VAULT_NOT_FOUND', panBlindIndexHmac: panHmac, assessmentYear: ay }, 404);
  }

  return c.json(vault);
});

/**
 * 3. GET /api/v1/vault/history
 */
vaultRoutes.get('/history', async (c) => {
  const user = getCurrentUser(c);
  const list = await VaultService.listHistory(user.userId);
  return c.json({ backups: list });
});

/**
 * 4. DELETE /api/v1/vault/purge/:panBlindIndexHmac
 */
vaultRoutes.delete('/purge/:panBlindIndexHmac', async (c) => {
  const user = getCurrentUser(c);
  const panHmac = c.req.param('panBlindIndexHmac');

  if (!HEX_64_REGEX.test(panHmac)) {
    return c.json({ errorCode: 'INVALID_PAN_BLIND_INDEX_FORMAT' }, 400);
  }

  const purgedCount = await VaultService.purgeVault(user.userId, panHmac);
  return c.json({
    status: 'PURGED_SUCCESSFULLY',
    purgedCount,
    panBlindIndexHmac: panHmac,
  });
});
