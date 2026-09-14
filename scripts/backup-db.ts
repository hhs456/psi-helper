import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

console.log('Environment check:')
console.log('  NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'not set')
console.log('  SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'not set')
console.log('  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? 'set' : 'not set')

if (!supabaseUrl || !supabaseKey) {
  console.error('錯誤: 缺少環境變數')
  console.error('請確認 .env.local 包含:')
  console.error('  NEXT_PUBLIC_SUPABASE_URL')
  console.error('  SUPABASE_SERVICE_ROLE_KEY (建議) 或 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const BACKUP_DIR = join(process.cwd(), 'backups')
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

const TABLES = ['suppliers', 'products', 'color_variants', 'stock_logs', 'sales_orders', 'sales_items'] as const

interface Product {
  id: string
  image_url: string | null
  [key: string]: unknown
}

async function downloadImages(products: Product[], imagesDir: string): Promise<number> {
  const imageUrls: string[] = []

  for (const product of products) {
    if (product.image_url) {
      imageUrls.push(product.image_url)
    }
  }

  if (imageUrls.length === 0) {
    console.log('  沒有圖片需要備份')
    return 0
  }

  await mkdir(imagesDir, { recursive: true })

  console.log(`  找到 ${imageUrls.length} 張圖片，開始下載...`)

  let downloaded = 0
  for (const url of imageUrls) {
    try {
      const match = url.match(/\/storage\/v1\/object\/public\/product-images\/(.+)$/)
      if (!match) {
        console.warn(`  ⚠ 無法解析圖片路徑: ${url}`)
        continue
      }
      const filename = match[1]
      const filepath = join(imagesDir, filename)

      if (existsSync(filepath)) {
        downloaded++
        continue
      }

      const response = await fetch(url)
      if (!response.ok) {
        console.warn(`  ⚠ 下載失敗: ${filename} (${response.status})`)
        continue
      }

      const buffer = Buffer.from(await response.arrayBuffer())
      await writeFile(filepath, buffer)
      downloaded++
    } catch (err) {
      console.warn(`  ⚠ 下載失敗: ${url}`)
    }
  }

  return downloaded
}

async function backup() {
  mkdirSync(BACKUP_DIR, { recursive: true })

  const backup: Record<string, unknown[]> = {}
  let totalRows = 0

  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select('*')
    if (error) {
      console.error(`✗ ${table}: ${error.message}`)
      throw error
    }
    backup[table] = data || []
    totalRows += data?.length || 0
    console.log(`✓ ${table}: ${data?.length || 0} rows`)
  }

  const imagesDir = join(BACKUP_DIR, 'images')
  console.log('\n備份圖片...')
  const downloadedImages = await downloadImages(backup['products'] as Product[], imagesDir)
  console.log(`✓ 圖片: ${downloadedImages} 張`)

  const filename = `backup-${timestamp}.json`
  const filepath = join(BACKUP_DIR, filename)
  writeFileSync(filepath, JSON.stringify(backup, null, 2))

  const sizeKB = Math.round(Buffer.byteLength(JSON.stringify(backup)) / 1024)
  console.log(`\n備份完成: backups/${filename} (${sizeKB} KB, ${totalRows} rows, ${downloadedImages} images)`)

  return filepath
}

backup().catch((err) => {
  console.error('備份失敗:', err)
  process.exit(1)
})
