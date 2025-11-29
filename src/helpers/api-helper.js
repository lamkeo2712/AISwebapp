import axios from "axios"
import qs from "qs"
import {
  deleteAccessToken,
  deleteRefreshToken,
  getRefreshToken,
  getToken,
  isTokenValid,
  setAccessToken
} from "./tokenHelper"
import { userService } from "../services/user-service"

// Create axios instance
const instance = axios.create({
  timeout: 100000,
  headers: {
    "Content-Type": "application/json"
  },
  baseURL: import.meta.env.VITE_API_URL
})

// Request interceptor
instance.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor
instance.interceptors.response.use(
  (response) => {
    return successHandle(response)
  },
  async (error) => {
    const originalRequest = error.config
    if (!error.response) {
      return Promise.reject(error)
    }
    if (
      originalRequest &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/login") &&
      !originalRequest.url.includes("/refresh")
    ) {
      originalRequest._retry = true

      try {
        const refreshToken = getRefreshToken()

        if (!refreshToken) {
          deleteAccessToken()
          deleteRefreshToken()
          return Promise.reject(error)
        }

        const baseURL = instance.defaults.baseURL || import.meta.env.VITE_API_URL

        const refreshResponse = await axios.post(
          `${baseURL}/api/Authen/refresh`,
          null,
          {
            params: { refreshToken }
          }
        )

        const { accessToken: newAccessToken } = refreshResponse.data || {}

        if (!newAccessToken) {
          deleteAccessToken()
          deleteRefreshToken()
          return Promise.reject(error)
        }

        setAccessToken(newAccessToken)

        originalRequest.headers = originalRequest.headers || {}
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`

        return instance(originalRequest)
      } catch (err) {
        console.log("🚀 ~ refresh token error:", err)
        deleteAccessToken()
        deleteRefreshToken()
        return Promise.reject(err)
      }
    }
    return Promise.reject(error)
  }
)

// Success handler
const successHandle = (response) => {
  if (response.status === 200 || response.status === 201) {
    if (!response.headers["content-type"]?.includes("application/json")) {
      return response
    }
    return response.data
  }
  return {}
}

// GET request
async function get(url, params = {}, headers = {}, responseType) {
  let validParams = params

  if (params) {
    validParams = Object.fromEntries(Object.entries(params).filter(([_, value]) => value !== ""))
  }

  const request = {
    params: validParams,
    paramsSerializer: (params) => qs.stringify(params, { arrayFormat: "repeat" }),
    headers: {
      ...headers
    },
    responseType
  }

  return instance.get(url, request)
}

// POST request
async function post(url, data, headers = {}, responseType) {
  const request = {
    headers,
    responseType
  }

  return instance.post(url, data, request)
}

// PUT request
async function put(url, data, headers = {}, responseType) {
  const request = {
    headers,
    responseType
  }

  return instance.put(url, data, request)
}

// POST FormData
async function postFormData(url, formData, headers = {}, responseType) {
  const request = {
    headers: {
      ...headers,
      "Content-Type": "multipart/form-data"
    },
    responseType
  }

  return instance.post(url, formData, request)
}

// Exporting the functions
export default {
  get,
  post,
  put,
  postFormData
}
