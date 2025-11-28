import React, { createContext, useEffect, useReducer, useState, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import Spinners from "../components/Spinner"
import { deleteAccessToken, deleteRefreshToken, getRefreshToken, getToken, isTokenValid } from "../helpers/tokenHelper"
import { userService } from "../services/user-service"
import { zoneService } from "../services/zone-service"
import { vesselService } from "../services/vessel-service"

/* Initial state */
const initialState = {
  isAuthenticated: false,
  isInitialized: false,
  user: null,
  infoStaffLogin: null
}

/* Reducer function */
const reducer = (state, action) => {
  switch (action.type) {
    case "INIT": {
      const { isAuthenticated, user, infoStaffLogin } = action.payload
      return {
        ...state,
        isAuthenticated,
        isInitialized: true,
        user,
        infoStaffLogin
      }
    }
    case "LOGOUT":
      return {
        ...state,
        isAuthenticated: false,
        isInitialized: true,
        user: null,
        infoStaffLogin: null
      }
    default:
      return state
  }
}

/* Action creators */
export const init = (payload) => ({
  type: "INIT",
  payload
})

export const logout = () => {
  deleteAccessToken()
  deleteRefreshToken()
  return {
    type: "LOGOUT"
  }
}

/* Context creation */
const AuthContext = createContext({
  ...initialState,
  dispatch: () => null
})

/* AuthProvider component */
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const checkTokens = async () => {
      setIsLoading(true)
      const accessToken = getToken()
      const refreshToken = getRefreshToken()
      try {
        if (isTokenValid(accessToken) || isTokenValid(refreshToken)) {
          const userResponse = await userService.getUserInfo()
          dispatch(init({ isAuthenticated: true, user: userResponse }))
        } else {
          dispatch(logout())
          if (location.pathname.indexOf("auth") === 0) {
            navigate("/auth/login")
          }
        }
      } catch (error) {
        console.error("Error during token check:", error)
        toast.error("An error occurred. Please try again later")
        dispatch(init({ isInitialized: true }))
        deleteAccessToken()
        navigate("/auth/login")
      } finally {
        setIsLoading(false)
      }
    }

    checkTokens()
  }, [dispatch])

  // Show vessel-count toasts for all zones once when authentication is established
  const shownZoneToastsRef = useRef(false)
  const fetchAndShowZoneToasts = async () => {
    if (shownZoneToastsRef.current) return
    shownZoneToastsRef.current = true
    try {
      const userId = state.user.id || state.user.ID || state.user.UserID || state.user.userId
      if (!userId) return
      const zRes = await zoneService.searchZones({ UserID: userId, PageSize: 100, PageIndex: 0 }, String(userId))
      const zArrays = Object.values(zRes || {}).filter((v) => Array.isArray(v))
      const zonesList = zArrays.find((arr) => arr.length > 0 && arr[0] && Object.prototype.hasOwnProperty.call(arr[0], 'TenVung')) || []
      if (zonesList.length === 0) {
        // No zones configured for this user
        toast.info('Bạn chưa có vùng cảnh báo nào', { autoClose: 5000 })
      } else {
        const fetchPromises = zonesList.map((z) => {
          if (!z.Polygon) return Promise.resolve({ zone: z, list: [] })
          return vesselService
            .searchVesselsInPolygon({ Polygon: z.Polygon })
            .then((vRes) => {
              const vArrays = Object.values(vRes || {}).filter((v) => Array.isArray(v))
              const vList = vArrays.find((arr) => arr.length > 0 && (arr[0].MMSI || arr[0].VesselName || arr[0].TenTau)) || []
              return { zone: z, list: vList }
            })
            .catch((e) => {
              console.error('Error fetching vessels for zone', z, e)
              return { zone: z, list: [] }
            })
        })

        const results = await Promise.all(fetchPromises)
        const totalShips = results.reduce((acc, r) => acc + (r.list?.length || 0), 0)
        const zonesWithShips = results.filter((r) => (r.list?.length || 0) > 0)

        if (totalShips === 0) {
          toast.info('Không có tàu trong các vùng cảnh báo hiện tại', { autoClose: 5000 })
        } else {
          // Summary toast
          //toast.info(`Có ${totalShips} tàu đang có trong ${zonesWithShips.length} vùng cảnh báo`, { autoClose: 6000 })
          // Also show per-zone toasts for up to 3 zones to avoid flooding
          zonesWithShips.slice(0, 3).forEach(({ zone: z, list }) => {
            const zoneName = z.TenVung || z.name || ''
            const nameSuffix = zoneName ? ` "${zoneName}"` : ''
            toast.info(`Có ${list.length} tàu đang có trong vùng cảnh báo${nameSuffix}`, { autoClose: 5000 })
          })
        }
      }
    } catch (err) {
      console.error('Error fetching zones/vessels in AuthProvider:', err)
    }
  }

  useEffect(() => {
    if (!state.isInitialized) return
    if (!state.isAuthenticated || !state.user) return
    fetchAndShowZoneToasts()
  }, [state.isInitialized, state.isAuthenticated, state.user])

  // Listen for explicit trigger (e.g., after login navigation) to ensure toasts show when entering from login
  useEffect(() => {
    const handler = () => {
      if (!state.isAuthenticated || !state.user) return
      fetchAndShowZoneToasts()
    }
    window.addEventListener('trigger-zone-toasts', handler)
    return () => window.removeEventListener('trigger-zone-toasts', handler)
  }, [state.isAuthenticated, state.user])

  const countRef = useRef(0);

  useEffect(() => {
    const fetchVesselMovements = async () => {
      try {
        const userId = state.user?.id || state.user?.UserID;
        if (!userId) return;

        const zonesResponse = await zoneService.searchZones({ UserID: userId, PageSize: 100, PageIndex: 0 }, String(userId));
        const zones = Object.values(zonesResponse || {}).flat().filter(zone => zone.Polygon);

        let totalCount = 100;
        for (const zone of zones) {
          const params = { Polygon: zone.Polygon };
          const vesselsResponse = await vesselService.searchVesselsInPolygon(params);
          totalCount += vesselsResponse?.Count || 0;
        }

        const previousCount = countRef.current;
        const entered = totalCount > previousCount ? totalCount - previousCount : 0;
        const exited = totalCount < previousCount ? totalCount - previousCount : 0;

        countRef.current = totalCount;

        toast.info(
          `Tàu vào: ${entered}, Tàu ra: ${exited}`,
          { autoClose: 5000 }
        );
      } catch (error) {
        console.error("Error fetching vessel movements:", error);
      }
    };

    const intervalId = setInterval(fetchVesselMovements, 3 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [state.user])

  if (isLoading) {
    return <Spinners />
  }

  return <AuthContext.Provider value={{ ...state, dispatch }}>{children}</AuthContext.Provider>
}

export default AuthContext
