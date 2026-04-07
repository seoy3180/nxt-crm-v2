'use client';

import { PageHeader } from '@/components/layout/page-header';
import { ContractForm } from '@/components/contracts/contract-form';

export default function NewContractPage() {
  return (
    <div>
      <PageHeader title="새 계약 등록" backButton />
      <ContractForm />
    </div>
  );
}
