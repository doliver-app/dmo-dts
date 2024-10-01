import axios, { isAxiosError } from "axios";

export const api = axios.create({
  baseURL: "/api",
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isAxiosError(error)) {
      const status = error.response?.status
      const code = error.response?.data?.code

      if (status === 401 && code === 'UNAUTHORIZED') {
        window.location.replace('/')
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  },
)