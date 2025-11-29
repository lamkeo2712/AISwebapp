import { useEffect, useRef } from "react"
import * as signalR from "@microsoft/signalr"

export function useNotifyHub(accessToken, onAlert) {
  const connectionRef = useRef(null)

  useEffect(() => {
    if (!accessToken) {
      // nếu trước đó đã có connection thì stop
      if (connectionRef.current) {
        connectionRef.current.stop().catch(() => {})
        connectionRef.current = null
      }
      return
    }
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:8080"

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${apiBase}/notifyHub`, {
        accessTokenFactory: () => localStorage.getItem("accessToken") || ""
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build()

    connectionRef.current = connection

    connection.on("ReceiveAlert", (alert) => {
      if (typeof onAlert === "function") {
        onAlert(alert)
      }
    })

    connection.on("Pong", (msg) => {
      console.log("Pong from server:", msg)
    })

    connection
      .start()
      .then(() => {
        console.log("SignalR connected to /notifyHub")
      })
      .catch((err) => {
        console.error("SignalR connect error:", err)
      })

    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop().catch(() => {})
      }
    }
  }, [onAlert])
}
