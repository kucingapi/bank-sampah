import { seedBankSampah } from './seed'
import { getDb } from '@/shared/api'

let _seeded = false

/**
 * On first install, if the member table is empty (no real data),
 * automatically seed the database with initial data.
 */
export async function autoSeedIfEmpty() {
  if (_seeded) return
  try {
    const db = await getDb()
    const rows = await db.select<{ cnt: number }[]>('SELECT COUNT(*) as cnt FROM member')
    const count = rows?.[0]?.cnt ?? 0

    if (count === 0) {
      console.log('[auto-seed] Database is empty, seeding...')
      await seedBankSampah()
      _seeded = true
      console.log('[auto-seed] Seed complete.')
    }
  } catch (e) {
    console.error('[auto-seed] Failed:', e)
  }
}
