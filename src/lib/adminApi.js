const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

export async function callAdminApi(password, action, payload = {}) {
  const res = await fetch(`${FUNCTIONS_URL}/admin-api`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-admin-password': password,
    },
    body: JSON.stringify({ action, payload }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'リクエストに失敗しました。')
  return json.data
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
