import { z } from 'zod';

export const PrivacyLevelSchema = z.enum(['public', 'private', 'contacts']);

/** Contract for the user entity returned by the RWA API (password hash deliberately excluded). */
export const UserSchema = z.object({
  id: z.string().min(1),
  uuid: z.uuid(),
  firstName: z.string(),
  lastName: z.string(),
  username: z.string(),
  email: z.string().optional(),
  phoneNumber: z.string().optional(),
  balance: z.number().int(),
  avatar: z.string().optional(),
  defaultPrivacyLevel: PrivacyLevelSchema.optional(),
  createdAt: z.string(),
  modifiedAt: z.string(),
});
export type User = z.infer<typeof UserSchema>;

export const UserEnvelopeSchema = z.object({ user: UserSchema });

export const UserListSchema = z.object({ results: z.array(UserSchema) });

/** Payload accepted by POST /users. `balance` is optional and expressed in cents. */
export interface NewUser {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  email: string;
  phoneNumber: string;
  balance?: number;
  defaultPrivacyLevel?: z.infer<typeof PrivacyLevelSchema>;
}

export interface Credentials {
  username: string;
  password: string;
}
