import { useEffect } from 'react';
import { useRouter } from 'expo-router';

// 登录页已迁移至 (tabs)/login，保留此文件做兼容重定向
export default function LegacyLoginRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/(tabs)/login');
  }, []);
  return null;
}
