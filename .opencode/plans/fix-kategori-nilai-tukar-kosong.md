# Fix: Kategori Nilai Tukar Kosong Pada Event Details

## Masalah

Kategori nilai tukar sering kosong di halaman Event Details padahal kategori sudah ada di database.

## Root Cause

### Bug 1: State `ratesLoaded` tidak di-reset saat pindah event (PENYEBAB UTAMA)

`EventDetailsPage.tsx:324-348` — `useEffect` yang memuat data rates memiliki guard `ratesLoaded` yang tetap `true` dari event sebelumnya. Saat navigasi event-ke-event tanpa keluar halaman, React **tidak me-remount** komponen karena tidak ada `key` prop di `src/app/index.tsx:37`. Akibatnya `localRates`, `savedRates`, dan `categories` tetap berisi data event lama, dan `useEffect` langsung return karena `ratesLoaded === true`.

### Bug 2: `syncEventRates` gagal tanpa notifikasi

`queries.ts:68-72` — Jika `syncEventRates` gagal saat membuat event baru, event tetap dibuat tanpa rates. Error hanya di-`console.warn`, tidak ada feedback ke user.

## Perubahan yang Diperlukan

### 1. `src/app/index.tsx` (line 37-38) — Force remount dengan `key` prop

**Sebelum:**
```tsx
case 'event-details': return activeEventId ? <EventDetailsPage eventId={activeEventId} /> : ...;
case 'event-entry': return activeEventId ? <EventEntryPage eventId={activeEventId} depositId={activeDepositId} /> : ...;
```

**Sesudah:**
```tsx
case 'event-details': return activeEventId ? <EventDetailsPage key={activeEventId} eventId={activeEventId} /> : ...;
case 'event-entry': return activeEventId ? <EventEntryPage key={activeEventId} eventId={activeEventId} depositId={activeDepositId} /> : ...;
```

### 2. `src/pages/event-details/ui/EventDetailsPage.tsx` (line 324-348) — Reset state saat eventId berubah

Tambahkan `useEffect` baru yang mereset semua state rates saat `eventId` berubah (safety net):

```tsx
useEffect(() => {
  setRatesLoaded(false)
  setLocalRates({})
  setSavedRates({})
  setCategories({})
  setIsEditingRates(false)
}, [eventId])
```

### 3. `src/entities/event/api/queries.ts` (line 60-75) — Error handling lebih baik di `createEvent`

**Sebelum:**
```tsx
try {
  await syncEventRates(id);
} catch (err) {
  console.warn('syncEventRates failed, event created without rates:', err);
}
```

**Sesudah:**
```tsx
try {
  await syncEventRates(id);
} catch (err) {
  console.error('syncEventRates failed:', err);
  await db.execute('DELETE FROM event WHERE id = $1', [id]);
  throw new Error('Gagal membuat sesi: tidak dapat menyinkronkan kategori nilai tukar. Pastikan kategori sudah dibuat terlebih dahulu.');
}
```

### 4. `src/pages/event-details/ui/EventDetailsPage.tsx` (line 545-611) — Empty state saat rates kosong

Setelah `{ratesData?.map(...)}`, tambahkan empty state:

```tsx
{ratesData && ratesData.length === 0 && (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <DollarSign className="size-8 text-muted-foreground mb-3" />
    <p className="text-sm font-medium text-foreground">Belum ada kategori nilai tukar</p>
    <p className="text-xs text-muted-foreground mt-1 mb-4">
      Tambahkan kategori di halaman Skema Kategori, lalu sinkronisasi harga dasar.
    </p>
    <Button
      variant="outline"
      size="sm"
      onClick={handleSyncRates}
      disabled={syncRates.isPending}
    >
      <RefreshCw className={syncRates.isPending ? "animate-spin size-3 mr-2" : "size-3 mr-2"} />
      Sinkronisasi Sekarang
    </Button>
  </div>
)}
```

Juga ubah tombol "Sinkronisasi Harga Dasar" agar bisa diklik meskipun tidak dalam mode edit (saat rates kosong).

## File yang Diubah

| File | Perubahan |
|---|---|
| `src/app/index.tsx` | Tambah `key={activeEventId}` pada EventDetailsPage dan EventEntryPage |
| `src/pages/event-details/ui/EventDetailsPage.tsx` | Reset state saat eventId berubah + empty state UI |
| `src/entities/event/api/queries.ts` | Throw error jika syncEventRates gagal di createEvent |

## Verifikasi

1. `npm run lint` — pastikan tidak ada lint error
2. `npm run typecheck` — pastikan tidak ada type error
3. Manual test: buka event A, lalu navigasi ke event B dari sidebar tanpa keluar halaman — kategori harus muncul dengan benar
4. Manual test: buat event baru tanpa kategori di database — harus muncul error yang jelas
