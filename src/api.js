// URL Web App Apps Script kamu (dari Deploy > Manage deployments).
// Kalau nanti kamu deploy ulang dan URL berubah, cukup update baris ini.
const API_URL =
  "https://script.google.com/macros/s/AKfycbyiBFvd5cNT_qer5yctDDttO37Dj3elsrnaTDMYag3TwlTsjPLyyW0ne91zJeE1W8r-kg/exec";

async function apiGet(action) {
  const res = await fetch(`${API_URL}?action=${encodeURIComponent(action)}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Gagal mengambil data");
  return json.data;
}

// Pakai Content-Type: text/plain supaya browser tidak mengirim
// preflight OPTIONS (Apps Script Web App tidak menghandle OPTIONS,
// jadi request akan gagal kalau dikirim sebagai application/json).
async function apiPost(action, data) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, data }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Gagal mengirim data");
  return json.data;
}

export const fetchLocations = () => apiGet("getLocations");
export const fetchReports = () => apiGet("getReports");
export const createLocation = (data) => apiPost("addLocation", data);
export const createReport = (data) => apiPost("addReport", data);
