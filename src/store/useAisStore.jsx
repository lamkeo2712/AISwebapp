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
  ,// zone drawing state
  isDrawingZone: false,
  polygonCoords: [],
  startDrawingZone: () => set(() => ({ isDrawingZone: true })),
  stopDrawingZone: () => set(() => ({ isDrawingZone: false })),
  clearPolygonCoords: () => set(() => ({ polygonCoords: [] })),
  setPolygonCoords: (coords) => set(() => ({ polygonCoords: coords })),
  isZoneEditorOpen: false,
  openZoneEditor: () => set(() => ({ isZoneEditorOpen: true })),
  closeZoneEditor: () => set(() => ({ isZoneEditorOpen: false })),
}))

export default useAisStore
