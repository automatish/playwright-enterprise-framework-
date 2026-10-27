import { z } from 'zod';
import { PrivacyLevelSchema } from './user.model';

export const TransactionStatusSchema = z.enum(['pending', 'incomplete', 'complete']);
export const RequestStatusSchema = z.enum(['pending', 'accepted', 'rejected']);

export const TransactionSchema = z.object({
  id: z.string().min(1),
  uuid: z.uuid(),
  source: z.string().optional(),
  amount: z.number().int(),
  description: z.string(),
  privacyLevel: PrivacyLevelSchema,
  receiverId: z.string(),
  senderId: z.string(),
  status: TransactionStatusSchema,
  // Seeded payments carry an empty string instead of omitting the field.
  requestStatus: z.union([RequestStatusSchema, z.literal('')]).optional(),
  createdAt: z.string(),
  modifiedAt: z.string(),
});
export type Transaction = z.infer<typeof TransactionSchema>;

export const TransactionEnvelopeSchema = z.object({ transaction: TransactionSchema });

export const PageDataSchema = z.object({
  page: z.number(),
  limit: z.number(),
  hasNextPages: z.boolean(),
  totalPages: z.number(),
});

/** Feed items are enriched server-side with display names, likes and comments. */
export const TransactionFeedItemSchema = TransactionSchema.extend({
  senderName: z.string(),
  receiverName: z.string(),
  likes: z.array(z.unknown()),
  comments: z.array(z.unknown()),
});
export type TransactionFeedItem = z.infer<typeof TransactionFeedItemSchema>;

export const TransactionPageSchema = z.object({
  pageData: PageDataSchema,
  results: z.array(TransactionFeedItemSchema),
});

export type TransactionType = 'payment' | 'request';

/** Payload accepted by POST /transactions. `amount` is in whole dollars (the API multiplies by 100). */
export interface NewTransaction {
  transactionType: TransactionType;
  receiverId: string;
  amount: number;
  description: string;
  source?: string;
  privacyLevel?: z.infer<typeof PrivacyLevelSchema>;
}
