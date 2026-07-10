'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogout() {
  const router = useRouter();

  useEffect(() => {
    document.cookie = 'admin_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.push('/admin');
  }, [router]);

  return (
    <div style={{ textAlign: 'center', padding: '3rem' }}>
      <p>Logging out...</p>
    </div>
  );
}
