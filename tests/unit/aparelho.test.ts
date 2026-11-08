import { describe, expect, it } from "vitest";
import { detectarAparelho } from "@/lib/aparelho";

const CHROME = "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";
const nav = (userAgent: string, maxTouchPoints = 0, userAgentData?: { platform?: string; mobile?: boolean }) => ({ userAgent, maxTouchPoints, userAgentData });

describe("tipo de aparelho", () => {
  it("celular Android", () => {
    expect(detectarAparelho(nav(`Mozilla/5.0 (Linux; Android 14; SM-S921B) ${CHROME.replace("Safari", "Mobile Safari")}`, 5))).toBe("android");
  });
  it("tablet Samsung em modo computador (padrão do Chrome e do Samsung Internet em tablets)", () => {
    expect(detectarAparelho(nav(`Mozilla/5.0 (X11; Linux x86_64) ${CHROME}`, 10))).toBe("android");
    expect(detectarAparelho(nav(`Mozilla/5.0 (X11; Linux x86_64) ${CHROME}`, 0, { platform: "Android", mobile: false }))).toBe("android");
  });
  it("iPhone e iPad (inclusive iPad em modo computador)", () => {
    expect(detectarAparelho(nav("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15", 5))).toBe("ios");
    expect(detectarAparelho(nav("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15", 5))).toBe("ios");
  });
  it("computador comum não é Android", () => {
    expect(detectarAparelho(nav(`Mozilla/5.0 (X11; Linux x86_64) ${CHROME}`, 0))).toBe("outro");
    expect(detectarAparelho(nav(`Mozilla/5.0 (Windows NT 10.0; Win64; x64) ${CHROME}`, 0))).toBe("outro");
    expect(detectarAparelho(nav("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15", 0))).toBe("outro");
  });
});
