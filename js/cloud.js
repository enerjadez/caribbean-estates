const TOKEN = "a3bb17469f6c8707f53d4213df95473955f5a1beb6d8ee2a4c4bb87ae3ab";
const PATH = "Caribbean-Estates-11-11";

function encode(board) {
  const bytes = new TextEncoder().encode(JSON.stringify(board));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decode(value) {
  const binary = atob(String(value).replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function textOf(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((node) => (typeof node === "string" ? node : textOf(node?.children || node))).join("");
}

export async function pullBoard() {
  const response = await fetch(`https://api.telegra.ph/getPage/${PATH}?return_content=true`, { cache: "no-store" });
  if (!response.ok) throw new Error("board");
  const payload = await response.json();
  if (!payload.ok) throw new Error(payload.error || "board");
  const board = decode(textOf(payload.result?.content));
  if (!board || typeof board !== "object" || Array.isArray(board)) throw new Error("board");
  return board;
}

export async function pushBoard(board) {
  const content = JSON.stringify([{ tag: "pre", children: [encode(board)] }]);
  const body = new URLSearchParams({
    access_token: TOKEN,
    path: PATH,
    title: "Caribbean Estates",
    author_name: "Port Edward",
    content
  });
  const response = await fetch("https://api.telegra.ph/editPage", { method: "POST", body });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.error || "board");
}
