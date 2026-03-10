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
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="text-red-600 bg-red-50 p-4 rounded-lg text-sm">{error}</div>}
        
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Nama Lengkap
          </label>
          <Input
            type="text"
            placeholder="Masukkan nama anggota..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={createMember.isPending}
            autoFocus
          />
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
