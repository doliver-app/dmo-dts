import { api } from "../lib/api"

export async function getBuckets(projectId) {
  const { data } = await api.get(`/data/get-buckets?projectId=${projectId}`)
  return data
}