import { api } from "../lib/api"

export async function getGroup(groupEmail) {
  const { data } = await api.get(`/data/get-group?groupEmail=${groupEmail}`)
  return data
}