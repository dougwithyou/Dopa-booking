'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { btnSecondary } from './lib/ui';

export default function SignOutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <button type="button" onClick={handleSignOut} disabled={loading} className={`${btnSecondary} w-full`}>
      <LogOut className="h-4 w-4" />
      {loading ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
