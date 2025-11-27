import apiHelper from "../helpers/api-helper"

class VesselService {
  getLoaiTauLOV = async () => {
    return await apiHelper.post("/api/Ship/Data/GetShipType", {
      "thamSo": JSON.stringify({})
    })
  }

  getVesselList = async (thamSo) => {
    return await apiHelper.post("/api/Ship/Data/GetTau", {
      "thamSo": JSON.stringify(thamSo)
    })
  }

  // Tracked vessels (Danh sách tàu theo dõi)
  getTrackedVessels = async (thamSo) => {
    return await apiHelper.post("/api/Ship/Data/GetTauTD", {
      thamSo: JSON.stringify(thamSo)
    })
  }

  addTrackedVessel = async (thamSo) => {
    return await apiHelper.post("/api/Ship/Data/UpdateTauTD", {
      thamSo: JSON.stringify(thamSo)
    })
  }

  deleteTrackedVessel = async (thamSo) => {
    return await apiHelper.post("/api/Ship/Data/DeleteTauTD", {
      thamSo: JSON.stringify(thamSo)
    })
  }

  getVesselRoute = async (mmsi, hours) => {
    return await apiHelper.post("/api/Ship/Data/GetHanhTrinh", {
      "mmsi": mmsi,
      "hours": hours
    })
  }
}

export const vesselService = new VesselService()
