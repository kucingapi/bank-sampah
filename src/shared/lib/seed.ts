import { getDb } from '@/shared/api'

interface CategorySeed {
  id: string
  name: string
  unit: string
  default_rate: number
  archived?: boolean
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

// Real member data: [name, address]
const REAL_MEMBERS: [string, string][] = [
  ['IBU HJ.YURLI', 'MULIA IX/12'],
  ['IBU LINAWATI', 'INDAH V/100'],
  ['IBU SISCA', 'MULIA XI/33'],
  ['IBU INDRI', 'INDAH V/114'],
  ['PAK RUDY KWARIA', 'MULIA IX/6'],
  ['IBU LILY/BAMBANG', 'INDAH IX/34'],
  ['IBU SILVIA', 'MULIA XII/57'],
  ['IBU TUTY', 'MULIA XII/21'],
  ['IBU SILVI', 'MULIA XII/55'],
  ['IBU INA', 'MULIA IX/32'],
  ['PAK ERWIN', 'MULIA IV/2'],
  ['PAK RIZAL', 'MULIA RAYA/42'],
  ['PAK YONGKI', 'MULIA XII/55'],
  ['PAK DENI ROCHMAN', 'MULIA RAYA/4'],
  ['IBU ANA', 'MULIA XII/29'],
  ['IBU MIL', 'SENTOSA I/9'],
  ['KANG ASEP', 'MULIA IX-2'],
  ['PAK FAJAR', 'MULIA V/79'],
  ['IBU SUNAR', 'MULIA IX/30'],
  ['IBU SUSI', 'MULIA IX/51'],
  ['PAK ARYO', 'MULIA RAYA/7'],
  ['IBU YANTI', 'MULIA XII/1'],
  ['PAK SUWANDI', 'INDAH III/11A'],
  ['IBU RATNA', 'INDAH V/126'],
  ['IBU YULIA', 'MULIA XII-14'],
  ['IBU LEONI', 'INDAH VIII'],
  ['PAK TJIPTO', 'INDAH IX/59'],
  ['IBU ICHA', 'INDAH V/133'],
  ['PAK NIRWANSYAH', 'MULIA XII-16'],
  ['IBU AIDA', 'MULIA XII-19'],
  ['PAK GUNAWAN', 'MULIA I'],
  ['PAK BENNY/SANTI', 'MULIA IX/77'],
  ['PAK RULIANSYAH', 'INDAH V/101'],
  ['IBU FEBRY', 'MULIA I/24'],
  ['PAK THOMAS', 'MULIA II/7'],
  ['IBU RATNA', 'INDAH IV/99'],
  ['IBU WIWI', 'MULIA XII/9'],
  ['IBU SONY BACHTIAR', 'MULIA XI/4'],
  ['IBU YULI', 'MULIA XI/20'],
  ['IBU KUSTINA/TIPLUK', 'MULIA UTARA'],
  ['IBU MILA', 'MULIA IX/4'],
  ['IBU DEWI', 'PERMAI IV/26'],
  ['KANG YADI', 'WAAS'],
  ['PAK CECEP', 'MULIA IX/2'],
  ['IBU YANTI', 'MULIA RAYA/50'],
  ['PAK HENDRY', 'MULIA RAYA/26'],
  ['IBU ERNIWATI', 'INDAH V/135'],
  ['PAK RAHMAT', 'MULIA IX/2'],
  ['PAK DEDI BISRI', 'SENTOSA I/8A'],
  ['IBU FEFEI', 'MULIA RAYA/24'],
  ['PAK ARIS', 'MULIA XII/61'],
  ['IBU MELSY', 'MULIA XII/75'],
  ['IBU MELINDA', 'MULIA IV/22'],
  ['KEL.MENGGER', 'TERS.BATUNUNGGAL'],
  ['IBU ELLY', 'MULIA XII/51'],
  ['PAK NUH', 'MULIA XII/50'],
  ['PAK DEDI HERMAWAN', 'MULIA IX/26'],
  ['IBU DEBBY S', 'MULIA XI/27'],
  ['IBU WINA', 'MULIA XIII/48'],
  ['IBU AYI', 'MULIA XII/38'],
  ['IBU PUTRI', 'MULIA V/21'],
  ['IBU SANTI SENTOSA', 'SENTOSA'],
  ['IBU LILY', 'MULIA III/20'],
  ['IBU MIRA', 'SALEDRI 22'],
  ['IBU YULI', 'MULIA XI/20'],
  ['BU IDA', 'MULIA XI/34'],
  ['IBU SUSI/DENDIE', 'INDAH V/119'],
  ['IBU FRIDA', 'MOLEK II/33'],
  ['BPR PUNDI KENCANA', ''],
  ['PAK FAUZI', 'MULIA IX/2'],
  ['IBU SUSANA', 'PARAKAN WAAS 2'],
  ['PAK HENGKY', 'INDAH IX/43'],
  ['PAK BUDI/IBU NIA', 'MULIA RAYA/6'],
  ['PAK ASEP', 'RUKO INDAH RAYA/179'],
  ['IBU PAULA', 'PARAKAN ASRI 19'],
  ['PAK RANDI', 'JL.LOGAM'],
  ['IBU LENI', 'LINGGA WISESA/21'],
  ['IBU HANA', 'PERMAI II/69'],
  ['PAK RONNY', 'MULIA XII/17'],
  ['PAK GUNTUR/IBU LILY', 'MULIA RAYA/79'],
  ['IBU RATNA', 'INDAH V/114'],
  ['PAK YADI', 'MULIA XI/12'],
  ['PAK PAULUS', 'SOEKARNO HATTA/698'],
  ['PAK FERDY', ''],
  ['IBU NADIA', 'MULIA XI/14'],
  ['IBU VITASYA', 'MULIA XI/19'],
  ['PAK ANDRO', 'MULIA IX/16'],
  ['IBU YUNNY', 'MULIA IV/36'],
  ['IBU YANTI', 'MULIA XII/11'],
  ['IBU LIE SUSILAWATI', 'MULIA IX/53'],
  ['PAK HARI LIEM', 'MULIA XI/42'],
  ['IBU HUSNUL/YUNITA', 'INDAH V/132'],
  ['IBU ROSE', 'MULIA XI/39'],
  ['IBU RINA', 'MULIA XII/56'],
  ['IBU CHENCHEN', 'MULIA RAYA/9'],
  ['IBU FARIDA', 'MULIA XIII/53'],
  ['IBU LINDA', 'MULIA II/27'],
  ['PAK HANDY', 'MULIA V/55A'],
  ['PAK IYUS', 'INDAH V/129'],
  ['PAK SYARIPUDIN (BIC)', 'BIC'],
  ['IBU AYU', 'MULIA XII/2'],
  ['KRING BARTO', 'PARAKAN ASRI V/4'],
  ['IBU DIANA', 'ABADI IV/5'],
  ['IBU AYI', 'MULIA XI/15'],
  ['PAK THOMAS S', 'MULIA XIII/54'],
  ['PAK ALI', 'SENTOSA I/38'],
  ['WHEELS-RIAN', ''],
  ['PAK ASO', 'MULIA V/26'],
  ['IBU KOSIM', 'MULIA RAYA/2'],
  ['PT.SINERGY DIAGNOSTIC', 'PERMAI VI/24'],
  ['PAK YONGKI', 'ALOY 3 SELATAN'],
  ['PAK YANPI', 'MULIA XIII/31'],
  ['BU MUJI LESTARI', 'MULIA XII/4'],
  ['BSM', 'MULIA IX/2'],
  ['IBU FARIDA', 'MULIA XIII/40'],
  ['IBU VERA', 'INDAH IX/38'],
  ['IBU ELLY SISCA', 'BN SARI NO.1'],
  ['IBU TARI', 'MULIA XIII/52'],
]

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
      'INSERT OR REPLACE INTO category (id, name, unit, default_rate, status, archived) VALUES (?, ?, ?, ?, ?, ?)',
      [cat.id, cat.name, cat.unit, cat.default_rate, 'active', cat.archived ? 1 : 0]
    )
  }
  console.log(`✅ ${CATEGORIES.length} categories seeded`)

  // ── 2. Insert real members ──
  const memberIds: number[] = []
  const joinDate = '2025-01-01'
  for (const [name, address] of REAL_MEMBERS) {
    const phone = `08${Math.floor(rand() * 900000000 + 100000000).toString()}`
    const result = await db.execute(
      'INSERT INTO member (name, address, phone, join_date) VALUES (?, ?, ?, ?)',
      [name, address || null, phone, joinDate]
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

  // ── 5. Create deposits for all members ──
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
