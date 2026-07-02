import type { Metadata } from 'next';
import ContributeForm from '@/components/ContributeForm';

export const metadata: Metadata = {
  title: 'Contribute: submit intel or a correction',
  description:
    'Spotted an error, or know something we should cover? Submit it for verification and earn Respect on The Come-Up when it’s confirmed.',
  alternates: { canonical: '/contribute' },
};

export default function ContributePage() {
  return (
    <section className="section">
      <div className="wrap" style={{ maxWidth: 720 }}>
        <ContributeForm />
      </div>
    </section>
  );
}
