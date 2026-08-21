import { useState, useEffect } from "react";
import radarIcon from "./radar.svg";
import {
  ShieldCheck,
  ShieldAlert,
  ClipboardList,
  MapPin,
  Camera,
  Plus,
  X,
  Loader2,
  Trash2,
  ExternalLink,
  Crosshair,
  RadioTower,
  ChevronRight,
  ChevronLeft,
  Image as ImageIcon,
  Sun,
  Moon,
} from "lucide-react";
import { fetchLocations, fetchReports, createLocation, createReport } from "./api.js";

function formatDateTime(ts) {
  return new Date(ts).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "baru saja";
  if (min < 60) return `${min} mnt lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const d = Math.floor(hr / 24);
  return `${d} hr lalu`;
}

function gmapsUrl(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function osmEmbedUrl(lat, lng, delta = 0.0035) {
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation tidak didukung perangkat ini"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

function compressImage(file, maxWidth = 900, quality = 0.62) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Gagal memuat gambar"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.readAsDataURL(file);
  });
}

export default function SecurityMonitor() {
  const [tab, setTab] = useState("dashboard");
  const [theme, setTheme] = useState("light");
  const [locations, setLocations] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewReport, setViewReport] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [locs, reps] = await Promise.all([fetchLocations(), fetchReports()]);
      setLocations(locs);
      setReports(reps.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    } catch (e) {
      console.error(e);
      showToast("Gagal memuat data dari server", "error");
    }
    setLoading(false);
  }

  function showToast(msg, type = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }

  async function addLocation(loc) {
    try {
      // createLocation() lewat form+iframe tidak bisa mengembalikan data
      // (respons cross-origin tidak bisa dibaca JS), jadi kita refetch dari
      // sheet supaya state di React sinkron dengan data yang sebenarnya tersimpan.
      await createLocation(loc);
      await loadAll();
      showToast("Titik pantau berhasil didaftarkan");
    } catch (e) {
      showToast(e.message || "Gagal menyimpan titik pantau", "error");
    }
  }

  function deleteLocation() {
    // Penghapusan titik dilakukan langsung di Google Sheets (kolom "Daftar Titik")
    // agar riwayat laporan tetap konsisten dengan data di Rekap.
    showToast("Hapus titik pantau langsung dari Google Sheet 'Daftar Titik'", "error");
  }

  async function addReport(meta, photoDataUrl) {
    try {
      const loc = locations.find((l) => l.id === meta.locationId);
      // Sama seperti addLocation: refetch dari sheet setelah kirim,
      // bukan pakai hasil balikan createReport() (tidak tersedia).
      await createReport({
        ...meta,
        locationName: loc ? loc.name : "",
        photo: photoDataUrl || null,
      });
      await loadAll();
      showToast("Laporan berhasil dikirim");
    } catch (e) {
      showToast(e.message || "Gagal mengirim laporan", "error");
      throw e;
    }
  }

  function toggleTheme() {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }

  const totalReports = reports.length;
  const amanCount = reports.filter((r) => r.status === "aman").length;
  const tidakAmanCount = reports.filter((r) => r.status === "tidak_aman").length;

  const latestByLocation = {};
  reports.forEach((r) => {
    if (
      !latestByLocation[r.locationId] ||
      new Date(r.timestamp) > new Date(latestByLocation[r.locationId].timestamp)
    ) {
      latestByLocation[r.locationId] = r;
    }
  });

  return (
    <div className={`secmon-root theme-${theme}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

        .secmon-root {
          --bg-base: #0a0f1c;
          --bg-panel: #101828;
          --bg-panel-alt: #141d30;
          --bg-raised: #1a2438;
          --border: #223049;
          --border-soft: #1a2438;
          --text-primary: #eaf0fa;
          --text-muted: #8291ab;
          --text-dim: #5b6a85;
          --accent: #f5a623;
          --accent-dim: #7a5719;
          --safe: #34d399;
          --safe-dim: #113328;
          --unsafe: #fb5b5b;
          --unsafe-dim: #3a1414;
          font-family: 'Inter', sans-serif;
          background: var(--bg-base);
          color: var(--text-primary);
          min-height: 100vh;
          width: 100%;
          box-sizing: border-box;
          transition: background 0.2s ease, color 0.2s ease;
        }
        .secmon-root.theme-light {
          --bg-base: #f4f6fb;
          --bg-panel: #ffffff;
          --bg-panel-alt: #f7f9fc;
          --bg-raised: #eef1f8;
          --border: #dde3ef;
          --border-soft: #e8ecf5;
          --text-primary: #131b2c;
          --text-muted: #5b6478;
          --text-dim: #9399ab;
          --accent: #d9860a;
          --accent-dim: #f3d9ad;
          --safe: #0f9d63;
          --safe-dim: #e2f7ec;
          --unsafe: #e0393f;
          --unsafe-dim: #fbe4e4;
        }
        .secmon-root * { transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease; }
        .secmon-root *, .secmon-root *::before, .secmon-root *::after { box-sizing: border-box; }
        .secmon-root h1, .secmon-root h2, .secmon-root h3, .secmon-root .disp {
          font-family: 'Space Grotesk', sans-serif;
        }
        .secmon-mono { font-family: 'JetBrains Mono', monospace; }

        .secmon-shell { max-width: 1180px; margin: 0 auto; padding: 20px 20px 60px; }

        .secmon-topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding-bottom: 18px; margin-bottom: 20px; border-bottom: 1px solid var(--border-soft);
          flex-wrap: wrap; gap: 14px;
        }
        .secmon-brand { display: flex; align-items: center; gap: 10px; }
        .secmon-brand-mark {
          width: 34px; height: 34px; border-radius: 8px; background: linear-gradient(155deg, var(--accent), #b97300);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          box-shadow: 0 0 0 1px var(--accent-dim), 0 4px 14px -4px rgba(245,166,35,0.5);
        }
        .secmon-brand-text h1 { font-size: 17px; font-weight: 700; margin: 0; letter-spacing: 0.01em; }
        .secmon-brand-text span { font-size: 11px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; letter-spacing: 0.04em; }

        .secmon-nav { display: flex; gap: 4px; background: var(--bg-panel); border: 1px solid var(--border-soft); border-radius: 10px; padding: 4px; }
        .secmon-nav button {
          font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; color: var(--text-muted);
          background: transparent; border: none; padding: 8px 14px; border-radius: 7px; cursor: pointer;
          display: flex; align-items: center; gap: 6px; transition: all 0.15s ease;
        }
        .secmon-nav button:hover { color: var(--text-primary); }
        .secmon-nav button.active { background: var(--bg-raised); color: var(--text-primary); box-shadow: inset 0 0 0 1px var(--border); }

        .secmon-topbar-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .secmon-theme-btn {
          width: 38px; height: 38px; border-radius: 10px; background: var(--bg-panel);
          border: 1px solid var(--border-soft); color: var(--text-muted);
          display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
        }
        .secmon-theme-btn:hover { color: var(--accent); border-color: var(--accent-dim); }

        .secmon-toast {
          position: fixed; top: 20px; right: 20px; z-index: 100;
          background: var(--bg-raised); border: 1px solid var(--border); border-radius: 10px;
          padding: 12px 16px; font-size: 13px; font-weight: 500; box-shadow: 0 10px 30px -8px rgba(0,0,0,0.6);
          animation: secmon-slide-in 0.25s ease;
        }
        .secmon-toast.error { border-color: rgba(251,91,91,0.4); color: #ffb3b3; }
        @keyframes secmon-slide-in { from { transform: translateY(-8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        .secmon-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100px 0; color: var(--text-muted); gap: 12px; }
        .secmon-spin { animation: secmon-rotate 0.9s linear infinite; }
        @keyframes secmon-rotate { to { transform: rotate(360deg); } }

        .secmon-beacon-wrap { margin-bottom: 22px; }
        .secmon-beacon-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.09em; color: var(--text-dim); font-weight: 600; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
        .secmon-beacon-strip { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 6px; }
        .secmon-beacon-card {
          flex: 0 0 auto; min-width: 168px; background: var(--bg-panel); border: 1px solid var(--border-soft);
          border-radius: 12px; padding: 12px 14px; position: relative;
        }
        .secmon-beacon-dot-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .secmon-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
        .secmon-dot.safe { background: var(--safe); box-shadow: 0 0 0 4px rgba(52,211,153,0.15); }
        .secmon-dot.unsafe { background: var(--unsafe); box-shadow: 0 0 0 4px rgba(251,91,91,0.18); animation: secmon-pulse 1.4s ease-in-out infinite; }
        .secmon-dot.none { background: var(--text-dim); }
        @keyframes secmon-pulse { 0%,100% { box-shadow: 0 0 0 4px rgba(251,91,91,0.18); } 50% { box-shadow: 0 0 0 8px rgba(251,91,91,0.08); } }
        @media (prefers-reduced-motion: reduce) { .secmon-dot.unsafe { animation: none; } }
        .secmon-beacon-name { font-size: 12.5px; font-weight: 600; color: var(--text-primary); }
        .secmon-beacon-meta { font-size: 10.5px; color: var(--text-dim); font-family: 'JetBrains Mono', monospace; }

        .secmon-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 24px; }
        .secmon-stat { background: var(--bg-panel); border: 1px solid var(--border-soft); border-radius: 14px; padding: 18px 20px; position: relative; overflow: hidden; }
        .secmon-stat::after { content: ''; position: absolute; top: -20px; right: -20px; width: 90px; height: 90px; border-radius: 50%; opacity: 0.08; }
        .secmon-stat.total::after { background: var(--accent); }
        .secmon-stat.safe::after { background: var(--safe); }
        .secmon-stat.unsafe::after { background: var(--unsafe); }
        .secmon-stat-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .secmon-stat-icon { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
        .secmon-stat.total .secmon-stat-icon { background: rgba(245,166,35,0.14); color: var(--accent); }
        .secmon-stat.safe .secmon-stat-icon { background: rgba(52,211,153,0.14); color: var(--safe); }
        .secmon-stat.unsafe .secmon-stat-icon { background: rgba(251,91,91,0.14); color: var(--unsafe); }
        .secmon-stat-num { font-family: 'JetBrains Mono', monospace; font-size: 32px; font-weight: 600; line-height: 1; margin-bottom: 4px; }
        .secmon-stat-title { font-size: 12px; color: var(--text-muted); font-weight: 500; }

        .secmon-panel { background: var(--bg-panel); border: 1px solid var(--border-soft); border-radius: 14px; overflow: hidden; }
        .secmon-panel-head { padding: 16px 20px; border-bottom: 1px solid var(--border-soft); display: flex; align-items: center; justify-content: space-between; }
        .secmon-panel-head h2 { font-size: 14px; font-weight: 700; margin: 0; }
        .secmon-empty { padding: 44px 20px; text-align: center; color: var(--text-dim); font-size: 13px; }

        .secmon-table { width: 100%; border-collapse: collapse; }
        .secmon-table th { text-align: left; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-dim); font-weight: 600; padding: 10px 20px; border-bottom: 1px solid var(--border-soft); }
        .secmon-table td { padding: 12px 20px; font-size: 13px; border-bottom: 1px solid var(--border-soft); vertical-align: middle; }
        .secmon-table tr:last-child td { border-bottom: none; }
        .secmon-table tr:hover td { background: rgba(255,255,255,0.015); }
        .secmon-loc-cell { font-weight: 600; }
        .secmon-loc-sub { font-size: 11px; color: var(--text-dim); }
        .secmon-time-cell { font-family: 'JetBrains Mono', monospace; font-size: 11.5px; color: var(--text-muted); white-space: nowrap; }
        .secmon-note-cell { color: var(--text-muted); max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .secmon-badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.01em; }
        .secmon-badge.safe { background: var(--safe-dim); color: var(--safe); }
        .secmon-badge.unsafe { background: var(--unsafe-dim); color: var(--unsafe); }

        .secmon-icon-btn { background: var(--bg-raised); border: 1px solid var(--border); color: var(--text-muted); width: 30px; height: 30px; border-radius: 7px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s; }
        .secmon-icon-btn:hover { color: var(--text-primary); border-color: var(--accent-dim); }

        .secmon-btn { font-family: 'Inter', sans-serif; font-weight: 600; font-size: 13.5px; border-radius: 9px; padding: 10px 18px; cursor: pointer; border: none; display: inline-flex; align-items: center; gap: 7px; transition: all 0.15s; }
        .secmon-btn.primary { background: var(--accent); color: #1a1206; }
        .secmon-btn.primary:hover { background: #ffb840; }
        .secmon-btn.primary:disabled { background: var(--accent-dim); color: #a3813c; cursor: not-allowed; }
        .secmon-btn.ghost { background: var(--bg-raised); color: var(--text-primary); border: 1px solid var(--border); }
        .secmon-btn.ghost:hover { border-color: var(--accent-dim); }
        .secmon-btn.danger { background: var(--unsafe-dim); color: var(--unsafe); }

        .secmon-form-grid { display: grid; gap: 16px; }
        .secmon-field label { display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 7px; }
        .secmon-field .req { color: var(--unsafe); }
        .secmon-input, .secmon-select, .secmon-textarea {
          width: 100%; background: var(--bg-raised); border: 1px solid var(--border); border-radius: 9px;
          padding: 10px 12px; color: var(--text-primary); font-family: 'Inter', sans-serif; font-size: 13.5px;
        }
        .secmon-input:focus, .secmon-select:focus, .secmon-textarea:focus { outline: none; border-color: var(--accent); }
        .secmon-textarea { resize: vertical; min-height: 80px; }
        .secmon-input::placeholder, .secmon-textarea::placeholder { color: var(--text-dim); }

        .secmon-status-toggle { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .secmon-status-opt {
          border: 1.5px solid var(--border); border-radius: 10px; padding: 14px; cursor: pointer;
          display: flex; align-items: center; gap: 10px; background: var(--bg-raised); transition: all 0.15s;
        }
        .secmon-status-opt.safe.active { border-color: var(--safe); background: var(--safe-dim); }
        .secmon-status-opt.unsafe.active { border-color: var(--unsafe); background: var(--unsafe-dim); }
        .secmon-status-opt span { font-weight: 700; font-size: 13.5px; }
        .secmon-status-opt.safe span { color: var(--safe); }
        .secmon-status-opt.unsafe span { color: var(--unsafe); }

        .secmon-photo-drop {
          border: 1.5px dashed var(--border); border-radius: 12px; padding: 20px; text-align: center; cursor: pointer;
          color: var(--text-muted); background: var(--bg-raised); position: relative; overflow: hidden;
        }
        .secmon-photo-drop:hover { border-color: var(--accent-dim); }
        .secmon-photo-preview { width: 100%; max-height: 260px; object-fit: cover; border-radius: 9px; display: block; }
        .secmon-photo-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }

        .secmon-geo-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .secmon-geo-chip { font-family: 'JetBrains Mono', monospace; font-size: 12px; background: var(--bg-raised); border: 1px solid var(--border); padding: 8px 12px; border-radius: 8px; color: var(--text-muted); flex: 1; min-width: 180px; }
        .secmon-geo-chip.set { color: var(--accent); border-color: var(--accent-dim); }

        .secmon-loc-card {
          background: var(--bg-panel); border: 1px solid var(--border-soft); border-radius: 12px; padding: 16px;
          display: flex; justify-content: space-between; gap: 14px; align-items: flex-start;
        }
        .secmon-loc-card h3 { font-size: 14px; margin: 0 0 4px; }
        .secmon-loc-card p { font-size: 12.5px; color: var(--text-muted); margin: 0 0 8px; line-height: 1.5; }
        .secmon-loc-card a { font-size: 11.5px; color: var(--accent); text-decoration: none; display: inline-flex; align-items: center; gap: 4px; font-family: 'JetBrains Mono', monospace; }
        .secmon-loc-list { display: grid; gap: 10px; padding: 16px 20px; }

        .secmon-modal-backdrop { position: fixed; inset: 0; background: rgba(4,7,14,0.72); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
        .secmon-modal { background: var(--bg-panel); border: 1px solid var(--border); border-radius: 16px; max-width: 520px; width: 100%; max-height: 88vh; overflow-y: auto; }
        .secmon-modal-head { padding: 16px 20px; border-bottom: 1px solid var(--border-soft); display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: var(--bg-panel); z-index: 1; }
        .secmon-modal-body { padding: 20px; display: grid; gap: 16px; }
        .secmon-modal-img { width: 100%; border-radius: 10px; display: block; background: var(--bg-raised); }
        .secmon-modal-map { width: 100%; height: 200px; border-radius: 10px; border: 1px solid var(--border); }
        .secmon-detail-row { display: flex; justify-content: space-between; font-size: 13px; padding: 8px 0; border-bottom: 1px solid var(--border-soft); }
        .secmon-detail-row:last-child { border-bottom: none; }
        .secmon-detail-row span:first-child { color: var(--text-muted); }
        .secmon-detail-row span:last-child { font-weight: 600; text-align: right; }
        .secmon-note-block { background: var(--bg-raised); border: 1px solid var(--border-soft); border-radius: 10px; padding: 12px 14px; font-size: 13px; color: var(--text-primary); line-height: 1.55; }

        .secmon-pagination {
          display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
          padding: 14px 20px; border-top: 1px solid var(--border-soft);
        }
        .secmon-pagination-size { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-muted); }
        .secmon-pagination-size select {
          background: var(--bg-raised); border: 1px solid var(--border); color: var(--text-primary);
          font-family: 'Inter', sans-serif; font-size: 12.5px; font-weight: 600; border-radius: 7px;
          padding: 6px 10px; cursor: pointer;
        }
        .secmon-pagination-size select:focus { outline: none; border-color: var(--accent); }
        .secmon-pagination-nav { display: flex; align-items: center; gap: 6px; }
        .secmon-pagination-info { font-size: 11.5px; color: var(--text-dim); font-family: 'JetBrains Mono', monospace; margin-right: 4px; }
        .secmon-page-btn {
          background: var(--bg-raised); border: 1px solid var(--border); color: var(--text-muted);
          width: 28px; height: 28px; border-radius: 7px; display: inline-flex; align-items: center; justify-content: center;
          cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.15s;
        }
        .secmon-page-btn:hover:not(:disabled) { color: var(--text-primary); border-color: var(--accent-dim); }
        .secmon-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .secmon-page-btn.active { background: var(--accent); color: #1a1206; border-color: var(--accent); }

        .secmon-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 620px) {
          .secmon-two-col { grid-template-columns: 1fr; }
          .secmon-table thead { display: none; }
          .secmon-table, .secmon-table tbody, .secmon-table tr, .secmon-table td { display: block; width: 100%; }
          .secmon-table tr { padding: 12px 20px; border-bottom: 1px solid var(--border-soft); }
          .secmon-table td { padding: 3px 0; border-bottom: none; }
        }
      `}</style>

      <div className="secmon-shell">
        <div className="secmon-topbar">
          <div className="secmon-brand">
            <div className="secmon-brand-mark">
              <img src={radarIcon} alt="Logo" style={{ width: 18, height: 18 }} />
            </div>
            <div className="secmon-brand-text">
              <h1>Pos Pantau</h1>
              <span>SISTEM MONITORING KEAMANAN TITIK</span>
            </div>
          </div>
          <div className="secmon-topbar-right">
            <nav className="secmon-nav">
              <button className={tab === "dashboard" ? "active" : ""} onClick={() => setTab("dashboard")}>
                <ClipboardList size={15} /> Dashboard
              </button>
              <button className={tab === "report" ? "active" : ""} onClick={() => setTab("report")}>
                <Camera size={15} /> Buat Laporan
              </button>
              <button className={tab === "locations" ? "active" : ""} onClick={() => setTab("locations")}>
                <MapPin size={15} /> Titik Pantau
              </button>
            </nav>
            <button
              type="button"
              className="secmon-theme-btn"
              onClick={toggleTheme}
              title={theme === "light" ? "Ganti ke mode gelap" : "Ganti ke mode terang"}
            >
              {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="secmon-loading">
            <Loader2 size={26} className="secmon-spin" />
            <span>Memuat data patroli…</span>
          </div>
        ) : tab === "dashboard" ? (
          <Dashboard
            locations={locations}
            reports={reports}
            latestByLocation={latestByLocation}
            totalReports={totalReports}
            amanCount={amanCount}
            tidakAmanCount={tidakAmanCount}
            onView={(r) => setViewReport(r)}
            goReport={() => setTab("report")}
            goLocations={() => setTab("locations")}
          />
        ) : tab === "report" ? (
          <ReportForm locations={locations} onSubmit={addReport} goLocations={() => setTab("locations")} />
        ) : (
          <LocationManager locations={locations} onAdd={addLocation} onDelete={deleteLocation} />
        )}
      </div>

      {viewReport && (
        <ReportModal
          report={viewReport}
          location={locations.find((l) => l.id === viewReport.locationId)}
          onClose={() => setViewReport(null)}
        />
      )}

      {toast && <div className={`secmon-toast ${toast.type === "error" ? "error" : ""}`}>{toast.msg}</div>}
    </div>
  );
}

function Dashboard({ locations, reports, latestByLocation, totalReports, amanCount, tidakAmanCount, onView, goReport, goLocations }) {
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(reports.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const pagedReports = reports.slice(startIdx, startIdx + pageSize);

  function handlePageSizeChange(e) {
    setPageSize(Number(e.target.value));
    setPage(1);
  }

  function pageNumbers() {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const nums = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
    const sorted = [...nums].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
    const result = [];
    sorted.forEach((n, i) => {
      if (i > 0 && n - sorted[i - 1] > 1) result.push("…");
      result.push(n);
    });
    return result;
  }

  return (
    <div>
      {locations.length > 0 && (
        <div className="secmon-beacon-wrap">
          <div className="secmon-beacon-label"><img src={radarIcon} alt="Logo" style={{ width: 12, height: 12 }} /> Status titik terpantau</div>
          <div className="secmon-beacon-strip">
            {locations.map((loc) => {
              const latest = latestByLocation[loc.id];
              const state = !latest ? "none" : latest.status === "aman" ? "safe" : "unsafe";
              return (
                <div key={loc.id} className="secmon-beacon-card">
                  <div className="secmon-beacon-dot-row">
                    <div className={`secmon-dot ${state}`} />
                    <div className="secmon-beacon-name">{loc.name}</div>
                  </div>
                  <div className="secmon-beacon-meta">{latest ? timeAgo(latest.timestamp) : "belum ada laporan"}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="secmon-stats">
        <div className="secmon-stat total">
          <div className="secmon-stat-top">
            <div className="secmon-stat-icon"><ClipboardList size={16} /></div>
          </div>
          <div className="secmon-stat-num">{totalReports}</div>
          <div className="secmon-stat-title">Total laporan dari titik terpantau</div>
        </div>
        <div className="secmon-stat safe">
          <div className="secmon-stat-top">
            <div className="secmon-stat-icon"><ShieldCheck size={16} /></div>
          </div>
          <div className="secmon-stat-num">{amanCount}</div>
          <div className="secmon-stat-title">Kondisi aman</div>
        </div>
        <div className="secmon-stat unsafe">
          <div className="secmon-stat-top">
            <div className="secmon-stat-icon"><ShieldAlert size={16} /></div>
          </div>
          <div className="secmon-stat-num">{tidakAmanCount}</div>
          <div className="secmon-stat-title">Kondisi tidak aman</div>
        </div>
      </div>

      <div className="secmon-panel">
        <div className="secmon-panel-head">
          <h2>Laporan terbaru</h2>
          <button className="secmon-btn primary" onClick={goReport}><Plus size={14} /> Laporan Baru</button>
        </div>
        {reports.length === 0 ? (
          <div className="secmon-empty">
            {locations.length === 0
              ? <>Belum ada titik pantau terdaftar. <a href="#" onClick={(e) => { e.preventDefault(); goLocations(); }} style={{color:"var(--accent)"}}>Daftarkan titik pertama</a> sebelum membuat laporan.</>
              : "Belum ada laporan masuk. Laporan yang dikirim petugas akan muncul di sini."}
          </div>
        ) : (
          <table className="secmon-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Titik</th>
                <th>Status</th>
                <th>Petugas</th>
                <th>Catatan pengawas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pagedReports.map((r) => {
                const loc = locations.find((l) => l.id === r.locationId);
                return (
                  <tr key={r.id}>
                    <td className="secmon-time-cell">{formatDateTime(r.timestamp)}</td>
                    <td>
                      <div className="secmon-loc-cell">{loc ? loc.name : r.locationName || "Titik dihapus"}</div>
                      {loc?.detail && <div className="secmon-loc-sub">{loc.detail}</div>}
                    </td>
                    <td>
                      <span className={`secmon-badge ${r.status === "aman" ? "safe" : "unsafe"}`}>
                        {r.status === "aman" ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                        {r.status === "aman" ? "Aman" : "Tidak Aman"}
                      </span>
                    </td>
                    <td>{r.officer || "—"}</td>
                    <td className="secmon-note-cell">{r.notes || "—"}</td>
                    <td>
                      <button className="secmon-icon-btn" onClick={() => onView(r)}><ChevronRight size={15} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {reports.length > 0 && (
          <div className="secmon-pagination">
            <div className="secmon-pagination-size">
              Tampilkan
              <select value={pageSize} onChange={handlePageSizeChange}>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
              </select>
              baris — {startIdx + 1}–{Math.min(startIdx + pageSize, reports.length)} dari {reports.length}
            </div>

            {totalPages > 1 && (
              <div className="secmon-pagination-nav">
                <button
                  type="button"
                  className="secmon-page-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={14} />
                </button>
                {pageNumbers().map((n, i) =>
                  n === "…" ? (
                    <span key={`ellipsis-${i}`} className="secmon-pagination-info" style={{ margin: 0 }}>…</span>
                  ) : (
                    <button
                      key={n}
                      type="button"
                      className={`secmon-page-btn ${n === currentPage ? "active" : ""}`}
                      onClick={() => setPage(n)}
                    >
                      {n}
                    </button>
                  )
                )}
                <button
                  type="button"
                  className="secmon-page-btn"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ReportForm({ locations, onSubmit, goLocations }) {
  const [locationId, setLocationId] = useState(locations[0]?.id || "");
  const [status, setStatus] = useState("aman");
  const [notes, setNotes] = useState("");
  const [officer, setOfficer] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [geo, setGeo] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!locationId && locations[0]) setLocationId(locations[0].id);
  }, [locations]);

  async function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function captureGeo() {
    setGeoLoading(true);
    setGeoError("");
    try {
      const pos = await getCurrentPosition();
      setGeo(pos);
    } catch (e) {
      setGeoError("Gagal mengambil lokasi. Pastikan izin lokasi diaktifkan.");
    }
    setGeoLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!locationId || !notes.trim()) return;
    setSubmitting(true);
    try {
      let photoDataUrl = null;
      if (photoFile) {
        photoDataUrl = await compressImage(photoFile);
      }
      await onSubmit(
        { locationId, status, notes: notes.trim(), officer: officer.trim(), lat: geo?.lat ?? null, lng: geo?.lng ?? null },
        photoDataUrl
      );
      setNotes("");
      setPhotoFile(null);
      setPhotoPreview(null);
      setGeo(null);
      setStatus("aman");
    } catch (e) {
      // error toast sudah ditampilkan di addReport
    }
    setSubmitting(false);
  }

  if (locations.length === 0) {
    return (
      <div className="secmon-panel">
        <div className="secmon-empty">
          Belum ada titik pantau terdaftar.{" "}
          <button className="secmon-btn primary" style={{ marginTop: 12 }} onClick={goLocations}>
            <MapPin size={14} /> Daftarkan Titik Pantau
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="secmon-panel" onSubmit={handleSubmit}>
      <div className="secmon-panel-head"><h2>Laporan patroli baru</h2></div>
      <div className="secmon-form-grid" style={{ padding: 20 }}>
        <div className="secmon-field">
          <label>Titik yang dipantau <span className="req">*</span></label>
          <select className="secmon-select" value={locationId} onChange={(e) => setLocationId(e.target.value)} required>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>

        <div className="secmon-field">
          <label>Foto lokasi</label>
          <div className="secmon-photo-drop">
            {photoPreview ? (
              <img src={photoPreview} alt="Preview foto lokasi" className="secmon-photo-preview" />
            ) : (
              <div style={{ padding: "18px 0" }}>
                <Camera size={22} style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 13, fontWeight: 600 }}>Ambil atau unggah foto</div>
                <div style={{ fontSize: 11.5, marginTop: 3 }}>Kondisi titik saat dipantau</div>
              </div>
            )}
            <input type="file" accept="image/*" capture="environment" className="secmon-photo-input" onChange={handlePhoto} />
          </div>
        </div>

        <div className="secmon-field">
          <label>Titik maps (koordinat pelaporan)</label>
          <div className="secmon-geo-row">
            <div className={`secmon-geo-chip ${geo ? "set" : ""}`}>
              {geo ? `${geo.lat}, ${geo.lng}` : "Koordinat belum diambil"}
            </div>
            <button type="button" className="secmon-btn ghost" onClick={captureGeo} disabled={geoLoading}>
              {geoLoading ? <Loader2 size={14} className="secmon-spin" /> : <Crosshair size={14} />}
              Ambil Lokasi Saat Ini
            </button>
          </div>
          {geoError && <div style={{ fontSize: 11.5, color: "var(--unsafe)", marginTop: 6 }}>{geoError}</div>}
        </div>

        <div className="secmon-field">
          <label>Kategori kondisi <span className="req">*</span></label>
          <div className="secmon-status-toggle">
            <div className={`secmon-status-opt safe ${status === "aman" ? "active" : ""}`} onClick={() => setStatus("aman")}>
              <ShieldCheck size={18} color="var(--safe)" />
              <span>Aman</span>
            </div>
            <div className={`secmon-status-opt unsafe ${status === "tidak_aman" ? "active" : ""}`} onClick={() => setStatus("tidak_aman")}>
              <ShieldAlert size={18} color="var(--unsafe)" />
              <span>Tidak Aman</span>
            </div>
          </div>
        </div>

        <div className="secmon-two-col">
          <div className="secmon-field">
            <label>Nama petugas</label>
            <input className="secmon-input" placeholder="cth. Andi P." value={officer} onChange={(e) => setOfficer(e.target.value)} />
          </div>
          <div className="secmon-field">
            <label>&nbsp;</label>
            <div className="secmon-geo-chip secmon-mono" style={{ textAlign: "center" }}>
              {formatDateTime(Date.now())}
            </div>
          </div>
        </div>

        <div className="secmon-field">
          <label>Catatan pengawas <span className="req">*</span></label>
          <textarea
            className="secmon-textarea"
            placeholder="Deskripsikan temuan, kondisi area, atau tindakan yang diambil…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            required
          />
        </div>

        <button className="secmon-btn primary" type="submit" disabled={submitting} style={{ justifyContent: "center" }}>
          {submitting ? <Loader2 size={15} className="secmon-spin" /> : <ClipboardList size={15} />}
          {submitting ? "Mengirim laporan…" : "Kirim Laporan"}
        </button>
      </div>
    </form>
  );
}

function LocationManager({ locations, onAdd, onDelete }) {
  const [name, setName] = useState("");
  const [detail, setDetail] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(locations.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const pagedLocations = locations.slice(startIdx, startIdx + pageSize);

  function handlePageSizeChange(e) {
    setPageSize(Number(e.target.value));
    setPage(1);
  }

  function pageNumbers() {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const nums = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
    const sorted = [...nums].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
    const result = [];
    sorted.forEach((n, i) => {
      if (i > 0 && n - sorted[i - 1] > 1) result.push("…");
      result.push(n);
    });
    return result;
  }

  async function captureGeo() {
    setGeoLoading(true);
    try {
      const pos = await getCurrentPosition();
      setLat(String(pos.lat));
      setLng(String(pos.lng));
    } catch (e) {}
    setGeoLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !lat || !lng) return;
    setSubmitting(true);
    await onAdd({ name: name.trim(), detail: detail.trim(), lat: Number(lat), lng: Number(lng) });
    setName("");
    setDetail("");
    setLat("");
    setLng("");
    setSubmitting(false);
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <form className="secmon-panel" onSubmit={handleSubmit}>
        <div className="secmon-panel-head"><h2>Registrasi titik pantau baru</h2></div>
        <div className="secmon-form-grid" style={{ padding: 20 }}>
          <div className="secmon-two-col">
            <div className="secmon-field">
              <label>Nama titik / ruangan <span className="req">*</span></label>
              <input className="secmon-input" placeholder="cth. Gudang A - Ruang Server" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="secmon-field">
              <label>Detail lokasi</label>
              <input className="secmon-input" placeholder="cth. Lantai 2, sisi timur" value={detail} onChange={(e) => setDetail(e.target.value)} />
            </div>
          </div>
          <div className="secmon-field">
            <label>Titik maps <span className="req">*</span></label>
            <div className="secmon-geo-row">
              <input className="secmon-input secmon-mono" placeholder="Lat" value={lat} onChange={(e) => setLat(e.target.value)} style={{ flex: 1, minWidth: 100 }} />
              <input className="secmon-input secmon-mono" placeholder="Lng" value={lng} onChange={(e) => setLng(e.target.value)} style={{ flex: 1, minWidth: 100 }} />
              <button type="button" className="secmon-btn ghost" onClick={captureGeo} disabled={geoLoading}>
                {geoLoading ? <Loader2 size={14} className="secmon-spin" /> : <Crosshair size={14} />}
                Gunakan Lokasi Saat Ini
              </button>
            </div>
          </div>
          <button className="secmon-btn primary" type="submit" disabled={submitting} style={{ justifyContent: "center" }}>
            <Plus size={15} /> Daftarkan Titik
          </button>
        </div>
      </form>

      <div className="secmon-panel">
        <div className="secmon-panel-head"><h2>Titik pantau terdaftar ({locations.length})</h2></div>
        {locations.length === 0 ? (
          <div className="secmon-empty">Belum ada titik pantau. Registrasikan titik pertama di atas.</div>
        ) : (
          <>
            <div className="secmon-loc-list">
              {pagedLocations.map((l) => (
                <div key={l.id} className="secmon-loc-card">
                  <div style={{ minWidth: 0 }}>
                    <h3>{l.name}</h3>
                    {l.detail && <p>{l.detail}</p>}
                    <a href={gmapsUrl(l.lat, l.lng)} target="_blank" rel="noopener noreferrer">
                      <MapPin size={11} /> {l.lat}, {l.lng} <ExternalLink size={10} />
                    </a>
                  </div>
                  <button className="secmon-icon-btn" onClick={() => onDelete(l.id)}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>

            <div className="secmon-pagination">
              <div className="secmon-pagination-size">
                Tampilkan
                <select value={pageSize} onChange={handlePageSizeChange}>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                </select>
                baris — {startIdx + 1}–{Math.min(startIdx + pageSize, locations.length)} dari {locations.length}
              </div>

              {totalPages > 1 && (
                <div className="secmon-pagination-nav">
                  <button
                    type="button"
                    className="secmon-page-btn"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {pageNumbers().map((n, i) =>
                    n === "…" ? (
                      <span key={`ellipsis-${i}`} className="secmon-pagination-info" style={{ margin: 0 }}>…</span>
                    ) : (
                      <button
                        key={n}
                        type="button"
                        className={`secmon-page-btn ${n === currentPage ? "active" : ""}`}
                        onClick={() => setPage(n)}
                      >
                        {n}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    className="secmon-page-btn"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ReportModal({ report, location, onClose }) {
  return (
    <div className="secmon-modal-backdrop" onClick={onClose}>
      <div className="secmon-modal" onClick={(e) => e.stopPropagation()}>
        <div className="secmon-modal-head">
          <h2 style={{ fontSize: 14, margin: 0, fontWeight: 700 }}>Detail laporan</h2>
          <button className="secmon-icon-btn" onClick={onClose}><X size={15} /></button>
        </div>
        <div className="secmon-modal-body">
          {report.photoUrl ? (
            <img src={report.photoUrl} alt="Foto lokasi" className="secmon-modal-img" />
          ) : (
            <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-raised)", borderRadius: 10, color: "var(--text-dim)", fontSize: 12, gap: 6 }}>
              <ImageIcon size={15} /> Tidak ada foto
            </div>
          )}

          <div>
            <span className={`secmon-badge ${report.status === "aman" ? "safe" : "unsafe"}`}>
              {report.status === "aman" ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
              {report.status === "aman" ? "Aman" : "Tidak Aman"}
            </span>
          </div>

          <div className="secmon-detail-row"><span>Titik</span><span>{location ? location.name : report.locationName || "Titik dihapus"}</span></div>
          {location?.detail && <div className="secmon-detail-row"><span>Detail ruangan</span><span>{location.detail}</span></div>}
          <div className="secmon-detail-row"><span>Waktu</span><span className="secmon-mono">{formatDateTime(report.timestamp)}</span></div>
          <div className="secmon-detail-row"><span>Petugas</span><span>{report.officer || "—"}</span></div>

          {report.lat && report.lng ? (
            <>
              <iframe title="Peta titik laporan" className="secmon-modal-map" src={osmEmbedUrl(report.lat, report.lng)} loading="lazy" />
              <a href={gmapsUrl(report.lat, report.lng)} target="_blank" rel="noopener noreferrer" className="secmon-btn ghost" style={{ justifyContent: "center", textDecoration: "none" }}>
                <MapPin size={13} /> Buka di Google Maps <ExternalLink size={12} />
              </a>
            </>
          ) : (
            <div className="secmon-detail-row"><span>Koordinat</span><span>Tidak diambil</span></div>
          )}

          <div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Catatan pengawas</div>
            <div className="secmon-note-block">{report.notes || "Tidak ada catatan."}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
