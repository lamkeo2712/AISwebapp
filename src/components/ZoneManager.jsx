import React, { useState, useEffect, useCallback } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Spinner, Table } from 'reactstrap'
import { toast } from 'react-toastify'
import useAisStore from '../store/useAisStore'
import { useAuth } from '../hooks/useAuth'
import { zoneService } from '../services/zone-service'
import { vesselService } from '../services/vessel-service'
import { tranformApiData } from '../helpers/common-helper'
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
  const [showVesselsModal, setShowVesselsModal] = useState(false)
  const [vesselsInZone, setVesselsInZone] = useState([])
  const [loadingVesselsInZone, setLoadingVesselsInZone] = useState(false)

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

  const formatLon = (v) => {
    const lon = Number(v.Longitude ?? v.Lon ?? v.Long)
    if (!Number.isFinite(lon)) return '-'
    const dir = lon >= 0 ? 'E' : 'W'
    return `${Math.abs(lon).toFixed(6)}° ${dir}`
  }

  const formatLat = (v) => {
    const lat = Number(v.Latitude ?? v.Lat)
    if (!Number.isFinite(lat)) return '-'
    const dir = lat >= 0 ? 'N' : 'S'
    return `${Math.abs(lat).toFixed(6)}° ${dir}`
  }

  const handleShowVesselsInZone = useCallback(async () => {
    if (!selectedZoneId) {
      toast.info('Vui lòng chọn vùng trước')
      return
    }
    const zone = zones.find((z) => z.id === selectedZoneId)
    if (!zone) {
      toast.error('Không tìm thấy vùng đã chọn')
      return
    }
    setLoadingVesselsInZone(true)
    try {
      const params = { Polygon: zone.Polygon }
      const res = await vesselService.searchVesselsInPolygon(params)
      // response shape may contain arrays; pick the first array with vessel-like objects
      const arrays = Object.values(res || {}).filter((v) => Array.isArray(v))
      const list = arrays.find((arr) => arr.length > 0 && (arr[0].MMSI || arr[0].VesselName || arr[0].TenTau)) || []
      setVesselsInZone(list.map((v) => tranformApiData(v)))
      setShowVesselsModal(true)
    } catch (err) {
      console.error('Error loading vessels in zone:', err)
      if (err?.response) {
        toast.error(`Lấy danh sách tàu thất bại: ${err.response.status} ${err.response.statusText}`)
      } else {
        toast.error('Lấy danh sách tàu trong vùng thất bại')
      }
      setVesselsInZone([])
    } finally {
      setLoadingVesselsInZone(false)
    }
  }, [selectedZoneId, zones])

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
              <Button color="secondary" className="me-2" onClick={handleShowVesselsInZone}>
                Tàu trong vùng
              </Button>
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
                        .filter((key) => key !== 'UserID' && key !== 'id' && key !== 'Polygon')
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
                        .filter(([key]) => key !== 'UserID' && key !== 'id' && key !== 'Polygon')
                        .map(([key, value]) => (
                          <td key={key} style={{ verticalAlign: 'top' }}>{value}</td>
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
      {/* Vessels-in-zone modal (larger) */}
      <Modal isOpen={showVesselsModal} toggle={() => setShowVesselsModal(false)} centered style={{ maxWidth: '90vw', width: '90vw', height: '80vh' }}>
        <ModalHeader toggle={() => setShowVesselsModal(false)} className="p-3">
          <div style={{ fontSize: 18, fontWeight: 600, width: '100%' }}>Tàu trong vùng</div>
        </ModalHeader>
        <div style={{ height: 4, backgroundColor: '#0d6efd', width: '100%' }} />
        <ModalBody style={{ height: 'calc(80vh - 56px)', overflowY: 'auto' }}>
          {loadingVesselsInZone ? (
            <div className="d-flex justify-content-center align-items-center" style={{ height: 120 }}>
              <Spinner />
            </div>
          ) : (
            <div style={{ maxHeight: 'calc(80vh - 120px)', overflowY: 'auto' }}>
              <Table bordered size="sm">
              <thead>
                <tr>
                  <th>MMSI</th>
                  <th>Tên tàu</th>
                  <th>IMONumber</th>
                  <th>Loại tàu</th>
                  <th>Lat</th>
                  <th>Lon</th>
                  <th>Thời gian vào vùng</th>
                </tr>
              </thead>
              <tbody>
                {vesselsInZone.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-muted">Không có tàu trong vùng</td></tr>
                )}
                {vesselsInZone.map((v, idx) => (
                  <tr key={idx}>
                    <td>{v.MMSI}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.VesselName || v.TenTau}</td>
                    <td>{v.IMONumber || v.IMO}</td>
                    <td>{v.ShipType || v.type}</td>
                    <td>{formatLat(v)}</td>
                    <td>{formatLon(v)}</td>
                    <td>{v.DateTimeUTC || v.UpdatedAt || '-'}</td>
                  </tr>
                ))}
              </tbody>
              </Table>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowVesselsModal(false)}>Đóng</Button>
        </ModalFooter>
      </Modal>
    </Modal>
  )
}

export default ZoneManager
