"use strict";
const appearanceDefaults = {
  accent: "#00ffe6",
  text: "#ffffff",
  muted: "#d0d0d0",
  background: "#000000",
  field: "#070707",
  target: "#ffffff",
  showHitGhosts: true,
  showMissGhosts: true,
  hitGhost: "#003399",
  missGhost: "#110000",
  border: "#00ffe6",
  borderWidth: 0,
  borderRadius: 100,
  crosshair: "#00ffe6",
  uiRadius: 0,
  fontSize: 16,
  fontWeight: 700,
};
const appearanceSpecs = [
  ["accent", "accent"],
  ["text", "text"],
  ["muted", "secondary text"],
  ["background", "page background"],
  ["field", "playfield background"],
  ["target", "circle fill"],
  ["showHitGhosts", "show hit ghosts"],
  ["showMissGhosts", "show miss ghosts"],
  ["hitGhost", "hit ghost"],
  ["missGhost", "miss ghost"],
  ["border", "circle border"],
  ["crosshair", "crosshair"],
  ["borderWidth", "border width · px", 0, 10],
  ["borderRadius", "border radius · %", 10, 100],
  ["uiRadius", "UI corner radius · px", 0, 16],
  ["fontSize", "base text size · px", 12, 22],
  ["fontWeight", "text weight", [400, 600, 700]],
];
const appearanceKey = "aimbooster-appearance";
const ap = (id) => document.getElementById(id);
function validateAppearance(data) {
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw Error("invalid appearance settings");
  const next = { ...appearanceDefaults };
  for (const [key, , min, max] of appearanceSpecs) {
    if (!Object.hasOwn(data, key)) continue;
    const value = data[key];
    if (typeof appearanceDefaults[key] === "boolean") {
      if (typeof value !== "boolean") throw Error(`invalid ${key} value`);
    } else if (typeof appearanceDefaults[key] === "string") {
      if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value))
        throw Error(`invalid ${key} colour`);
    } else if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      (Array.isArray(min) ? !min.includes(value) : value < min || value > max)
    )
      throw Error(`invalid ${key} value`);
    next[key] = value;
  }
  return next;
}
let appearance = { ...appearanceDefaults };
try {
  const stored = localStorage.getItem(appearanceKey);
  if (stored) appearance = validateAppearance(JSON.parse(stored));
} catch {}
try {
  const cookie = document.cookie
    .split("; ")
    .find((part) => part.startsWith(appearanceKey + "="));
  if (cookie)
    appearance = validateAppearance(
      JSON.parse(decodeURIComponent(cookie.slice(appearanceKey.length + 1))),
    );
} catch {}
function persistAppearance() {
  const json = JSON.stringify(appearance);
  let stored = false;
  try {
    localStorage.setItem(appearanceKey, json);
    stored = true;
  } catch {}
  try {
    if (location.protocol === "http:" || location.protocol === "https:") {
      document.cookie = `${appearanceKey}=${encodeURIComponent(json)}; Max-Age=31536000; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
      stored =
        stored ||
        document.cookie
          .split("; ")
          .some((part) => part.startsWith(appearanceKey + "="));
    }
  } catch {}
  ap("appearanceMessage").textContent = stored
    ? "saved"
    : "storage unavailable · export to save";
  return stored;
}
function applyAppearance() {
  ap("appearance-hitGhost").disabled = !appearance.showHitGhosts;
  ap("appearance-missGhost").disabled = !appearance.showMissGhosts;
  const root = document.documentElement.style;
  for (const [name, value] of Object.entries({
    "--cyan": appearance.accent,
    "--white": appearance.text,
    "--muted": appearance.muted,
    "--page": appearance.background,
    "--field": appearance.field,
    "--ui-radius": appearance.uiRadius + "px",
    "--font-size": appearance.fontSize + "px",
    "--font-weight": appearance.fontWeight,
    "--target": appearance.target,
  }))
    root.setProperty(name, value);
  const rgb = appearance.accent
    .slice(1)
    .match(/../g)
    .map((x) => parseInt(x, 16));
  root.setProperty(
    "--on-accent",
    (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000 > 145 ? "#000" : "#fff",
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M15 5h2v10h10v2H17v10h-2V17H5v-2h10Z" fill="${appearance.crosshair}"/></svg>`;
  const url = "data:image/svg+xml," + encodeURIComponent(svg);
  root.setProperty("--aim-cursor", `url("${url}") 16 15,crosshair`);
  ap("cursorPreview").src = url;
  const ring = document.querySelector(".preview-ring"),
    width = Math.min(appearance.borderWidth, 30);
  ring.style.width = ring.style.height =
    2 * (((30 - width / 2) * appearance.borderRadius) / 100 + width / 2) + "px";
  ring.style.border = `${width}px solid ${appearance.border}`;
  window.dispatchEvent(new Event("appearancechange"));
}
function syncAppearanceFields() {
  for (const [key] of appearanceSpecs) {
    const input = ap("appearance-" + key);
    if (input.type === "checkbox") input.checked = appearance[key];
    else input.value = appearance[key];
  }
}
for (const [key, label, min, max] of appearanceSpecs) {
  const row = document.createElement("label"),
    input = document.createElement(Array.isArray(min) ? "select" : "input");
  row.append(document.createTextNode(label.toLowerCase()));
  input.id = "appearance-" + key;
  if (Array.isArray(min))
    min.forEach((value) => input.add(new Option(String(value), String(value))));
  else if (typeof appearanceDefaults[key] === "boolean")
    input.type = "checkbox";
  else if (typeof appearanceDefaults[key] === "string") input.type = "color";
  else {
    input.type = "number";
    input.min = min;
    input.max = max;
    input.step = 1;
    input.required = true;
  }
  input.addEventListener("input", () => {
    if (!input.checkValidity()) return;
    const value =
      input.type === "checkbox"
        ? input.checked
        : typeof appearanceDefaults[key] === "string"
          ? input.value
          : Number(input.value);
    appearance = validateAppearance({ ...appearance, [key]: value });
    applyAppearance();
    persistAppearance();
  });
  row.append(input);
  ap("appearanceFields").append(row);
}
for (const [colourKey, toggleKey] of [
  ["hitGhost", "showHitGhosts"],
  ["missGhost", "showMissGhosts"],
]) {
  const colour = ap("appearance-" + colourKey);
  const toggle = ap("appearance-" + toggleKey);
  const colourLabel = colour.parentElement;
  const toggleRow = toggle.parentElement;
  const row = document.createElement("div");
  row.className = "ghost-colour-row";
  colourLabel.htmlFor = colour.id;
  toggle.setAttribute("aria-label", toggleRow.textContent.trim());
  colourLabel.replaceWith(row);
  const controls = document.createElement("div");
  controls.className = "ghost-colour-controls";
  controls.append(toggle, colour);
  row.append(colourLabel, controls);
  toggleRow.remove();
}
ap("appearanceForm").onsubmit = (e) => e.preventDefault();
ap("appearanceButton").onclick = () => {
  window.dispatchEvent(new Event("appearanceopen"));
  ap("appearanceDialog").showModal();
};
ap("closeAppearance").onclick = () => ap("appearanceDialog").close();
ap("resetAppearance").onclick = () => {
  appearance = { ...appearanceDefaults };
  syncAppearanceFields();
  applyAppearance();
  persistAppearance();
};
ap("exportAppearance").onclick = async () => {
  const code =
    "ABA1." +
    btoa(JSON.stringify({ v: 1, appearance }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  const box = ap("appearanceCode");
  box.value = code;
  box.focus();
  box.select();
  try {
    await navigator.clipboard.writeText(code);
    ap("appearanceMessage").textContent = "code copied";
  } catch {
    ap("appearanceMessage").textContent = "select and copy code";
  }
};
ap("importAppearance").onclick = () => {
  try {
    const code = ap("appearanceCode").value.trim();
    if (code.length > 4096 || !/^ABA1\.[A-Za-z0-9_-]+$/.test(code))
      throw Error();
    const payload = JSON.parse(
      atob(code.slice(5).replace(/-/g, "+").replace(/_/g, "/")),
    );
    if (payload.v !== 1) throw Error();
    const next = validateAppearance(payload.appearance);
    appearance = next;
    syncAppearanceFields();
    applyAppearance();
    if (persistAppearance())
      ap("appearanceMessage").textContent = "imported · saved";
  } catch {
    ap("appearanceMessage").textContent = "invalid appearance code";
  }
};
syncAppearanceFields();
applyAppearance();
