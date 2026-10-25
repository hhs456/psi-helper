import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomUUID } from 'crypto'
import WebSocket from 'ws'

// @ts-expect-error - WebSocket polyfill for Node.js 20
globalThis.WebSocket = WebSocket

config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('錯誤: 缺少環境變數')
  console.error('請確認 .env.local 包含:')
  console.error('  NEXT_PUBLIC_SUPABASE_URL')
  console.error('  SUPABASE_SERVICE_ROLE_KEY (建議) 或 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: { params: { events_per_second: 0 } },
})

const DELETE_ORDER = ['sales_items', 'sales_orders', 'stock_logs', 'color_variants', 'products', 'suppliers'] as const

function randomDate(daysAgo: number): Date {
  const now = new Date()
  const past = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
  return new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()))
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function clearTables(): Promise<void> {
  for (const table of DELETE_ORDER) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) throw error
  }
}

async function seed() {
  console.log('=== Demo 資料匯入 ===\n')

  console.log('清空現有資料...')
  await clearTables()
  console.log('  ✓', DELETE_ORDER.join(' / '))

  const suppliers = [
    { id: randomUUID(), name: '東京精品服飾', contact: '田中太郎', notes: '日本進口高品質服飾' },
    { id: randomUUID(), name: '大阪工坊', contact: '佐藤花子', notes: '手工訂製系列' },
    { id: randomUUID(), name: 'Seoul Style', contact: 'Kim Minjun', notes: '韓國流行服飾' },
    { id: randomUUID(), name: '上海絲綢', contact: '李明', notes: '絲質與高端面料' },
    { id: randomUUID(), name: 'Bangkok Threads', contact: 'Somchai', notes: '東南亞風格服飾' },
    { id: randomUUID(), name: '台北織品', contact: '王建民', notes: '台灣本土設計' },
    { id: randomUUID(), name: 'Milano Fashion', contact: 'Marco Rossi', notes: '義大利精品' },
  ]

  process.stdout.write('\n匯入供應商...')
  const { error: supErr } = await supabase.from('suppliers').insert(suppliers)
  if (supErr) throw supErr
  console.log(` ✓ ${suppliers.length} 個`)

  const products = [
    { id: randomUUID(), supplier_id: suppliers[0].id, name: '經典羊毛大衣', code: 'JP-001', image_url: 'https://images.unsplash.com/photo-1539533113208-43e0d4d7a5b4?w=800' },
    { id: randomUUID(), supplier_id: suppliers[0].id, name: '修身西裝外套', code: 'JP-002', image_url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800' },
    { id: randomUUID(), supplier_id: suppliers[0].id, name: '高領毛衣', code: 'JP-003', image_url: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800' },
    { id: randomUUID(), supplier_id: suppliers[1].id, name: '手工刺繡襯衫', code: 'OS-001', image_url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800' },
    { id: randomUUID(), supplier_id: suppliers[1].id, name: '寬褲休閒褲', code: 'OS-002', image_url: 'https://images.unsplash.com/photo-1624378439575-d4e5d3a2b8a5?w=800' },
    { id: randomUUID(), supplier_id: suppliers[2].id, name: '韓版oversize T恤', code: 'KR-001', image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800' },
    { id: randomUUID(), supplier_id: suppliers[2].id, name: '韓系百褶裙', code: 'KR-002', image_url: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800' },
    { id: randomUUID(), supplier_id: suppliers[2].id, name: '針織開衫', code: 'KR-003', image_url: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800' },
    { id: randomUUID(), supplier_id: suppliers[3].id, name: '絲質洋裝', code: 'SH-001', image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800' },
    { id: randomUUID(), supplier_id: suppliers[3].id, name: '真絲襯衫', code: 'SH-002', image_url: 'https://images.unsplash.com/photo-1564257577-2d3ee8740e33?w=800' },
    { id: randomUUID(), supplier_id: suppliers[4].id, name: '泰國風印花上衣', code: 'BK-001', image_url: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800' },
    { id: randomUUID(), supplier_id: suppliers[4].id, name: '亞麻休閒褲', code: 'BK-002', image_url: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800' },
    { id: randomUUID(), supplier_id: suppliers[5].id, name: '台灣設計T恤', code: 'TP-001', image_url: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800' },
    { id: randomUUID(), supplier_id: suppliers[5].id, name: '牛仔外套', code: 'TP-002', image_url: 'https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=800' },
    { id: randomUUID(), supplier_id: suppliers[5].id, name: '運動短褲', code: 'TP-003', image_url: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800' },
    { id: randomUUID(), supplier_id: suppliers[6].id, name: '義大利皮革外套', code: 'MI-001', image_url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800' },
    { id: randomUUID(), supplier_id: suppliers[6].id, name: '精品圍巾', code: 'MI-002', image_url: 'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=800' },
    { id: randomUUID(), supplier_id: suppliers[6].id, name: '絲質領帶', code: 'MI-003', image_url: 'https://images.unsplash.com/photo-1598032895397-b9472444bf93?w=800' },
  ]

  process.stdout.write('匯入商品...')
  const { error: prodErr } = await supabase.from('products').insert(products)
  if (prodErr) throw prodErr
  console.log(` ✓ ${products.length} 個`)

  const colors = ['黑色', '白色', '灰色', '海軍藍', '酒紅', '卡其', '米色', '深綠']
  const clothingSizes = ['S', 'M', 'L', 'XL']
  const pantsSizes = ['28', '30', '32', '34']

  const colorVariants: { id: string; product_id: string; color: string; size: string; purchased: number; defective: number; sold: number }[] = []

  for (const product of products) {
    const isPants = product.name.includes('褲')
    const sizes = isPants ? pantsSizes : clothingSizes
    const numColors = randomInt(2, 4)
    const selectedColors = colors.sort(() => Math.random() - 0.5).slice(0, numColors)

    for (const color of selectedColors) {
      const numSizes = randomInt(2, 3)
      const selectedSizes = sizes.sort(() => Math.random() - 0.5).slice(0, numSizes)

      for (const size of selectedSizes) {
        const purchased = randomInt(5, 20)
        const defective = randomInt(0, 2)
        const sold = randomInt(Math.floor(purchased * 0.2), Math.floor(purchased * 0.7))
        colorVariants.push({
          id: randomUUID(),
          product_id: product.id,
          color,
          size,
          purchased,
          defective,
          sold,
        })
      }
    }
  }

  process.stdout.write('匯入顏色/尺寸款式...')
  const { error: cvErr } = await supabase.from('color_variants').insert(colorVariants)
  if (cvErr) throw cvErr
  console.log(` ✓ ${colorVariants.length} 個`)

  const stockLogs: { id: string; color_variant_id: string; type: 'purchase' | 'defect' | 'sale'; quantity: number; reference: string | null; created_at: string }[] = []

  for (const cv of colorVariants) {
    const numLogs = randomInt(3, 6)
    for (let i = 0; i < numLogs; i++) {
      const type = pickRandom(['purchase', 'defect', 'sale'] as const)
      const quantity = type === 'purchase' ? randomInt(3, 10) : type === 'defect' ? randomInt(1, 2) : randomInt(1, 3)
      const date = randomDate(90)
      const reference = type === 'purchase' ? `PO-${randomInt(1000, 9999)}` : type === 'sale' ? `SO-${randomInt(1000, 9999)}` : `DEF-${randomInt(100, 999)}`

      stockLogs.push({
        id: randomUUID(),
        color_variant_id: cv.id,
        type,
        quantity,
        reference,
        created_at: date.toISOString(),
      })
    }
  }

  process.stdout.write('匯入庫存異動記錄...')
  const BATCH_SIZE = 100
  for (let i = 0; i < stockLogs.length; i += BATCH_SIZE) {
    const batch = stockLogs.slice(i, i + BATCH_SIZE)
    const { error } = await supabase.from('stock_logs').insert(batch)
    if (error) throw error
  }
  console.log(` ✓ ${stockLogs.length} 筆`)

  const customerNames = ['陳小明', '林美玲', '王大華', '張雅婷', '李志強', '黃淑芬', '周建宏', '吳佳穎', '鄭文傑', '蔡宜靜', '劉家豪', '許美惠']
  const sources: ('shopee' | 'manual' | 'other')[] = ['shopee', 'manual', 'other']

  const salesOrders: { id: string; client_code: string; customer_name: string; source: string; shopee_order_id: string | null; order_date: string; total_amount: number; status: string; notes: string | null }[] = []
  const salesItems: { id: string; sales_order_id: string; color_variant_id: string; quantity: number; unit_price: number; amount: number }[] = []

  const numOrders = randomInt(10, 15)
  for (let i = 0; i < numOrders; i++) {
    const orderId = randomUUID()
    const source = pickRandom(sources)
    const orderDate = randomDate(60)
    const status = pickRandom(['pending', 'completed', 'completed', 'completed'] as const)
    const customerName = pickRandom(customerNames)
    const clientCode = `C${String(1000 + i).padStart(4, '0')}`

    const numItems = randomInt(1, 3)
    let totalAmount = 0
    const orderItems: typeof salesItems = []

    for (let j = 0; j < numItems; j++) {
      const cv = pickRandom(colorVariants)
      const quantity = randomInt(1, 3)
      const unitPrice = randomInt(299, 2990)
      const amount = quantity * unitPrice
      totalAmount += amount

      orderItems.push({
        id: randomUUID(),
        sales_order_id: orderId,
        color_variant_id: cv.id,
        quantity,
        unit_price: unitPrice,
        amount,
      })
    }

    salesOrders.push({
      id: orderId,
      client_code: clientCode,
      customer_name: customerName,
      source,
      shopee_order_id: source === 'shopee' ? `SP${randomInt(100000000, 999999999)}` : null,
      order_date: orderDate.toISOString().split('T')[0],
      total_amount: totalAmount,
      status,
      notes: status === 'completed' ? null : '待處理',
    })

    salesItems.push(...orderItems)
  }

  process.stdout.write('匯入銷售訂單...')
  const { error: soErr } = await supabase.from('sales_orders').insert(salesOrders)
  if (soErr) throw soErr
  console.log(` ✓ ${salesOrders.length} 筆`)

  process.stdout.write('                   ')
  const { error: siErr } = await supabase.from('sales_items').insert(salesItems)
  if (siErr) throw siErr
  console.log(` ✓ ${salesItems.length} 筆明細`)

  console.log('\n=== 匯入完成 ===')
}

seed().catch((err) => {
  console.error('匯入失敗:', err)
  process.exit(1)
})
