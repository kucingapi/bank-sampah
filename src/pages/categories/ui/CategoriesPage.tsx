import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { listCategories, updateCategory, createCategory, deleteCategory } from '@/entities/category/api/queries';
import type { Category } from '@/entities/category/model/types';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/shared/ui/ui/table';
import { Button } from '@/shared/ui/ui/button';

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Schema Definition Interface State
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState<'kg' | 'pc'>('kg');
  const [newRate, setNewRate] = useState('');

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await listCategories();
      setCategories(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const generateSafeId = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const safeIdPreview = generateSafeId(newName);
  const isFormValid = newName.trim().length > 0 && parseFloat(newRate) > 0;

  const handleCreate = async () => {
    if (!isFormValid) return;
    try {
      // Check if category name already exists
      const existingCategory = categories.find(c => c.name.toLowerCase() === newName.trim().toLowerCase());
      if (existingCategory) {
        alert('Nama kategori sudah ada. Silakan gunakan nama yang berbeda.');
        return;
      }

      await createCategory(
        safeIdPreview,
        newName.trim(),
        newUnit,
        parseFloat(newRate)
      );
      setNewName('');
      setNewRate('');
      setNewUnit('kg');
      await fetchCategories();
    } catch (err) {
      console.error('Failed to create', err);
      // Check if it's a duplicate ID error
      const isDuplicateId = categories.some(c => c.id === safeIdPreview);
      if (isDuplicateId) {
        alert('ID kategori sudah digunakan. Gunakan nama yang berbeda untuk menghasilkan ID unik.');
      } else {
        alert('Gagal membuat kategori. Silakan coba lagi.');
      }
    }
  };

  const handleUpdate = async (id: string, field: keyof Category, value: any) => {
    try {
      // Optimistic update locally
      setCategories(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
      await updateCategory(id, { [field]: value });
    } catch (err) {
      console.error('Update failed', err);
      await fetchCategories(); // Revert
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus kategori ini secara permanen dari daftar master?')) return;
    try {
      await deleteCategory(id);
      await fetchCategories();
    } catch (err) {
      console.error('Failed to delete', err);
    }
  };

  return (
    <div className="p-12 max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500 ease-editorial">
      <header className="border-b border-[#1A1A1A]/10 pb-8 pt-2">
        <h1 className="page-title text-[#1A1A1A]">
          Skema <span className="text-[#1A1A1A]/40">Kategori</span>
        </h1>
        <p className="mt-2 text-[#1A1A1A]/50 text-sm">Pengaturan master material, harga dasar, dan satuan ukur.</p>
      </header>

      <div className="grid grid-cols-3 gap-12">
        
        {/* Schema Definition Interface */}
        <div className="col-span-1 border border-[#1A1A1A]/10 rounded-lg p-8 bg-[#F9F9F8] h-max relative">
          <h2 className="section-header mb-6">Tentukan Material Baru</h2>
          
          <div className="space-y-6">
            <div>
              <label className="micro-label text-[#1A1A1A]/50 mb-2 block">Nama Material</label>
              <input 
                type="text" 
                className="input-editorial w-full" 
                placeholder="Contoh: Kaleng Aluminium"
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
              <p className="text-xs text-[#1A1A1A]/30 mt-2 font-mono break-all">
                ID: {safeIdPreview || 'akan-dihasilkan-otomatis'}
              </p>
            </div>

            <div>
              <label className="micro-label text-[#1A1A1A]/50 mb-2 block">Satuan (Unit)</label>
              <div className="flex bg-[#1A1A1A]/5 p-1 rounded-full w-full">
                <button 
                  className={`flex-1 py-1.5 rounded-full text-xs font-medium transition-all ${newUnit === 'kg' ? 'bg-[#F9F9F8] shadow-sm text-[#1A1A1A]' : 'text-[#1A1A1A]/50 hover:text-[#1A1A1A]'}`}
                  onClick={() => setNewUnit('kg')}
                >
                  Kilogram (KG)
                </button>
                <button 
                  className={`flex-1 py-1.5 rounded-full text-xs font-medium transition-all ${newUnit === 'pc' ? 'bg-[#F9F9F8] shadow-sm text-[#1A1A1A]' : 'text-[#1A1A1A]/50 hover:text-[#1A1A1A]'}`}
                  onClick={() => setNewUnit('pc')}
                >
                  Pieces (PC)
                </button>
              </div>
            </div>

            <div>
              <label className="micro-label text-[#1A1A1A]/50 mb-2 block">Harga Dasar (Rp)</label>
              <input 
                type="number" 
                className="input-editorial w-full tabular-nums" 
                placeholder="0"
                min="0"
                value={newRate}
                onChange={e => setNewRate(e.target.value)}
              />
            </div>

            <Button 
              onClick={handleCreate}
              disabled={!isFormValid}
              className="w-full"
              data-icon="inline-start"
            >
              <Plus /> Tambahkan
            </Button>
          </div>
        </div>

        {/* Interactive Global Ledger */}
        <div className="col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="section-header">Daftar Material</h2>
            <span className="text-sm font-medium text-[#1A1A1A]/50">{categories.length} entri</span>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Satuan</TableHead>
                  <TableHead>Harga Dasar (Rp)</TableHead>
                  <TableHead className="text-center w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">Memuat ledger...</TableCell>
                  </TableRow>
                ) : categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">Belum ada kategori terdaftar.</TableCell>
                  </TableRow>
                ) : (
                  categories.map(cat => (
                    <TableRow key={cat.id}>
                      <TableCell>
                        <input 
                          type="text" 
                          className="w-full bg-background border border-input rounded px-3 py-2 font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors" 
                          value={cat.name}
                          onChange={e => setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, name: e.target.value } : c))}
                          onBlur={e => {
                            if (e.target.value.trim() !== '') {
                              handleUpdate(cat.id, 'name', e.target.value.trim());
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex bg-muted p-0.5 rounded-full w-fit">
                          <button 
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${cat.unit === 'kg' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => handleUpdate(cat.id, 'unit', 'kg')}
                          >
                            KG
                          </button>
                          <button 
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${cat.unit === 'pc' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => handleUpdate(cat.id, 'unit', 'pc')}
                          >
                            PC
                          </button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <input 
                          type="number" 
                          className="w-full bg-background border border-input rounded px-3 py-2 tabular-nums text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors" 
                          value={cat.default_rate}
                          onChange={e => setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, default_rate: parseFloat(e.target.value) || 0 } : c))}
                          onBlur={e => handleUpdate(cat.id, 'default_rate', parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <button 
                          onClick={() => handleDelete(cat.id)} 
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors rounded"
                          title="Hapus Kategori"
                        >
                          <X className="size-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-[#1A1A1A]/40 text-xs leading-relaxed max-w-xl">
            Perubahan Harga Dasar secara langsung (in-line edit) tidak mengubah riwayat data pada Sesi Aktif maupun Sesi Selesai. Harga baru akan diterapkan pada pembuatan Sesi berikutnya, atau dengan melakukan sinkronisasi harga manual pada menu Daftar Sesi.
          </p>
        </div>
      </div>
    </div>
  );
}
