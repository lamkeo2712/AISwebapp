import React from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, FormGroup, Label, Input } from 'reactstrap'

const ZoneEditorModal = ({
  isOpen,
  title = 'Thêm vùng mới',
  zoneName,
  zoneNote,
  zoneCoords,
  onChangeName,
  onChangeNote,
  onSelectZone,
  onSubmit,
  onCancel,
  submitting = false,
  submitLabel = 'Lưu vùng',
  selectLabel = 'Chọn vùng'
}) => (
  <Modal isOpen={isOpen} toggle={onCancel} centered>
    <ModalHeader toggle={onCancel}>{title}</ModalHeader>
    <ModalBody>
      <FormGroup>
        <Label for="zoneName">Tên vùng</Label>
        <Input
          id="zoneName"
          value={zoneName}
          onChange={(e) => onChangeName?.(e.target.value)}
          placeholder="Nhập tên vùng"
        />
      </FormGroup>
      <FormGroup>
        <Label for="zoneNote">Ghi chú</Label>
        <Input
          id="zoneNote"
          value={zoneNote}
          onChange={(e) => onChangeNote?.(e.target.value)}
          placeholder="Nhập ghi chú cho vùng"
        />
      </FormGroup>
      <FormGroup>
        <Label for="zoneCoords">Tọa độ vùng (CSV)</Label>
        <div className="d-flex">
          <Input
            id="zoneCoords"
            value={zoneCoords}
            readOnly
            placeholder="Nhấn 'Chọn vùng' để vẽ trên bản đồ"
          />
          <Button
            size="sm"
            color="secondary"
            className="ms-2"
            onClick={() => onSelectZone?.()}
            disabled={submitting}
          >
            {selectLabel}
          </Button>
        </div>
      </FormGroup>
    </ModalBody>
    <ModalFooter>
      <Button color="primary" onClick={onSubmit} disabled={submitting}>
        {submitLabel}
      </Button>
      <Button color="secondary" onClick={onCancel} disabled={submitting}>
        Hủy
      </Button>
    </ModalFooter>
  </Modal>
)

export default ZoneEditorModal
