import { api } from "../lib/api";

export async function signIn(token) {
  const { data } = await api.post("/auth/sign-in", {
    token,
  }, { withCredentials: true });

  return data
}