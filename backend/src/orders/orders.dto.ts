import { IsArray, IsInt, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsUUID()
  item_id: string;

  @IsInt()
  @Min(1)
  quantite: number;

  @IsOptional()
  options?: Record<string, string>;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateOrderDto {
  @IsUUID()
  table_id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional()
  @IsString()
  client_telephone?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
