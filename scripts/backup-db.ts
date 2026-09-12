import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

if (existsSync('.env.local')) {
  try {
    const { config } = require('dotenv')
    config({ path: '.env.local' })
  } catch {
    // dotenv not available, skip
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

console.log('Debug env:')
console.log('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'exists' : 'missing')
console.log('  SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'exists' : 'missing')
console.log('  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? 'exists' : 'missing')

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

  const filename = `backup-${timestamp}.json`
  const filepath = join(BACKUP_DIR, filename)
  writeFileSync(filepath, JSON.stringify(backup, null, 2))

  const sizeKB = Math.round(Buffer.byteLength(JSON.stringify(backup)) / 1024)
  console.log(`\n備份完成: backups/${filename} (${sizeKB} KB, ${totalRows} rows)`)

  return filepath
}

backup().catch((err) => {
  console.error('備份失敗:', err)
  process.exit(1)
})
