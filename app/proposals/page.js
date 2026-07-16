'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProposalsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div className="loading-spinner" />
    </div>
  );
}
