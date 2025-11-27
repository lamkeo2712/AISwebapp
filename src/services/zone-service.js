import apiHelper from "../helpers/api-helper";

class ZoneService {
  searchZones = async (thamSo, userRequest = "") => {
    return await apiHelper.post("/api/Ship/Data/GetVung", {
      thamSo: JSON.stringify(thamSo),
      userRequest
    });
  };

  updateZone = async (thamSo, userRequest = "") => {
    return await apiHelper.post("/api/Ship/Data/UpdateVung", {
      thamSo: JSON.stringify(thamSo),
      userRequest
    });
  };

  deleteZone = async (thamSo, userRequest = "") => {
    return await apiHelper.post("/api/Ship/Data/DeleteVung", {
      thamSo: JSON.stringify(thamSo),
      userRequest
    });
  };
}

export const zoneService = new ZoneService();
