import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export function useRequireAuth(): boolean {
  const { token } = useAuthStore();
  const router = useRouter();
  useEffect(() => {
    if (!token) {
      router.replace('/(tabs)/login');
    }
  }, [token]);
  return !!token;
}
