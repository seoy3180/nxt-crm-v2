'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClientInfoCard } from './client-info-card';
import { ContactTable } from './contact-table';
import { RelatedContracts } from './related-contracts';
import { MspInfoTab } from './msp-info-tab';
import { EduInfoTab } from './edu-info-tab';
import { ClientDeleteZone } from './client-delete-zone';
import type { ClientRow } from '@/lib/services/client-service';
import { Badge } from '@/components/ui/badge';

interface ClientTabsProps {
  client: ClientRow;
}

export function ClientTabs({ client }: ClientTabsProps) {
  const isParent = !client.parent_id && (client.children ?? []).length > 0;
  const hasBusinessType = (type: string) => client.business_types?.includes(type);

  if (isParent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{client.name}</h1>
          <Badge variant="secondary">상위 고객</Badge>
        </div>

        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">기본 정보</TabsTrigger>
            <TabsTrigger value="contracts">관련 계약</TabsTrigger>
          </TabsList>
          <TabsContent value="info" className="space-y-6">
            <ClientInfoCard client={client} />
          </TabsContent>
          <TabsContent value="contracts">
            <RelatedContracts clientId={client.id} />
          </TabsContent>
        </Tabs>

        <ClientDeleteZone clientId={client.id} clientName={client.name} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{client.name}</h1>

      <Tabs defaultValue="info">
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

      <ClientDeleteZone clientId={client.id} clientName={client.name} />
    </div>
  );
}
