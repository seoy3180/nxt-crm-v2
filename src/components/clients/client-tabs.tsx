'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClientInfoCard } from './client-info-card';
import { ContactTable } from './contact-table';
import { RelatedContracts } from './related-contracts';
import { MspInfoTab } from './msp-info-tab';
import { EduInfoTab } from './edu-info-tab';
import { ClientDeleteZone } from './client-delete-zone';
import type { ClientRow } from '@/lib/services/client-service';
import { Badge } from '@/components/ui/badge';
import { CLIENT_TYPES } from '@/lib/constants';
import { ArrowLeft } from 'lucide-react';

interface ClientTabsProps {
  client: ClientRow;
}

function ChildClientsTable({ children }: { children: ClientRow['children'] }) {
  const items = children ?? [];
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-200 p-6 space-y-4">
      <h3 className="text-lg font-semibold text-zinc-900">하위 고객 ({items.length}건)</h3>
      <div className="overflow-hidden rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 text-left">
              <th className="h-9 px-3 text-xs font-semibold text-zinc-500">고객명</th>
              <th className="h-9 px-3 text-xs font-semibold text-zinc-500">유형</th>
              <th className="h-9 px-3 text-xs font-semibold text-zinc-500">등급</th>
            </tr>
          </thead>
          <tbody>
            {items.map((child) => (
              <tr key={child.id} className="border-t border-zinc-100">
                <td className="h-10 px-3">
                  <Link href={`/clients/${child.id}`} className="font-medium text-blue-600 hover:underline">
                    {child.name}
                  </Link>
                </td>
                <td className="h-10 px-3 text-zinc-500">
                  {CLIENT_TYPES[child.client_type as keyof typeof CLIENT_TYPES] ?? child.client_type}
                </td>
                <td className="h-10 px-3 text-zinc-500">{child.grade ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ClientTabs({ client }: ClientTabsProps) {
  const router = useRouter();
  const isParent = !client.parent_id && (client.children ?? []).length > 0;
  const hasBusinessType = (type: string) => client.business_types?.includes(type);

  const header = (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => router.back()}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-50"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <h1 className="text-2xl font-semibold text-zinc-900">{client.name}</h1>
      {isParent && (
        <span className="rounded bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500">
          상위 고객
        </span>
      )}
    </div>
  );

  if (isParent) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        {header}

        <Tabs defaultValue="info" className="flex-1">
          <TabsList>
            <TabsTrigger value="info">기본 정보</TabsTrigger>
            <TabsTrigger value="contracts">관련 계약</TabsTrigger>
          </TabsList>
          <TabsContent value="info" className="space-y-6">
            <ClientInfoCard client={client} />
            <ChildClientsTable children={client.children} />
          </TabsContent>
          <TabsContent value="contracts">
            <RelatedContracts
              clientId={client.id}
              childClientIds={(client.children ?? []).map((c) => c.id)}
            />
          </TabsContent>
        </Tabs>

        <div className="mt-auto">
          <ClientDeleteZone clientId={client.id} clientName={client.name} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col gap-6">
      {header}

      <Tabs defaultValue="info" className="flex-1">
        <TabsList>
          <TabsTrigger value="info">기본 정보</TabsTrigger>
          <TabsTrigger value="contacts">연락처</TabsTrigger>
          {hasBusinessType('msp') && <TabsTrigger value="msp">MSP 정보</TabsTrigger>}
          {hasBusinessType('tt') && <TabsTrigger value="edu">교육 정보</TabsTrigger>}
          <TabsTrigger value="contracts">관련 계약</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <ClientInfoCard client={client} />
        </TabsContent>

        <TabsContent value="contacts">
          <ContactTable clientId={client.id} />
        </TabsContent>

        {hasBusinessType('msp') && (
          <TabsContent value="msp">
            <MspInfoTab clientId={client.id} />
          </TabsContent>
        )}

        {hasBusinessType('tt') && (
          <TabsContent value="edu">
            <EduInfoTab clientId={client.id} />
          </TabsContent>
        )}

        <TabsContent value="contracts">
          <RelatedContracts clientId={client.id} />
        </TabsContent>
      </Tabs>

      <div className="mt-auto">
        <ClientDeleteZone clientId={client.id} clientName={client.name} />
      </div>
    </div>
  );
}
