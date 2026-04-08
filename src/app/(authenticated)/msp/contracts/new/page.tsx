'use client';

import { PageHeader } from '@/components/layout/page-header';
import { ContractForm } from '@/components/contracts/contract-form';

export default function MspNewContractPage() {
  return (
    <div>
      <PageHeader title="새 MSP 계약 등록" backButton />
      <ContractForm defaultType="msp" hideTypeSelector />
    </div>
  );
}
