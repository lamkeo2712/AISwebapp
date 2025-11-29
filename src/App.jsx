import { defineElement } from "lord-icon-element"
import { loadAnimation } from "lottie-web"
import React from "react"
import AppRoutes from "./routes/AppRoutes"
import { useNotifyHub } from "./hooks/useNotifyHub"
import { toast } from "react-toastify"
import { useAuth } from "./hooks/useAuth"

// register lottie and define custom element
defineElement(loadAnimation)

function App(props) {
  const { user } = useAuth()
  const accessToken = user?.accessToken || user?.token || localStorage.getItem("accessToken")
  
  useNotifyHub(accessToken, (alert) => {
    const type = alert?.Type || alert?.type

    if (type === "BeaconDrift") {
      const name = alert.beaconName || alert.MMSI
      const dist = alert.DistanceMeters ?? alert.distanceMeters

      toast.error(
        `Beacon ${name} bị trôi ~${dist?.toFixed?.(1) ?? dist}m khỏi vị trí chuẩn!`
      )
      toast.info(
        `Đang phát bản tin ${alert.aisSentence}`
      )

      window.dispatchEvent(
        new CustomEvent("virtual-aton-update", {
          detail: {
            MMSI: alert.mmsi,
            VesselName: alert.beaconName || alert.mmsi,
            Latitude: alert.refLat,
            Longitude: alert.refLon,
            AidType: alert.aidType,
            AidTypeID: alert.aidTypeID,
            DateTimeUTC: alert.dateTimeUTC
          },
        })
      )
      return
    }
  })
  
  return <AppRoutes />
}

export default App
