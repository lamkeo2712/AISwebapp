import React, { useState, useEffect, useCallback } from 'react'
import { Modal, ModalHeader, ModalBody, Button, Spinner, Table } from 'reactstrap'
import { toast } from 'react-toastify'
import useAisStore from '../store/useAisStore'
import { useAuth } from '../hooks/useAuth'
import { zoneService } from '../services/zone-service'
import ZoneEditorModal from './ZoneEditorModal'
import ConfirmDeleteModal from './ConfirmDeleteModal'

const ZoneManager = ({ isOpen, onClose, onOpen }) => {
  const startDrawingZone = useAisStore((s) => s.startDrawingZone)
  const stopDrawingZone = useAisStore((s) => s.stopDrawingZone)
  const clearPolygonCoords = useAisStore((s) => s.clearPolygonCoords)
  const setPolygonCoords = useAisStore((s) => s.setPolygonCoords)
  const polygonCoords = useAisStore((s) => s.polygonCoords)
  const { user } = useAuth()
  const userId = user?.id ?? user?.ID ?? user?.UserID ?? user?.userId
  const [zones, setZones] = useState([])
  const [loadingZones, setLoadingZones] = useState(false)
  const [selectedZoneId, setSelectedZoneId] = useState(null)
  const [showAddZoneModal, setShowAddZoneModal] = useState(false)
  const [isSavingZone, setIsSavingZone] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeletingZone, setIsDeletingZone] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedZoneForEdit, setSelectedZoneForEdit] = useState(null)
  const [newName, setNewName] = useState('')
  const [newNote, setNewNote] = useState('')
  const [newCoords, setNewCoords] = useState('')

  const headerMapping = {
    TenVung: 'Tên vùng',
    GhiChu: 'Ghi chú',
    UpdatedAt: 'Thời gian cập nhật'
  }

  const resetForm = useCallback(() => {
    setNewName('')
    setNewNote('')
    setNewCoords('')
    clearPolygonCoords()
  }, [clearPolygonCoords])

  const handleCloseAddModal = useCallback(() => {
    setShowAddZoneModal(false)
    resetForm()
    setIsEditMode(false)
    setSelectedZoneForEdit(null)
  }, [resetForm])

  const handleOpenAddModal = useCallback(() => {
    resetForm()
    setShowAddZoneModal(true)
  }, [resetForm])

  const handleSelectZone = useCallback(() => {
    setShowAddZoneModal(false)
    onClose()
    if (isEditMode) {
      clearPolygonCoords()
      setNewCoords('')
    }
    startDrawingZone()
  }, [onClose, isEditMode, clearPolygonCoords, startDrawingZone])

  const loadZones = useCallback(async () => {
    if (!userId) return
    setLoadingZones(true)
    try {
      const res = await zoneService.searchZones(
        { UserID: userId, PageSize: 100, PageIndex: 0 },
        String(userId)
      )
      const arrays = Object.values(res || {}).filter((v) => Array.isArray(v))
      const zonesList =
        arrays.find((arr) => arr.length > 0 && arr[0] && Object.prototype.hasOwnProperty.call(arr[0], 'TenVung')) || []
      setZones(zonesList)
    } catch (err) {
      console.error('Error fetching zones:', err)
    } finally {
      setLoadingZones(false)
    }
  }, [userId])

  const handleDeleteZone = useCallback(async () => {
    if (!selectedZoneId) return
    try {
      setIsDeletingZone(true)
      await zoneService.deleteZone(
        { id: selectedZoneId, UserID: userId },
        String(userId)
      )
      await loadZones()
      setShowDeleteConfirm(false)
      setSelectedZoneId(null)
      toast.success('Xóa vùng thành công')
      // notify map to reload zones
      window.dispatchEvent(new CustomEvent('zones-updated'))
    } catch (err) {
      console.error('Error deleting zone:', err)
      toast.error('Xóa vùng thất bại, vui lòng thử lại')
    } finally {
      setIsDeletingZone(false)
    }
  }, [selectedZoneId, userId, loadZones])

  const handleOpenDeleteConfirm = useCallback(() => {
    if (selectedZoneId) {
      setShowDeleteConfirm(true)
    }
  }, [selectedZoneId])

  const handleEditZone = useCallback(() => {
    if (!selectedZoneId || !zones.length) return
    const zone = zones.find(z => z.id === selectedZoneId)
    if (!zone) return
    setSelectedZoneForEdit(zone)
    setIsEditMode(true)
    setNewName(zone.TenVung || '')
    setNewNote(zone.GhiChu || '')
    // parse Polygon to coords
    if (zone.Polygon) {
      const coordsStr = zone.Polygon.replace(/^POLYGON\(\(/, '').replace(/\)\)$/, '')
      const coords = coordsStr.split(',').map(pair => pair.trim().split(' ').map(Number))
      setNewCoords(coords.map(c => c.join(' ')).join(', '))
      // also set in store for editing
      setPolygonCoords(coords)
    } else {
      setNewCoords('')
      clearPolygonCoords()
    }
    setShowAddZoneModal(true)
  }, [selectedZoneId, zones, setPolygonCoords, clearPolygonCoords])

  useEffect(() => {
    if (!isOpen) return
    loadZones()
  }, [isOpen, loadZones])

  useEffect(() => {
    if (!polygonCoords?.length) return
    const str = polygonCoords.map((c) => c.join(' ')).join(', ')
    setNewCoords(str)
    stopDrawingZone()
    if (!isOpen) {
      onOpen()
    }
    setShowAddZoneModal(true)
  }, [polygonCoords, isOpen, onOpen, stopDrawingZone])

  const handleSaveZone = async () => {
    if (!newName || !newCoords) return
    try {
      setIsSavingZone(true)
      const wkt = `POLYGON((${newCoords}))`
      const params = {
        TenVung: newName,
        GhiChu: newNote,
        Polygon: wkt,
        UserID: userId
      }
      if (isEditMode && selectedZoneForEdit) {
        params.id = selectedZoneForEdit.id
      }
      await zoneService.updateZone(params, String(userId))
      await loadZones()
      handleCloseAddModal()
      setIsEditMode(false)
      setSelectedZoneForEdit(null)
      toast.success(isEditMode ? 'Cập nhật vùng thành công' : 'Lưu vùng thành công')
      // notify map to reload zones
      window.dispatchEvent(new CustomEvent('zones-updated'))
    } catch (err) {
      console.error('Error saving zone:', err)
      toast.error(isEditMode ? 'Cập nhật vùng thất bại' : 'Lưu vùng thất bại')
    } finally {
      setIsSavingZone(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      toggle={onClose}
      centered
      style={{ maxWidth: '70vw', width: '70vw', height: '70vh' }}
    >
      <ModalHeader toggle={onClose}>Quản lý vùng</ModalHeader>
      <ModalBody style={{ height: 'calc(70vh - 56px)', overflow: 'hidden' }}>
        {/* Nội dung quản lý vùng */}
        {loadingZones ? (
          <Spinner />
        ) : (
          <>
            {/* Buttons for managing zones */}
            <div className="d-flex justify-content-end mb-3">
              <Button
                color="primary"
                className="me-2"
                onClick={handleOpenAddModal}
              >
                Thêm vùng
              </Button>
              <Button color="warning" className="me-2" onClick={handleEditZone}>
                Sửa vùng
              </Button>
              <Button color="danger" onClick={handleOpenDeleteConfirm}>
                Xóa vùng
              </Button>
            </div>
            {/* scrollable container for zones list */}
            <div style={{ height: 'calc(100% - 60px)', overflowY: 'auto' }}>
              <Table bordered size="sm">
                <thead>
                  <tr>
                    {/* dynamically render all keys except UserID and id */}
                    {zones.length > 0 &&
                      Object.keys(zones[0])
                        .filter((key) => key !== 'UserID' && key !== 'id')
                        .map((key) => (
                          <th key={key}>{headerMapping[key] || key}</th>
                        ))}
                  </tr>
                </thead>
                <tbody>
                  {zones.map((zone) => (
                    <tr
                      key={zone.id || JSON.stringify(zone)}
                      className={zone.id === selectedZoneId ? 'table-active' : ''}
                      onClick={() => setSelectedZoneId(zone.id === selectedZoneId ? null : zone.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      {Object.entries(zone)
                        .filter(([key]) => key !== 'UserID' && key !== 'id')
                        .map(([key, value]) => (
                          <td key={key} style={{ verticalAlign: 'top' }}>
                            {key === 'Polygon' && typeof value === 'string' ? (
                              /* split WKT or CSV list into lines */
                              (value.startsWith('POLYGON')
                                ? value.replace(/^POLYGON\(\(/, '').replace(/\)\)$/, '')
                                : value
                              )
                                .split(',')
                                .map((pair, idx) => <div key={idx}>{pair.trim()}</div>)
                            ) : (
                              value
                            )}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </>
        )}
      </ModalBody>

      <ZoneEditorModal
        isOpen={showAddZoneModal}
        title={isEditMode ? 'Sửa vùng' : 'Thêm vùng mới'}
        onCancel={handleCloseAddModal}
        onSubmit={handleSaveZone}
        onChangeName={setNewName}
        onChangeNote={setNewNote}
        onSelectZone={handleSelectZone}
        zoneName={newName}
        zoneNote={newNote}
        zoneCoords={newCoords}
        submitting={isSavingZone}
        submitLabel={isEditMode ? 'Cập nhật vùng' : 'Lưu vùng'}
      />
      <ConfirmDeleteModal
        isOpen={showDeleteConfirm}
        onConfirm={handleDeleteZone}
        onCancel={() => setShowDeleteConfirm(false)}
        confirming={isDeletingZone}
      />
    </Modal>
  )
}

export default ZoneManager
