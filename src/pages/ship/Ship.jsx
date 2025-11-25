import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardBody, CardHeader, Col, Container, Row } from "reactstrap"
import { toast } from "react-toastify"
import BreadCrumb from "../../components/BreadCrumb"
import TableCommon from "../../components/TableCommon"
import { vesselService } from "../../services/vessel-service"
import { tranformApiData } from "../../helpers/common-helper"
const Ship = () => {
  const [data, setData] = useState([])
  const [showSearch, setShowSearch] = useState(false)
  const [searchValues, setSearchValues] = useState({})
  const [loading, setLoading] = useState(false)
  const [shipTypes, setShipTypes] = useState([])

  const fetchShipTypes = useCallback(async () => {
    try {
      const response = await vesselService.getLoaiTauLOV()
      const types = (response?.DM_ShipType || []).map((item) => ({
        value: item.ShipType || "",
        label: item.ShipType || ""
      }))
      // Prepend an 'All' option for ship type filter
      const defaultOption = { value: "", label: "Tất cả" }
      setShipTypes([defaultOption, ...types])
    } catch (error) {
      console.error("Error fetching ship types:", error)
    }
  }, [])

  const fetchShips = useCallback(async () => {
    setLoading(true)
    try {
      const response = await vesselService.getVesselList({})
      const vessels = (response?.DM_Tau || []).map((item) => tranformApiData(item))
      setData(vessels)
    } catch (error) {
      console.error("Error fetching ships:", error)
      toast.error("Có lỗi xảy ra khi tải danh sách tàu")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchShipTypes()
    fetchShips()
  }, [fetchShipTypes, fetchShips])

  // Populate shipTypes based on unique ShipType values from the fetched ships
  useEffect(() => {
    const uniqueTypes = Array.from(
      new Set(
        data.map(item => item.ShipType).filter(type => type)
      )
    )
    const typeOptions = uniqueTypes.map(type => ({ value: type, label: type }))
    // Prepend 'Tất cả'
    setShipTypes([{ value: "", label: "Tất cả" }, ...typeOptions])
  }, [data])

  const filteredData = useMemo(() => {
    const activeFilters = Object.entries(searchValues).filter(([, value]) => value)
    if (activeFilters.length === 0) {
      return data
    }

    return data.filter((item) =>
      activeFilters.every(([key, value]) =>
        `${item?.[key] ?? ""}`.toLowerCase().includes(`${value}`.trim().toLowerCase())
      )
    )
  }, [data, searchValues])

  const columns = useMemo(
    () => [
      {
        accessorKey: "VesselName",
        header: () => "Tên tàu",
        size: 20,
        meta: {
          allowSearch: true
        }
      },
      {
        accessorKey: "MMSI",
        header: () => "MMSI",
        size: 30,
        meta: {
          allowSearch: true
        }
      },
      {
        accessorKey: "ShipType",
        header: () => "Loại tàu",
        size: 30,
        meta: {
          allowSearch: true,
          searchType: "select",
          options: shipTypes
        }
      }
    ],
    [shipTypes]
  )

  return (
    <React.Fragment>
      <div className="page-content" style={{ paddingTop: "1.0rem" }}>
        <Container fluid>
          <Row>
            <Col>
              <Card>
                <CardHeader className="border-0">
                  <div className="d-flex align-items-center">
                    <h5 className="card-title mb-0 flex-grow-1">Danh sách tàu thuyền</h5>
                    <div className="flex-shrink-0">
                      <div className="d-flex flex-wrap gap-2">
                        <button type="button" className="btn btn-info" onClick={() => setShowSearch(!showSearch)}>
                          <i className="ri-search-line me-1 align-bottom"></i> Tìm kiếm
                        </button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardBody className="p-4" style={{ paddingTop: "1.0rem" }}>
                  <div className="ship-table-scroll" style={{ maxHeight: "600px", overflowY: "auto" }}>
                    <TableCommon
                      columns={columns}
                      data={filteredData}
                      showSearch={showSearch}
                      searchValues={searchValues}
                      setSearchValues={setSearchValues}
                      loading={loading}
                    />
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    </React.Fragment>
  )
}

export default Ship
