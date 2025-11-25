import React, { useState, useCallback, useEffect } from "react"
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Input, ListGroup, ListGroupItem, Spinner } from "reactstrap"
import { toast } from "react-toastify"
import { vesselService } from "../services/vessel-service"
import useAisStore from "../store/useAisStore"
import { tranformApiData } from "../helpers/common-helper"
import { useAuth } from "../hooks/useAuth"

const TrackVesselModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const [tracked, setTracked] = useState([])
  const [loadingTracked, setLoadingTracked] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState(null)
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [showAddConfirm, setShowAddConfirm] = useState(false)
  const [addTargetMmsi, setAddTargetMmsi] = useState(null)
  const setSelectedVessel = useAisStore((s) => s.setSelectedVessel)
  const { user } = useAuth()
  const userId = user?.id ?? user?.ID ?? user?.UserID ?? user?.userId

  const handleSearch = useCallback(async () => {
    setLoading(true)
    try {
      // Try to search by MMSI or VesselName depending on input
      const params = {}
      if (!query) {
        // empty -> fetch all (limited by backend)
      } else if (/^\d+$/.test(query)) {
        params.MMSI = query
      } else {
        params.VesselName = query
      }
      const res = await vesselService.getVesselList(params)
      const vessels = (res?.DM_Tau || [])
      setResults(vessels)
    } catch (err) {
      console.error("Error searching vessel:", err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [query])

  const loadTracked = useCallback(async () => {
    if (!userId) return
    setLoadingTracked(true)
    try {
      const res = await vesselService.getTrackedVessels({ UserID: userId, PageSize: 100, PageIndex: 0 })
      // API returns object(s) with arrays; find the array with MMSI or VesselName
      const arrays = Object.values(res || {}).filter((v) => Array.isArray(v))
      const list = arrays.find((arr) => arr.length > 0 && (arr[0].MMSI || arr[0].VesselName || arr[0].id)) || []
      setTracked(list.map((v) => tranformApiData(v)))
    } catch (err) {
      console.error("Error loading tracked vessels:", err)
      setTracked([])
    } finally {
      setLoadingTracked(false)
    }
  }, [userId])

  useEffect(() => {
    if (isOpen) {
      loadTracked()
    }
  }, [isOpen, loadTracked])

  const handleSelect = (vesselRaw) => {
    const vessel = tranformApiData(vesselRaw)
    setSelectedVessel(vessel)
    // dispatch an event so the map can listen and render the track if implemented
    window.dispatchEvent(new CustomEvent("track-vessel", { detail: vessel }))
    onClose()
  }

  const handleAddTracked = async (mmsi) => {
    if (!userId || !mmsi) return
    // prevent duplicate
    if ((tracked || []).some((t) => String(t.MMSI) === String(mmsi))) {
      toast.info("Tàu này đã có trong danh sách theo dõi")
      return
    }
    try {
      setAdding(true)
      await vesselService.addTrackedVessel({ MMSI: Number(mmsi), UserID: userId })
      await loadTracked()
      toast.success("Thêm tàu vào danh sách theo dõi thành công")
    } catch (err) {
      console.error("Error adding tracked vessel:", err)
      toast.error("Thêm tàu thất bại")
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteTracked = async (id) => {
    if (!userId || !id) {
      toast.error("Không tìm thấy id để xóa")
      return
    }
    try {
      setDeletingId(id)
      // Send exactly the payload format the stored procedure expects in SQLServer
      // e.g. N'{"UserID":"13","id":"6"}',''
      const payload = {
        UserID: String(userId),
        id: String(id)
      }
      await vesselService.deleteTrackedVessel(payload)
      await loadTracked()
      toast.success("Xóa tàu khỏi danh sách theo dõi thành công")
    } catch (err) {
      console.error("Error deleting tracked vessel:", err)
      toast.error("Xóa tàu thất bại")
    } finally {
      setDeletingId(null)
    }
  }

  const confirmDelete = (id) => {
    setDeleteTargetId(id)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return
    await handleDeleteTracked(deleteTargetId)
    setShowDeleteConfirm(false)
    setDeleteTargetId(null)
  }

  const handleGoTo = (v) => {
    const vessel = tranformApiData(v)
    setSelectedVessel(vessel)
    // also dispatch an event to let map center if needed
    window.dispatchEvent(new CustomEvent("goto-vessel", { detail: vessel }))
  }

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

  return (
    <>
    <Modal isOpen={isOpen} centered style={{ maxWidth: "80vw", width: "80vw", height: "80vh" }}>
      <ModalHeader toggle={onClose}>Tàu theo dõi</ModalHeader>
      <ModalBody style={{ height: "calc(80vh - 56px)", overflow: "hidden" }}>
        <div className="mb-3">
          <div className="d-flex gap-2">
            <Input
              placeholder="Nhập MMSI"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button color="info" onClick={handleSearch} disabled={loading}>
              {loading ? <Spinner size="sm" /> : "Tìm"}
            </Button>
          </div>
        </div>

        <div style={{ height: "calc(100% - 64px)", overflowY: "auto" }}>
          {/* Search results */}
          <div className="mb-3">
            <div className="fw-bold">Kết quả tìm kiếm</div>
            {loading ? (
              <div className="d-flex justify-content-center align-items-center" style={{ height: 100 }}>
                <Spinner />
              </div>
            ) : (
              <ListGroup flush>
                {results.length === 0 && <div className="text-center text-muted">Không có kết quả</div>}
                {results.map((v, idx) => (
                  <ListGroupItem key={idx} className="d-flex justify-content-between align-items-center">
                    <div style={{ maxWidth: '70%' }}>
                      <div className="fw-bold" style={{ fontSize: 14 }}>{v.VesselName || v.TenTau || v.MMSI}</div>
                      <div className="text-muted" style={{ fontSize: 12 }}>MMSI: {v.MMSI || v.mmsi || "-"}</div>
                    </div>
                    <div className="d-flex gap-2">
                      <Button color="primary" size="sm" onClick={() => handleSelect(v)}>Chọn</Button>
                      <Button
                        color="outline-secondary"
                        size="sm"
                        disabled={adding}
                        onClick={() => {
                          const m = v.MMSI || v.mmsi
                          if (!m) {
                            window.alert('Không tìm thấy MMSI để thêm')
                            return
                          }
                          if ((tracked || []).some((t) => String(t.MMSI) === String(m))) {
                            toast.info('Tàu này đã có trong danh sách theo dõi')
                            return
                          }
                          // open confirm-add modal instead of window.confirm
                          setAddTargetMmsi(m)
                          setShowAddConfirm(true)
                        }}
                      >
                        {adding ? <Spinner size="sm" /> : 'Theo dõi'}
                      </Button>
                    </div>
                  </ListGroupItem>
                ))}
              </ListGroup>
            )}
          </div>

          {/* Tracked list */}
          <div>
            <div className="fw-bold mb-2">Danh sách tàu theo dõi</div>
            {loadingTracked ? (
              <div className="d-flex justify-content-center align-items-center" style={{ height: 100 }}>
                <Spinner />
              </div>
            ) : (
              <div>
                <div className="d-flex small text-muted mb-1" style={{ fontSize: 12 }}>
                  <div style={{ width: '10%' }}>MMSI</div>
                  <div style={{ width: '20%' }}>Tên tàu</div>
                  <div style={{ width: '6%' }}>IMO</div>
                  <div style={{ width: '8%' }}>Loại</div>
                  <div style={{ width: '7%' }}>Dài</div>
                  <div style={{ width: '7%' }}>Rộng</div>
                  <div style={{ width: '8%' }}>Lon</div>
                  <div style={{ width: '8%' }}>Lat</div>
                  <div style={{ width: '8%' }}>Draught</div>
                  <div style={{ width: '9%' }} className="text-end">Thời gian</div>
                </div>
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {tracked.length === 0 && <div className="text-center text-muted">Danh sách theo dõi rỗng</div>}
                    {tracked.map((v, idx) => {
                      const itemId = v.id ?? v.ID ?? v.Id
                      return (
                      <div key={idx} className="d-flex align-items-center py-2 border-bottom" style={{ fontSize: 13 }}>
                        <div style={{ width: '10%' }}>{v.MMSI}</div>
                        <div style={{ width: '20%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.VesselName || v.TenTau}</div>
                        <div style={{ width: '6%' }}>{v.IMONumber || v.IMO}</div>
                        <div style={{ width: '8%' }}>{v.ShipType || v.type}</div>
                        <div style={{ width: '7%' }}>{v.ShipLength || v.Length || v.Long || '-'}</div>
                        <div style={{ width: '7%' }}>{v.ShipWidth || v.Width || '-'}</div>
                        <div style={{ width: '8%' }}>{formatLon(v)}</div>
                        <div style={{ width: '8%' }}>{formatLat(v)}</div>
                        <div style={{ width: '8%' }}>{v.Draught || v.DraughtValue || '-'}</div>
                        <div style={{ width: '9%' }} className="text-end">{v.DateTimeUTC || v.UpdatedAt || '-'}</div>
                        <div className="d-flex ms-2" style={{ gap: 6 }}>
                          <Button color="info" size="sm" onClick={() => handleGoTo(v)}>Đến vị trí</Button>
                          <Button color="danger" size="sm" onClick={() => confirmDelete(itemId ?? v.MMSI)} disabled={deletingId === itemId}>
                            {deletingId === itemId ? <Spinner size="sm" /> : 'Xóa'}
                          </Button>
                        </div>
                      </div>
                      )
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      </ModalBody>
    </Modal>

    {/* Add-dialog removed: add is done via search results confirmation */}

    {/* Delete confirmation dialog */}
    <Modal isOpen={showDeleteConfirm} toggle={() => setShowDeleteConfirm(false)} centered>
      <ModalHeader toggle={() => setShowDeleteConfirm(false)}>Xác nhận xóa</ModalHeader>
      <ModalBody>Bạn có chắc muốn xóa tàu khỏi danh sách theo dõi không?</ModalBody>
      <ModalFooter>
        <Button color="danger" onClick={handleConfirmDelete}>Xóa</Button>
        <Button color="secondary" onClick={() => setShowDeleteConfirm(false)}>Hủy</Button>
      </ModalFooter>
    </Modal>

    {/* Add confirmation dialog */}
    <Modal isOpen={showAddConfirm} toggle={() => setShowAddConfirm(false)} centered>
      <ModalHeader toggle={() => setShowAddConfirm(false)}>Xác nhận thêm</ModalHeader>
      <ModalBody>Bạn có muốn thêm tàu MMSI {addTargetMmsi} vào danh sách theo dõi không?</ModalBody>
      <ModalFooter>
        <Button color="primary" onClick={async () => {
          // call add and close
          setShowAddConfirm(false)
          await handleAddTracked(addTargetMmsi)
          setAddTargetMmsi(null)
        }} disabled={adding}>{adding ? <Spinner size="sm" /> : 'Thêm'}</Button>
        <Button color="secondary" onClick={() => { setShowAddConfirm(false); setAddTargetMmsi(null); }}>Hủy</Button>
      </ModalFooter>
    </Modal>
    </>
  )
}

export default TrackVesselModal
