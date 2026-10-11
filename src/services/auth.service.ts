import crypto from 'node:crypto';
import type { JsonStore } from '../storage/store.js';
import type { User, ApiKeyRecord, UserRole } from '../types/index.js';

export interface GeneratedKeyResult {
  rawKey: string;
  keyRecord: ApiKeyRecord;
}

export class AuthService {
  constructor(private store: JsonStore) {}

  public static hashApiKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey.trim()).digest('hex');
  }

  public seedDefaultUsersAndKeys(fallbackApiKey?: string): {
    adminKey?: string;
    memberKey?: string;
  } {
    const existingUsers = this.store.getUsers();
    let admin = existingUsers.find((u) => u.username === 'admin');
    let member = existingUsers.find((u) => u.username === 'member');

    if (!admin) {
      admin = {
        id: 'usr_admin_' + crypto.randomUUID().slice(0, 8),
        username: 'admin',
        role: 'admin',
        createdAt: new Date().toISOString(),
      };
      this.store.addUser(admin);
    }

    if (!member) {
      member = {
        id: 'usr_member_' + crypto.randomUUID().slice(0, 8),
        username: 'member',
        role: 'member',
        createdAt: new Date().toISOString(),
      };
      this.store.addUser(member);
    }

    let generatedAdminKey: string | undefined;
    let generatedMemberKey: string | undefined;

    const existingKeys = this.store.getApiKeys();

    // Ensure Admin has a valid key
    const hasAdminKey = existingKeys.some((k) => k.userId === admin?.id && !k.revoked);
    if (!hasAdminKey) {
      if (fallbackApiKey && fallbackApiKey.trim().length > 0) {
        // Map the existing configured GATEWAY_API_KEY to admin
        const keyHash = AuthService.hashApiKey(fallbackApiKey);
        this.store.addApiKey({
          id: 'key_admin_seed',
          userId: admin.id,
          name: 'Primary Admin Key (Environment Seed)',
          keyHash,
          keyPrefix: fallbackApiKey.slice(0, 7) + '...',
          revoked: false,
          createdAt: new Date().toISOString(),
        });
      } else {
        const { rawKey } = this.createApiKey(admin.id, 'Initial Admin Key');
        generatedAdminKey = rawKey;
      }
    }

    // Ensure Member has a valid key
    const hasMemberKey = existingKeys.some((k) => k.userId === member?.id && !k.revoked);
    if (!hasMemberKey) {
      const { rawKey } = this.createApiKey(member.id, 'Initial Member Key');
      generatedMemberKey = rawKey;
    }

    return { adminKey: generatedAdminKey, memberKey: generatedMemberKey };
  }

  public createUser(username: string, role: UserRole): User {
    const existing = this.store.getUserByUsername(username);
    if (existing) {
      throw new Error(`User with username '${username}' already exists`);
    }

    const user: User = {
      id: `usr_${crypto.randomUUID().slice(0, 8)}`,
      username: username.trim(),
      role,
      createdAt: new Date().toISOString(),
    };

    this.store.addUser(user);
    return user;
  }

  public createApiKey(userId: string, name: string): GeneratedKeyResult {
    const user = this.store.getUserById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Generate high-entropy API key
    const entropy = crypto.randomBytes(24).toString('base64url');
    const rawKey = `wc_${user.role}_${entropy}`;
    const keyHash = AuthService.hashApiKey(rawKey);
    const keyPrefix = rawKey.slice(0, 11) + '...';

    const keyRecord: ApiKeyRecord = {
      id: `key_${crypto.randomUUID().slice(0, 8)}`,
      userId: user.id,
      name: name.trim() || `${user.username} Key`,
      keyHash,
      keyPrefix,
      revoked: false,
      createdAt: new Date().toISOString(),
    };

    this.store.addApiKey(keyRecord);
    return { rawKey, keyRecord };
  }

  public verifyKey(rawKey: string): { user: User; apiKey: ApiKeyRecord } | null {
    if (!rawKey || typeof rawKey !== 'string') return null;
    const cleanKey = rawKey.trim();
    const hash = AuthService.hashApiKey(cleanKey);

    const keyRecord = this.store.getApiKeyByHash(hash);
    if (!keyRecord) return null;

    if (keyRecord.revoked) {
      return null; // Explicitly reject revoked key
    }

    const user = this.store.getUserById(keyRecord.userId);
    if (!user) return null;

    return { user, apiKey: keyRecord };
  }

  public revokeApiKey(keyId: string): boolean {
    return this.store.revokeApiKey(keyId);
  }

  public listUsers(): User[] {
    return this.store.getUsers();
  }

  public listApiKeys(userId?: string): ApiKeyRecord[] {
    const keys = this.store.getApiKeys();
    if (userId) {
      return keys.filter((k) => k.userId === userId);
    }
    return keys;
  }
}
