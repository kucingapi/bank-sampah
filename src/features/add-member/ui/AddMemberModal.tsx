import React, { useState } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { useCreateMember } from '@/entities/member/api/hooks';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddMemberModal({ isOpen, onClose, onSuccess }: AddMemberModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const createMember = useCreateMember()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setError('');
    try {
      await createMember.mutateAsync(name.trim());
      setName('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create member');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tambah Anggota">
      <form onSubmit={handleSubmit} className="space-y-8">
        {error && <div className="text-red-600 bg-red-50 p-4 rounded-lg text-sm">{error}</div>}
        
        <div className="space-y-2">
          <label className="micro-label text-[#1A1A1A]/50">Nama Lengkap</label>
          <input
            type="text"
            className="input-editorial"
            placeholder="Masukkan nama anggota..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={createMember.isPending}
            autoFocus
          />
        </div>
        
        <div className="flex justify-end gap-3 pt-6">
          <button
            type="button"
            onClick={onClose}
            className="btn-outline"
            disabled={createMember.isPending}
          >
            Batal
          </button>
          <button
            type="submit"
            className="btn-primary flex items-center gap-2"
            disabled={!name.trim() || createMember.isPending}
          >
            {createMember.isPending ? 'Menyimpan...' : 'Simpan Anggota'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
