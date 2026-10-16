// Telefone celular brasileiro → formato internacional (+55 DDD 9XXXX-XXXX).

const DDDS_VALIDOS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46,
  47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85,
  86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

/** "(48) 99999-0001", "48999990001", "+55 48 99999 0001" → "+5548999990001". Inválido → null. */
export function normalizarTelefone(entrada: string): string | null {
  let d = entrada.replace(/\D/g, "");
  if (d.length === 13 && d.startsWith("55")) d = d.slice(2);
  if (d.length === 12 && d.startsWith("0")) d = d.slice(1); // 0 + DDD + número
  if (d.length !== 11) return null;
  const ddd = Number(d.slice(0, 2));
  if (!DDDS_VALIDOS.has(ddd)) return null;
  if (d[2] !== "9") return null; // celular
  return `+55${d}`;
}

/** "+5548999990001" → "(48) 99999-0001" */
export function formatarTelefone(e164: string | null) {
  if (!e164) return "";
  const d = e164.replace(/^\+55/, "");
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Máscara enquanto digita: "4899" → "(48) 99" */
export function mascararTelefone(texto: string) {
  const d = texto.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
