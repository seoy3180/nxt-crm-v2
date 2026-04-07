'use client';

import { useState } from 'react';
import { useContacts, useCreateContact, useUpdateContact, useDeleteContact } from '@/hooks/use-contacts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { ContactFormDialog } from './contact-form-dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { ContactRow } from '@/lib/services/client-service';
import type { ContactCreateInput } from '@/lib/validators/client';

interface ContactTableProps {
  clientId: string;
}

export function ContactTable({ clientId }: ContactTableProps) {
  const { data: contacts, isLoading } = useContacts(clientId);
  const createContact = useCreateContact(clientId);
  const updateContact = useUpdateContact(clientId);
  const deleteContact = useDeleteContact(clientId);

  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContactRow | null>(null);

  async function handleCreate(data: ContactCreateInput) {
    await createContact.mutateAsync(data);
  }

  async function handleUpdate(data: ContactCreateInput) {
    if (!editingContact) return;
    await updateContact.mutateAsync({ id: editingContact.id, input: data });
    setEditingContact(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteContact.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="mr-1 h-3 w-3" />
          연락처 추가
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>부서</TableHead>
              <TableHead>직책</TableHead>
              <TableHead>전화</TableHead>
              <TableHead>이메일</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(!contacts || contacts.length === 0) ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  등록된 연락처가 없습니다
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">{contact.name}</TableCell>
                  <TableCell>{contact.department ?? '-'}</TableCell>
                  <TableCell>{contact.position ?? '-'}</TableCell>
                  <TableCell>{contact.phone ?? '-'}</TableCell>
                  <TableCell>{contact.email ?? '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditingContact(contact)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => setDeleteTarget(contact)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 추가 다이얼로그 */}
      <ContactFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        loading={createContact.isPending}
      />

      {/* 수정 다이얼로그 */}
      {editingContact && (
        <ContactFormDialog
          open={!!editingContact}
          onOpenChange={() => setEditingContact(null)}
          onSubmit={handleUpdate}
          defaultValues={editingContact}
          loading={updateContact.isPending}
        />
      )}

      {/* 삭제 확인 */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="연락처 삭제"
        description={`"${deleteTarget?.name}" 연락처를 삭제하시겠습니까?`}
        confirmLabel="삭제"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteContact.isPending}
      />
    </div>
  );
}
