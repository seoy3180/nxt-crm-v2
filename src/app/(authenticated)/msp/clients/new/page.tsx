'use client';

import { PageHeader } from '@/components/layout/page-header';
import { ClientForm } from '@/components/clients/client-form';

export default function MspNewClientPage() {
  return (
    <div>
      <PageHeader title="새 MSP 고객 등록" backButton />
      <ClientForm defaultBusinessTypes={['msp']} hideBusinessTypes hideGrade />
    </div>
  );
}
