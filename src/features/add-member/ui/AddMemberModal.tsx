import React, { useState } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { useCreateMember } from '@/entities/member/api/hooks';
import { Input } from '@/shared/ui/ui/input';
import { Button } from '@/shared/ui/ui/button';
import { Loader2 } from 'lucide-react';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddMemberModal({ isOpen, onClose, onSuccess }: AddMemberModalProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const createMember = useCreateMember()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setError('');
    try {
      await createMember.mutateAsync({
        name: name.trim(),
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      setName('');
      setAddress('');
      setPhone('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal membuat anggota');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tambah Anggota">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="text-red-600 bg-red-50 p-4 rounded-lg text-sm">{error}</div>}

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Nama Lengkap</label>
            <Input
              type="text"
              placeholder="Masukkan nama anggota..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={createMember.isPending}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Alamat <span className="text-muted-foreground font-normal">(opsional)</span></label>
            <Input
              type="text"
              placeholder="Masukkan alamat..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={createMember.isPending}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">No. Telepon <span className="text-muted-foreground font-normal">(opsional)</span></label>
            <Input
              type="text"
              placeholder="Masukkan nomor telepon..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={createMember.isPending}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={createMember.isPending}
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={!name.trim() || createMember.isPending}
          >
            {createMember.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {createMember.isPending ? 'Menyimpan...' : 'Simpan Anggota'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
