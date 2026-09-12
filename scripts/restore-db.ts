import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { createInterface } from 'readline'

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

const supabase = createClient(supabaseUrl, supabaseKey)
const BACKUP_DIR = join(process.cwd(), 'backups')

const RESTORE_ORDER = ['suppliers', 'products', 'color_variants', 'stock_logs', 'sales_orders', 'sales_items'] as const
const DELETE_ORDER = [...RESTORE_ORDER].reverse()

type RestoreMode = 'clear' | 'merge'

interface BackupData {
  [table: string]: Record<string, unknown>[]
}

function listBackups(): string[] {
  if (!existsSync(BACKUP_DIR)) return []
  return readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
    .sort()
    .reverse()
}

function loadBackup(filename: string): BackupData {
  const filepath = join(BACKUP_DIR, filename)
  const content = readFileSync(filepath, 'utf-8')
  return JSON.parse(content)
}

async function clearTables(): Promise<void> {
  for (const table of DELETE_ORDER) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) throw error
    console.log(`  清空 ${table}`)
  }
}

async function restoreTable(table: string, rows: Record<string, unknown>[]): Promise<void> {
  if (rows.length === 0) {
    console.log(`  ${table}: 0 rows (skip)`)
    return
  }

  const BATCH_SIZE = 100
  let inserted = 0

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const { error } = await supabase.from(table).insert(batch)
    if (error) {
      console.error(`  ✗ ${table} batch ${i / BATCH_SIZE + 1}: ${error.message}`)
      throw error
    }
    inserted += batch.length
  }

  console.log(`  ${table}: ${inserted} rows`)
}

async function restore(filename: string, mode: RestoreMode): Promise<void> {
  console.log(`\n載入備份: ${filename}`)
  const data = loadBackup(filename)

  if (mode === 'clear') {
    console.log('\n清空現有資料...')
    await clearTables()
  }

  console.log('\n匯入資料...')
  for (const table of RESTORE_ORDER) {
    const rows = data[table] || []
    await restoreTable(table, rows)
  }

  console.log('\n還原完成!')
}

function parseArgs(): { mode: RestoreMode; file?: string } {
  const args = process.argv.slice(2)
  let mode: RestoreMode = 'clear'
  let file: string | undefined

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--merge') mode = 'merge'
    else if (args[i] === '--clear') mode = 'clear'
    else if (args[i] === '--file' && args[i + 1]) file = args[++i]
  }

  return { mode, file }
}

async function promptSelect(backupFiles: string[]): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const ask = (q: string) => new Promise<string>(resolve => rl.question(q, resolve))

  console.log('\n可用備份:')
  backupFiles.forEach((f, i) => console.log(`  ${i + 1}. ${f}`))

  const answer = await ask('\n選擇備份 (1-' + backupFiles.length + '): ')
  rl.close()

  const idx = parseInt(answer) - 1
  if (idx < 0 || idx >= backupFiles.length) {
    console.error('無效的選擇')
    process.exit(1)
  }
  return backupFiles[idx]
}

async function promptConfirm(mode: RestoreMode, filename: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const ask = (q: string) => new Promise<string>(resolve => rl.question(q, resolve))

  const warning = mode === 'clear'
    ? '\n警告: 清空模式會刪除所有現有資料!'
    : '\n注意: 合併模式可能產生 ID 衝突!'

  console.log(warning)
  console.log(`備份: ${filename}`)
  console.log(`模式: ${mode === 'clear' ? '清空後還原' : '合併還原'}`)

  const answer = await ask('\n確定要繼續嗎? (yes/no): ')
  rl.close()

  return answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y'
}

async function main() {
  const { mode, file } = parseArgs()

  const backupFiles = listBackups()
  if (backupFiles.length === 0) {
    console.error('找不到備份檔案，請先執行 npm run backup')
    process.exit(1)
  }

  const filename = file || await promptSelect(backupFiles)
  const confirmed = await promptConfirm(mode, filename)

  if (!confirmed) {
    console.log('已取消')
    return
  }

  await restore(filename, mode)
}

main().catch((err) => {
  console.error('還原失敗:', err)
  process.exit(1)
})
