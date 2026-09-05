import api from "./api";

export type Promotion = {
  id: number;
  code: string;
  title: string;
  description: string | null;
  discount_percent: number;
  max_discount_amount: number | null;
  minimum_order_amount: number | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  first_booking_only: boolean;
  usage_limit: number | null;
  usage_limit_per_customer: number | null;
  show_on_home: boolean;
  home_badge_text: string | null;
  created_at: string;
  updated_at: string;
  redemption_count?: number;
};

export type PromotionPayload = {
  code: string;
  title: string;
  description?: string | null;
  discount_percent: number;
  max_discount_amount?: number | null;
  minimum_order_amount?: number | null;
  is_active?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  first_booking_only?: boolean;
  usage_limit?: number | null;
  usage_limit_per_customer?: number | null;
  show_on_home?: boolean;
  home_badge_text?: string | null;
};

export async function getPromotions() {
  const response = await api.get<{
    promotions: Promotion[];
  }>("/api/promotions/admin");

  return response.data.promotions;
}

export async function getPromotion(id: number) {
  const response = await api.get<{
    promotion: Promotion;
  }>(`/api/promotions/admin/${id}`);

  return response.data.promotion;
}

export async function createPromotion(payload: PromotionPayload) {
  const response = await api.post<{
    message: string;
    promotion: Promotion;
  }>("/api/promotions/admin", payload);

  return response.data;
}

export async function updatePromotion(
  id: number,
  payload: Partial<PromotionPayload>,
) {
  const response = await api.put<{
    message: string;
    promotion: Promotion;
  }>(`/api/promotions/admin/${id}`, payload);

  return response.data;
}

export async function setPromotionStatus(id: number, isActive: boolean) {
  const response = await api.patch<{
    message: string;
    promotion: Promotion;
  }>(`/api/promotions/admin/${id}/status`, {
    is_active: isActive,
  });

  return response.data;
}
