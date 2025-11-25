import React from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap'

const ConfirmDeleteModal = ({
  isOpen,
  title = 'Xác nhận xóa',
  message = 'Bạn có chắc chắn muốn xóa vùng này?',
  onConfirm,
  onCancel,
  confirming = false
}) => (
  <Modal isOpen={isOpen} toggle={onCancel} centered>
    <ModalHeader toggle={onCancel}>{title}</ModalHeader>
    <ModalBody>{message}</ModalBody>
    <ModalFooter>
      <Button color="danger" onClick={onConfirm} disabled={confirming}>
        Xóa
      </Button>
      <Button color="secondary" onClick={onCancel} disabled={confirming}>
        Hủy
      </Button>
    </ModalFooter>
  </Modal>
)

export default ConfirmDeleteModal
