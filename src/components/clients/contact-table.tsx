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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="pl-2 text-lg font-semibold text-zinc-900">
          연락처 <span className="text-zinc-400">({contacts?.length ?? 0}명)</span>
        </h3>
        <Button onClick={() => setFormOpen(true)} className="h-9 gap-1.5 rounded-lg bg-blue-600 px-4 text-[13px] font-medium hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          연락처 추가
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50">
              <TableHead className="h-10 px-4 text-xs font-semibold text-zinc-500">이름</TableHead>
              <TableHead className="h-10 px-4 text-center text-xs font-semibold text-zinc-500">부서</TableHead>
              <TableHead className="h-10 px-4 text-center text-xs font-semibold text-zinc-500">직책</TableHead>
              <TableHead className="h-10 px-4 text-center text-xs font-semibold text-zinc-500">전화</TableHead>
              <TableHead className="h-10 px-4 text-center text-xs font-semibold text-zinc-500">이메일</TableHead>
              <TableHead className="h-10 w-[80px] px-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(!contacts || contacts.length === 0) ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-zinc-400">
                  등록된 연락처가 없습니다
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow key={contact.id} className="h-11 border-b border-zinc-100">
                  <TableCell className="px-4 text-sm font-medium text-zinc-900">{contact.name}</TableCell>
                  <TableCell className="px-4 text-center text-[13px] text-zinc-500">{contact.department ?? '-'}</TableCell>
                  <TableCell className="px-4 text-center text-[13px] text-zinc-500">{contact.position ?? '-'}</TableCell>
                  <TableCell className="px-4 text-center text-[13px] text-zinc-500">{contact.phone ?? '-'}</TableCell>
                  <TableCell className="px-4 text-center text-[13px] text-zinc-500">{contact.email ?? '-'}</TableCell>
                  <TableCell className="px-4">
                    <div className="flex justify-center gap-1">
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
