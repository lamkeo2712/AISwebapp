import { create } from "zustand"

const useAisStore = create((set) => ({
  vesselList: [],
  selectedVessel: null,
  loaiTauLOV: [],
  thamSoObject: {},
  setSelectedVessel: (value) => {
    set(() => ({ selectedVessel: value }))
  },
  setVesselList: (value) => {
    set(() => ({ vesselList: value }))
    },
  setLoaiTauLOV: (value) => {
    set(() => ({ loaiTauLOV: value }))
  },
  setThamSoTau: (value) => {
    set((state) => ({ 
      thamSoTau: { ...state.thamSoTau, ...value } 
    }))
  }
}))

export default useAisStore
