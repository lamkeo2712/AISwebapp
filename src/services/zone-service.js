import apiHelper from "../helpers/api-helper";

class ZoneService {
  searchZones = async (thamSo, userRequest = "") => {
    return await apiHelper.post("/api/Ship/Data/DoRequest", {
      procedureName: "Proc_DM_Vung_Search",
      thamSo: JSON.stringify(thamSo),
      userRequest
    });
  };

  updateZone = async (thamSo, userRequest = "") => {
    return await apiHelper.post("/api/Ship/Data/DoRequest", {
      procedureName: "Proc_DM_Vung_Update",
      thamSo: JSON.stringify(thamSo),
      userRequest
    });
  };

  deleteZone = async (thamSo, userRequest = "") => {
    return await apiHelper.post("/api/Ship/Data/DoRequest", {
      procedureName: "Proc_DM_Vung_Delete",
      thamSo: JSON.stringify(thamSo),
      userRequest
    });
  };
}

export const zoneService = new ZoneService();
