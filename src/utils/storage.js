export function getLocalState() {
  try {
    const s = localStorage.getItem("fl_state");
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

export function saveLocalState(state) {
  try {
    localStorage.setItem("fl_state", JSON.stringify(state));
  } catch {}
}
