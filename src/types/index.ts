export interface Supplier {
  id: string
  name: string
  contact: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  supplier_id: string
  name: string
  code: string | null
  image_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
  supplier?: Supplier
}

export interface ColorVariant {
  id: string
  product_id: string
  color: string
  size: string | null
  purchased: number
  defective: number
  sold: number
  created_at: string
  updated_at: string
  product?: Product
}

export type StockLogType = 'purchase' | 'defect' | 'sale'

export interface StockLog {
  id: string
  color_variant_id: string
  type: StockLogType
  quantity: number
  reference: string | null
  created_at: string
  color_variant?: ColorVariant & { product?: Product }
}

export interface SalesOrder {
  id: string
  client_code: string
  customer_name: string | null
  source: 'shopee' | 'manual' | 'other'
  shopee_order_id: string | null
  order_date: string
  total_amount: number
  status: 'pending' | 'completed' | 'cancelled'
  notes: string | null
  created_at: string
  updated_at: string
  sales_items?: SalesItem[]
}

export interface SalesItem {
  id: string
  sales_order_id: string
  color_variant_id: string
  quantity: number
  unit_price: number
  amount: number
  color_variant?: ColorVariant & { product?: Product }
}

export interface InventorySummary {
  product_id: string
  product_name: string
  product_code: string | null
  supplier_name: string
  image_url: string | null
  variants: {
    color: string
    size: string | null
    purchased: number
    defective: number
    sold: number
    available: number
  }[]
}
