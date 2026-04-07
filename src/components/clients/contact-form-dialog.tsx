'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { contactCreateSchema, type ContactCreateInput } from '@/lib/validators/client';
import type { ContactRow } from '@/lib/services/client-service';

interface ContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ContactCreateInput) => Promise<void>;
  defaultValues?: Partial<ContactRow>;
  loading?: boolean;
}

export function ContactFormDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  loading,
}: ContactFormDialogProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isEditing = !!defaultValues?.id;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const raw = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      department: formData.get('department') as string,
      position: formData.get('position') as string,
      role: formData.get('role') as string,
      isPrimary: false,
    };

    const result = contactCreateSchema.safeParse(raw);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        fieldErrors[String(err.path[0])] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    await onSubmit(result.data);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? '연락처 수정' : '연락처 추가'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact-name">이름 *</Label>
            <Input id="contact-name" name="name" defaultValue={defaultValues?.name ?? ''} />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact-dept">부서</Label>
              <Input id="contact-dept" name="department" defaultValue={defaultValues?.department ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-pos">직책</Label>
              <Input id="contact-pos" name="position" defaultValue={defaultValues?.position ?? ''} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact-phone">전화</Label>
              <Input id="contact-phone" name="phone" defaultValue={defaultValues?.phone ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email">이메일</Label>
              <Input id="contact-email" name="email" type="email" defaultValue={defaultValues?.email ?? ''} />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-role">역할</Label>
            <Input id="contact-role" name="role" placeholder="기술담당, 결제자 등" defaultValue={defaultValues?.role ?? ''} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
            <Button type="submit" disabled={loading}>{loading ? '저장 중...' : '저장'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
