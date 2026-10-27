import { z } from 'zod';

export const BankAccountSchema = z.object({
  id: z.string().min(1),
  uuid: z.uuid(),
  userId: z.string(),
  bankName: z.string(),
  accountNumber: z.string(),
  routingNumber: z.string(),
  isDeleted: z.boolean(),
  createdAt: z.string(),
  modifiedAt: z.string(),
});
export type BankAccount = z.infer<typeof BankAccountSchema>;

export const BankAccountEnvelopeSchema = z.object({ account: BankAccountSchema });
export const BankAccountListSchema = z.object({ results: z.array(BankAccountSchema) });

export interface NewBankAccount {
  bankName: string;
  accountNumber: string;
  routingNumber: string;
}
