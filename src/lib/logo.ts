import { SUPABASE_URL } from "@/lib/env";

/** URL pública da logo guardada no Storage (bucket "logos"). */
export function urlLogo(logoPath: string | null) {
  return logoPath ? `${SUPABASE_URL}/storage/v1/object/public/logos/${logoPath}` : null;
}
