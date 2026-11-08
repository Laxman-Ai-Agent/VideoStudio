// Dashboard API client. Every call goes to ui/backend/server.py; assets are always addressed by
// project id + stable asset id (never by grid position or file name).
const enc = encodeURIComponent;

async function json(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);
  return data;
}

export const api = {
  version: (pid) => fetch(`/api/version?p=${enc(pid)}`, { cache: "no-store" }).then(json),
  prepare: (pid) => fetch(`/api/projects/${enc(pid)}/render?review=1`, { method: "POST" }).then(json),
  runStatus: (pid) => fetch(`/api/projects/${enc(pid)}/render`, { cache: "no-store" }).then(json),
  projects: () => fetch("/api/projects", { cache: "no-store" }).then(json),
  assets: (pid) => fetch(`/api/projects/${enc(pid)}/assets`, { cache: "no-store" }).then(json),
  savePrompt: (pid, id, text, negative) =>
    fetch(`/api/projects/${enc(pid)}/assets/${enc(id)}/prompt`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, negative }),
    }).then(json),
  saveMedia: (pid, id, settings) =>
    fetch(`/api/projects/${enc(pid)}/assets/${enc(id)}/media`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings),
    }).then(json),
  confirmReplace: (pid, id) => fetch(`/api/projects/${enc(pid)}/assets/${enc(id)}/replace/confirm`, { method: "POST" }).then(json),
  cancelReplace: (pid, id) => fetch(`/api/projects/${enc(pid)}/assets/${enc(id)}/replace/cancel`, { method: "POST" }).then(json),
  // raw body upload with progress (XHR has upload progress events, fetch does not)
  upload: (pid, id, file, replace, onProgress) => new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open("POST", `/api/projects/${enc(pid)}/assets/${enc(id)}/upload${replace ? "?replace=1" : ""}`);
    x.setRequestHeader("X-Filename", enc(file.name));
    x.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    x.onload = () => {
      let d = {};
      try { d = JSON.parse(x.responseText); } catch { /* not JSON */ }
      x.status < 300 ? resolve(d) : reject(new Error(d.error || `upload failed (${x.status})`));
    };
    x.onerror = () => reject(new Error("network error"));
    x.send(file);
  }),
  // version = the source file name, so a new upload shows at once while unchanged files stay cached
  fileUrl: (pid, rel, version) =>
    `/files/${enc(pid)}/${rel.split("/").map(enc).join("/")}?v=${enc(version || "")}`,
};
