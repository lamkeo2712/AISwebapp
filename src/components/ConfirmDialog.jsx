import React from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap'

const ConfirmDialog = ({
  isOpen,
  title = 'Xác nhận',
  message,
  confirmLabel = 'Đồng ý',
  cancelLabel = 'Hủy',
  confirmColor = 'danger',
  onConfirm,
  onCancel,
  isProcessing = false
}) => (
  <Modal isOpen={isOpen} toggle={onCancel} centered>
    <ModalHeader toggle={onCancel}>{title}</ModalHeader>
    <ModalBody>{message}</ModalBody>
    <ModalFooter>
      <Button color="secondary" onClick={onCancel} disabled={isProcessing}>
        {cancelLabel}
      </Button>
      <Button color={confirmColor} onClick={onConfirm} disabled={isProcessing}>
        {isProcessing ? 'Đang xử lý...' : confirmLabel}
      </Button>
    </ModalFooter>
  </Modal>
)

export default ConfirmDialog
