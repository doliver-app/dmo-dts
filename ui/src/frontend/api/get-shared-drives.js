import { api } from "../lib/api"

export async function getSharedDrives() {
  const { data } = await api.get(`/data/get-shared-drives`)
  
  return data
}