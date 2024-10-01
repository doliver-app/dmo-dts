export function safeUppercaseFirstLetter(string) {
  if(!string) return "N/A"
  
  try {
    return string.charAt(0).toUpperCase() + string.slice(1)
  } catch {
    return "N/A"
  }
}