import { api } from "../lib/api"; 

export async function session() {
  const { data } = await api.get("/auth/session", {
    withCredentials: true,
  });

  return data
}