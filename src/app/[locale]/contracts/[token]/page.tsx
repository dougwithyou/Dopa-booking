import type { Metadata } from 'next';
import { ContractSigningView } from '@/components/contracts/ContractSigningView';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ContractPage({ params }: { params: { locale: string; token: string } }) {
  return <ContractSigningView token={params.token} locale={params.locale} />;
}
