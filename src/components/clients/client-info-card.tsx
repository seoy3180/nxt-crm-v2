'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil } from 'lucide-react';
import { CLIENT_TYPES, CLIENT_GRADES, BUSINESS_TYPES } from '@/lib/constants';
import { clientUpdateSchema } from '@/lib/validators/client';
import { useUpdateClient } from '@/hooks/use-client-mutations';
import type { ClientRow } from '@/lib/services/client-service';
import { toast } from 'sonner';

interface ClientInfoCardProps {
  client: ClientRow;
}

export function ClientInfoCard({ client }: ClientInfoCardProps) {
  const [editing, setEditing] = useState(false);
  const updateClient = useUpdateClient(client.id);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const raw = {
      name: formData.get('name') as string,
      clientType: formData.get('clientType') as string,
      grade: formData.get('grade') || undefined,
      memo: formData.get('memo') || null,
    };
    const result = clientUpdateSchema.safeParse(raw);
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? '입력을 확인해주세요');
      return;
    }
    await updateClient.mutateAsync(result.data);
    setEditing(false);
  }

  if (editing) {
    return (
      <form onSubmit={handleSave}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">기본 정보</CardTitle>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>취소</Button>
              <Button type="submit" size="sm" disabled={updateClient.isPending}>저장</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>고객사명</Label>
                <Input name="name" defaultValue={client.name} />
              </div>
              <div className="space-y-2">
                <Label>유형</Label>
                <Select name="clientType" defaultValue={client.client_type}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CLIENT_TYPES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>등급</Label>
                <Select name="grade" defaultValue={client.grade ?? ''}>
                  <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                  <SelectContent>
                    {CLIENT_GRADES.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>메모</Label>
              <Textarea name="memo" defaultValue={client.memo ?? ''} rows={3} />
            </div>
          </CardContent>
        </Card>
      </form>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">기본 정보</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil className="mr-1 h-3 w-3" />
          수정
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">고객사명</p>
            <p className="text-sm font-medium">{client.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">유형</p>
            <p className="text-sm font-medium">
              {CLIENT_TYPES[client.client_type as keyof typeof CLIENT_TYPES]}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">등급</p>
            <p className="text-sm font-medium">{client.grade ?? '-'}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">비즈니스 타입</p>
            <p className="text-sm font-medium">
              {client.business_types?.map((bt: string) =>
                BUSINESS_TYPES[bt as keyof typeof BUSINESS_TYPES] ?? bt,
              ).join(', ') || '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">사내 담당자</p>
            <p className="text-sm font-medium">{client.assigned_to_name ?? '-'}</p>
          </div>
        </div>
        {client.memo && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">메모</p>
            <p className="text-sm">{client.memo}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
