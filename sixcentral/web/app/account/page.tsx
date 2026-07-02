import type { Metadata } from 'next';
import AccountPanel from '@/components/AccountPanel';

export const metadata: Metadata = {
  title: 'Your account',
  description: 'Sign in to SixCentral — your handle, your Respect, your progress.',
  robots: { index: false },
};

export default function AccountPage() {
  return (
    <section className="section">
      <div className="wrap" style={{ maxWidth: 720 }}>
        <AccountPanel />
      </div>
    </section>
  );
}
