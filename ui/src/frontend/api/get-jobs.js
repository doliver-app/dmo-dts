import { api } from "../lib/api"

export async function getJobs({
  page,
  itemsPerPage,
}) {
  const { data } = await api.get(`/data/get-jobs?limit=${itemsPerPage}&page=${page}`)

  return data
}