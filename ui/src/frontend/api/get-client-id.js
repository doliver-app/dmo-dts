import { api } from "../lib/api"

export async function getClientId() {
  const { data } = await api.get(`/client-id`)

  return data
}