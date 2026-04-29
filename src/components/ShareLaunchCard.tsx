import { useEffect, useRef, useState } from "react";
import { Download, Share2, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  name: string;
  symbol: string;
  mint: string;
  logoUrl?: string | null;
  websiteUrl?: string;
  shareMessage?: string;
}

/**
 * P3-1: Generates a shareable PNG card for a freshly launched token.
 * Pure canvas — no external dependencies, no network beyond the logo image.
 */
export default function ShareLaunchCard({ name, symbol, mint, logoUrl, websiteUrl, shareMessage }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pngUrl, setPngUrl] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const draw = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBusy(true);
    const ctx = canvas.getContext("2d");
    if (!ctx) { setBusy(false); return; }
    const W = canvas.width;
    const H = canvas.height;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#0F0820");
    grad.addColorStop(1, "#1B0B3A");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Glow blob
    const radial = ctx.createRadialGradient(W * 0.8, H * 0.2, 30, W * 0.8, H * 0.2, 600);
    radial.addColorStop(0, "rgba(168,85,247,0.5)");
    radial.addColorStop(1, "rgba(168,85,247,0)");
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, W, H);

    // Eyebrow
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "600 26px Inter, system-ui, sans-serif";
    ctx.fillText("🚀 NEW TOKEN LAUNCHED ON SOLANA", 64, 100);

    // Logo
    if (logoUrl) {
      try {
        const img = await loadImage(logoUrl);
        const size = 160;
        const x = 64;
        const y = 150;
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, x, y, size, size);
        ctx.restore();
      } catch { /* ignore broken logo */ }
    }

    // Name
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "800 64px Inter, system-ui, sans-serif";
    const nameY = logoUrl ? 200 : 220;
    ctx.fillText(truncate(name || "New Token", 22), 250, nameY);

    // Symbol
    ctx.fillStyle = "#A78BFA";
    ctx.font = "700 36px Inter, system-ui, sans-serif";
    ctx.fillText(`$${(symbol || "TOKEN").toUpperCase()}`, 250, nameY + 50);

    // Mint
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "500 22px ui-monospace, SFMono-Regular, monospace";
    ctx.fillText(`${mint.slice(0, 10)}…${mint.slice(-10)}`, 64, 400);

    // Footer brand
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "600 24px Inter, system-ui, sans-serif";
    ctx.fillText("promotemymemes.com", 64, H - 64);

    ctx.fillStyle = "#22C55E";
    ctx.font = "700 22px Inter, system-ui, sans-serif";
    ctx.fillText("✓ DEX READY", W - 220, H - 64);

    const url = canvas.toDataURL("image/png");
    setPngUrl(url);
    setBusy(false);
  };

  useEffect(() => {
    void draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, symbol, mint, logoUrl]);

  const download = () => {
    if (!pngUrl) return;
    const a = document.createElement("a");
    a.href = pngUrl;
    a.download = `${(symbol || "token").toLowerCase()}-launch.png`;
    a.click();
  };

  const copyMsg = async () => {
    if (!shareMessage) return;
    try { await navigator.clipboard.writeText(shareMessage); toast.success("Caption copied"); } catch { toast.error("Copy failed"); }
  };

  const share = async () => {
    if (!pngUrl) return;
    try {
      const blob = await (await fetch(pngUrl)).blob();
      const file = new File([blob], `${(symbol || "token").toLowerCase()}-launch.png`, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], text: shareMessage, title: `${name} ($${symbol}) is live` });
      } else {
        download();
      }
    } catch { /* user cancel */ }
  };

  return (
    <Card className="app-panel rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg">Share your launch</CardTitle>
        <CardDescription>Post this card on X, Telegram or Discord to drive your first holders.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-hidden rounded-xl border border-border bg-background/40">
          {pngUrl ? (
            <img src={pngUrl} alt={`${name} launch card`} className="block w-full" />
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Preparing…"}
            </div>
          )}
        </div>
        <canvas ref={canvasRef} width={1200} height={630} className="hidden" />
        <div className="flex flex-wrap gap-2">
          <Button onClick={download} disabled={!pngUrl} size="sm" className="rounded-full"><Download className="h-4 w-4" /> Download PNG</Button>
          <Button onClick={share} disabled={!pngUrl} size="sm" variant="outline" className="rounded-full"><Share2 className="h-4 w-4" /> Share</Button>
          {shareMessage && <Button onClick={copyMsg} size="sm" variant="outline" className="rounded-full"><Copy className="h-4 w-4" /> Copy caption</Button>}
          {websiteUrl && <Button asChild size="sm" variant="ghost" className="rounded-full"><a href={websiteUrl} target="_blank" rel="noreferrer">Open site</a></Button>}
        </div>
      </CardContent>
    </Card>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function truncate(s: string, max: number) {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
