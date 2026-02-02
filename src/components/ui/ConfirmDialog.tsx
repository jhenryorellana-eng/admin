'use client';

import { useConfirmStore } from '@/stores/admin-store';
import { Modal, ModalFooter } from './Modal';
import { Button } from './Button';

export function ConfirmDialog() {
  const { isOpen, title, message, onConfirm, closeConfirm } = useConfirmStore();

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    closeConfirm();
  };

  return (
    <Modal isOpen={isOpen} onClose={closeConfirm} title={title} size="sm">
      <p className="text-surface-600">{message}</p>
      <ModalFooter>
        <Button variant="secondary" onClick={closeConfirm}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={handleConfirm}>
          Confirmar
        </Button>
      </ModalFooter>
    </Modal>
  );
}
