import React, { useCallback, useEffect, useState } from "react"
import { Button, Col, Dropdown, DropdownMenu, DropdownToggle, Row } from "reactstrap"
import useAisStore from "../store/useAisStore"
import { vesselService } from "../services/vessel-service"
import ZoneManager from "./ZoneManager"
import TrackVesselModal from "./TrackVesselModal"
import { useAuth } from "../hooks/useAuth"

const noop = () => {}

const HistoryVessel = ({ onAction1 = noop, onAction2 = noop, onAction3 = noop }) => {
  const [isHistoryVesselDropdown, setIsHistoryVesselDropdown] = useState(false)
  const [showZoneModal, setShowZoneModal] = useState(false)
  const [showTrackModal, setShowTrackModal] = useState(false)
  const setVesselList = useAisStore((state) => state.setVesselList)
  const thamSoTau = useAisStore((state) => state.thamSoTau)
  const { user } = useAuth()
  const userId = user?.id ?? user?.ID ?? user?.UserID ?? user?.userId
  const planType = user?.planType ?? user?.PlanType ?? "Free"

  const toggleHistoryVesselDropdown = () => {
    setIsHistoryVesselDropdown(!isHistoryVesselDropdown)
  }

  const getVesselList = useCallback(async (thamSoObject = {}) => {
    try {
      const response = await vesselService.getVesselList(thamSoObject)
      const vessels = response?.DM_Tau || []
      setVesselList(vessels)
    } catch (error) {
      console.error("Error fetching vessel list:", error)
    }
  }, [setVesselList])

  useEffect(() => {
    getVesselList(thamSoTau)
  }, [thamSoTau, getVesselList])

  return (
    <React.Fragment>
      <Dropdown
        isOpen={isHistoryVesselDropdown}
        toggle={toggleHistoryVesselDropdown}
        className="topbar-head-dropdown ms-1 header-item bg-primary"
      >
        <DropdownToggle className="btn btn-primary bg-primary fs-16 text-white" style={{ borderColor: "transparent" }}>
          Theo dõi
          <i className="ri-arrow-down-s-line align-middle"></i>
        </DropdownToggle>

        <DropdownMenu className="dropdown-menu-lg p-0 dropdown-menu-end" style={{ width: "300px" }}>
          <div className="p-3 border-top-0 border-start-0 border-end-0 border bg-primary text-white">
            <Row className="align-items-start">
                <div className="d-flex flex-column">
                  {planType === "Pro" ? (
                  <>
                  <Button
                    color="light"
                    className="w-100 mb-2"
                    style={{ height: 40 }}
                    onClick={() => setShowZoneModal(true)}
                    aria-label="Action 1"
                    title="Action 1"
                  >
                    <i className="ri-time-line me-1"></i> Quản lý vùng
                  </Button>
                  <Button
                    color="light"
                    className="w-100 mb-2"
                    style={{ height: 40 }}
                    onClick={() => {
                      setShowTrackModal(true)
                      onAction2()
                    }}
                    aria-label="Action 2"
                    title="Action 2"
                  >
                    <i className="ri-time-line me-1"></i> Quản lý tàu theo dõi
                  </Button>
                  {/* <Button
                    color="light"
                    className="w-100"
                    style={{ height: 40 }}
                    onClick={onAction3}
                    aria-label="Action 3"
                    title="Action 3"
                  >
                    <i className="ri-time-line me-1"></i> update sau

                  </Button> */}
                  </>
                  ) : (
                  <>
                  <Button
                    color="light"
                    className="w-100 mb-2"
                    style={{ height: 40 }}
                    aria-label="Action 1"
                    title="Action 1"
                    disabled
                  >
                    <i className="ri-time-line me-1"></i> Quản lý vùng (gói Pro)
                  </Button>
                  <Button
                    color="light"
                    className="w-100 mb-2"
                    style={{ height: 40 }}
                    aria-label="Action 2"
                    title="Action 2"
                    disabled
                  >
                    <i className="ri-time-line me-1"></i> Quản lý tàu theo dõi (gói Pro)
                  </Button>
                  {/* <Button
                    color="light"
                    className="w-100"
                    style={{ height: 40 }}
                    aria-label="Action 3"
                    title="Action 3"
                    disabled
                  >
                    <i className="ri-time-line me-1"></i> update sau (gói Pro)

                  </Button> */}
                  </>

                  )}
                </div>
            </Row>
          </div>
        </DropdownMenu>
      </Dropdown>
      {/* Zone management dialog */}
      <ZoneManager isOpen={showZoneModal} onClose={() => setShowZoneModal(false)} onOpen={() => setShowZoneModal(true)} />
      {/* Track vessel dialog */}
      <TrackVesselModal isOpen={showTrackModal} onClose={() => setShowTrackModal(false)} />
    </React.Fragment>
  )
}

export default HistoryVessel
