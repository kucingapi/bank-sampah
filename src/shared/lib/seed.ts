import { getDb } from '@/shared/api'

interface CategorySeed {
  id: string
  name: string
  unit: string
  default_rate: number
}

const CATEGORIES: CategorySeed[] = [
  { id: 'c1', name: 'Kardus', unit: 'kg', default_rate: 2000 },
  { id: 'c2', name: 'Plastik', unit: 'kg', default_rate: 3000 },
  { id: 'c3', name: 'Kaca', unit: 'kg', default_rate: 1500 },
  { id: 'c4', name: 'Logam', unit: 'kg', default_rate: 5000 },
  { id: 'c5', name: 'Kaleng', unit: 'kg', default_rate: 4000 },
  { id: 'c6', name: 'Kertas HVS', unit: 'kg', default_rate: 2500 },
  { id: 'c7', name: 'Botol Plastik', unit: 'kg', default_rate: 3500 },
  { id: 'c8', name: 'Ember', unit: 'kg', default_rate: 2000 },
  { id: 'c9', name: 'Gelas Plastik', unit: 'kg', default_rate: 1500 },
  { id: 'c10', name: 'Jerigen', unit: 'kg', default_rate: 2500 },
  { id: 'c11', name: 'Tembaga', unit: 'kg', default_rate: 45000 },
  { id: 'c12', name: 'Aluminium', unit: 'kg', default_rate: 25000 },
  { id: 'c13', name: 'Besi', unit: 'kg', default_rate: 4000 },
  { id: 'c14', name: 'Kabel', unit: 'kg', default_rate: 8000 },
  { id: 'c15', name: 'Karton', unit: 'kg', default_rate: 1800 },
  { id: 'c16', name: 'Karung', unit: 'pc', default_rate: 5000 },
  { id: 'c17', name: 'Ban Bekas', unit: 'pc', default_rate: 10000 },
  { id: 'c18', name: 'Aki', unit: 'pc', default_rate: 30000 },
  { id: 'c19', name: 'Elektronik', unit: 'kg', default_rate: 6000 },
  { id: 'c20', name: 'Organik', unit: 'kg', default_rate: 500 },
]

const FIRST_NAMES = [
  'Ahmad', 'Budi', 'Citra', 'Dewi', 'Eko', 'Fajar', 'Gita', 'Hendra', 'Indah', 'Joko',
  'Kartini', 'Lukman', 'Maya', 'Nana', 'Oscar', 'Putri', 'Qori', 'Rina', 'Surya', 'Tati',
  'Umar', 'Vina', 'Wawan', 'Xena', 'Yanti', 'Zainal', 'Adi', 'Bayu', 'Caca', 'Dian',
  'Erna', 'Farhan', 'Gani', 'Hana', 'Irfan', 'Jasmine', 'Krisna', 'Lina', 'Mamat', 'Nita',
  'Opi', 'Purnama', 'Rahma', 'Sari', 'Tono', 'Umi', 'Vicky', 'Winda', 'Yoga', 'Zahra',
]

const LAST_NAMES = [
  'Saputra', 'Wati', 'Hidayat', 'Rahayu', 'Pratama', 'Sari', 'Wibowo', 'Kusuma', 'Purnama', 'Setiawan',
  'Hartono', 'Susanti', 'Wahyudi', 'Lestari', 'Nugroho', 'Permata', 'Firmansyah', 'Astuti', 'Gunawan', 'Maulana',
  'Siregar', 'Nasution', 'Harahap', 'Simanjuntak', 'Pangaribuan', 'Sihombing', 'Tampubolon', 'Sinaga', 'Marbun', 'Hutapea',
]

const VILLAGES = [
  'Desa Sukamaju', 'Desa Sukamakmur', 'Desa Sukajadi', 'Desa Sukasari', 'Desa Sukadamai',
  'Desa Sukaraja', 'Desa Sukabumi', 'Desa Sukapura', 'Desa Sukamulya', 'Desa Sukaresmi',
]

const RT_RW = ['001/001', '001/002', '002/001', '002/002', '003/001', '003/002', '004/001', '004/002', '005/001', '005/002']

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

