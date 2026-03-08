import { useState } from 'react';
import { createCategory } from '@/entities/category/api/queries';

export function useAddCategory(onSuccess: () => void) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submitCategory = async (id: string, name: string, unit: string, defaultRate: number) => {
    setLoading(true);
    setError('');
    
    try {
      await createCategory(id, name, unit, defaultRate);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create category');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { submitCategory, loading, error };
}
