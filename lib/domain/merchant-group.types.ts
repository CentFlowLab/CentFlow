export type MerchantGroup = {
  id: string;
  name: string;
  aliases: string[];
  category?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MerchantGroupWithStats = MerchantGroup & {
  movementCount: number;
  totalAmount: number;
  lastDate?: string;
  lastAmount?: number;
};

export type CreateMerchantGroupInput = {
  name: string;
  aliases: string[];
  category?: string | null;
  movementIds?: string[];
};

export type UpdateMerchantGroupInput = {
  name?: string;
  aliases?: string[];
  category?: string | null;
};
