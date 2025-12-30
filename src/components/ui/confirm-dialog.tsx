import * as React from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'

export type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  confirmVariant?: 'default' | 'destructive' | 'secondary' | 'ghost'
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title = 'Confirm action',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  confirmVariant = 'destructive',
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title}>
      <div className="space-y-4">
        {description && <div className="text-sm text-gray-700">{description}</div>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
