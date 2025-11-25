import apiHelper from "../helpers/api-helper"

class VesselService {
  getLoaiTauLOV = async () => {
    return await apiHelper.post("/api/Ship/Data/DoRequest", {
      "procedureName": "Proc_DM_ShipType_Search",
      "thamSo": JSON.stringify({})
    })
  }

  getVesselList = async (thamSo) => {
    return await apiHelper.post("/api/Ship/Data/DoRequest", {
      "procedureName": "Proc_DM_Tau_Search2",
      "thamSo": JSON.stringify(thamSo)
    })
  }

  // Tracked vessels (Danh sách tàu theo dõi)
  getTrackedVessels = async (thamSo) => {
    return await apiHelper.post("/api/Ship/Data/DoRequest", {
      procedureName: "Proc_DM_Tau_TD_Search",
      thamSo: JSON.stringify(thamSo)
    })
  }

  addTrackedVessel = async (thamSo) => {
    return await apiHelper.post("/api/Ship/Data/DoRequest", {
      procedureName: "Proc_DM_Tau_TD_Update",
      thamSo: JSON.stringify(thamSo)
    })
  }

  deleteTrackedVessel = async (thamSo) => {
    return await apiHelper.post("/api/Ship/Data/DoRequest", {
      procedureName: "Proc_DM_Tau_TD_Delete",
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
