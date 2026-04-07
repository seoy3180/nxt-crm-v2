'use client';

import { PageHeader } from '@/components/layout/page-header';
import { ClientForm } from '@/components/clients/client-form';

export default function NewClientPage() {
  return (
    <div>
      <PageHeader title="새 고객 등록" backButton />
      <ClientForm />
    </div>
  );
}