export async function seedBankSampah() {
  const db = await getDb()
  const rand = seededRandom(42)

  // ── 1. Insert 20 categories ──
  for (const cat of CATEGORIES) {
    await db.execute(
      'INSERT OR REPLACE INTO category (id, name, unit, default_rate, status) VALUES (?, ?, ?, ?, ?)',
      [cat.id, cat.name, cat.unit, cat.default_rate, 'active']
    )
  }
  console.log(`✅ ${CATEGORIES.length} categories seeded`)

  // ── 2. Insert 170 members ──
  const memberNames: string[] = []
  const nameSet = new Set<string>()
  let attempt = 0
  while (memberNames.length < 170 && attempt < 500) {
    const first = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)]
    const last = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]
    const name = `${first} ${last}`
    if (!nameSet.has(name)) {
      nameSet.add(name)
      memberNames.push(name)
    }
    attempt++
  }

  // Fill remaining if needed with numbered suffixes
  let idx = 0
  while (memberNames.length < 170) {
    memberNames.push(`Anggota ${++idx}`)
  }

  const memberIds: number[] = []
  for (const name of memberNames) {
    const village = VILLAGES[Math.floor(rand() * VILLAGES.length)]
    const rtRw = RT_RW[Math.floor(rand() * RT_RW.length)]
    const joinDate = '2025-01-01'
    const result = await db.execute(
      'INSERT INTO member (name, address, phone, join_date) VALUES (?, ?, ?, ?)',
      [name, `${village} RT ${rtRw}`, `08${Math.floor(rand() * 900000000 + 100000000).toString()}`, joinDate]
    )
    if (result.lastInsertId) memberIds.push(Number(result.lastInsertId))
  }
  console.log(`✅ ${memberIds.length} members seeded`)

  // ── 3. Create 1 event on today's date ──
  const today = new Date()
  const dateStr = today.toISOString().split('T')[0]
  const eventId = `evt-${dateStr}`
  await db.execute(
    'INSERT OR REPLACE INTO event (id, event_date, status) VALUES (?, ?, ?)',
    [eventId, dateStr, 'active']
  )
  console.log(`✅ Event created: ${eventId}`)

  // ── 4. Create event_rate for all 20 categories ──
  for (const cat of CATEGORIES) {
    const activeRate = cat.default_rate * 0.90
    const outboundRate = cat.default_rate
    await db.execute(
      'INSERT OR REPLACE INTO event_rate (event_id, category_id, active_rate, outbound_rate, is_active) VALUES (?, ?, ?, ?, ?)',
      [eventId, cat.id, activeRate, outboundRate, 1]
    )
  }
  console.log(`✅ ${CATEGORIES.length} event_rates seeded`)

  // ── 5. Create deposits for all 170 members ──
  const catIds = CATEGORIES.map(c => c.id)
  let depositCount = 0

  for (const memberId of memberIds) {
    // Each member deposits 1-5 random categories
    const numCategories = Math.floor(rand() * 5) + 1
    const shuffled = [...catIds].sort(() => rand() - 0.5)
    const selectedCats = shuffled.slice(0, numCategories)

    let totalPayout = 0
    const depositId = `dep-${eventId}-${memberId}`

    // Create deposit
    const time = `${dateStr}T${String(7 + Math.floor(rand() * 8)).padStart(2, '0')}:${String(Math.floor(rand() * 60)).padStart(2, '0')}:00`
    await db.execute(
      'INSERT OR REPLACE INTO deposit (id, event_id, member_id, time, total_payout) VALUES (?, ?, ?, ?, ?)',
      [depositId, eventId, memberId, time, 0] // temporary 0, will update after items
    )

    // Create deposit items
    for (const catId of selectedCats) {
      const cat = CATEGORIES.find(c => c.id === catId)!
      let weight: number
      if (cat.unit === 'pc') {
        weight = Math.floor(rand() * 20) + 1
      } else {
        weight = parseFloat((rand() * 15 + 0.5).toFixed(2))
      }
      const rate = cat.default_rate * 0.90
      totalPayout += weight * rate

      await db.execute(
        'INSERT OR REPLACE INTO deposit_item (deposit_id, category_id, weight) VALUES (?, ?, ?)',
        [depositId, catId, weight]
      )
    }

    // Update total_payout
    await db.execute(
      'UPDATE deposit SET total_payout = ? WHERE id = ?',
      [parseFloat(totalPayout.toFixed(2)), depositId]
    )

    depositCount++
  }
  console.log(`✅ ${depositCount} deposits seeded`)

  console.log('\n🎉 Seed complete! Summary:')
  console.log(`   Categories : ${CATEGORIES.length}`)
  console.log(`   Members    : ${memberIds.length}`)
  console.log(`   Event      : 1 (${dateStr})`)
  console.log(`   Deposits   : ${depositCount}`)
}
