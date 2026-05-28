import { IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export const PAYMENT_METHODS = ['wave', 'orange_money', 'mtn_momo', 'moov_money', 'carte', 'especes'] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number];

export class RecordPaymentDto {
  @IsUUID()
  order_id: string;

  @IsIn(PAYMENT_METHODS as unknown as string[])
  methode: PaymentMethod;

  @IsInt()
  @Min(1)
  montant_fcfa: number;

  @IsOptional()
  @IsString()
  client_telephone?: string;
}
