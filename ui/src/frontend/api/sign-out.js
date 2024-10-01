import { api } from "../lib/api";

export async function signOut() {
  const { data } = await api.post("/auth/sign-out");

  return data
}