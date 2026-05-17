import { useMemo, useState } from "react";
import { Network } from "lucide-react";
import { CopyButton } from "@/components/tool/CopyButton";
import { useI18n } from "@/i18n";

type Result = { ok: true; ip: number; prefix: number; mask: number; net: number; broadcast: number; first: number; last: number; total: number; usable: number } | { ok: false; error: string };
function ipToInt(ip: string) { const p = ip.trim().split("."); if (p.length !== 4) return null; let n = 0; for (const x of p) { if (!/^\d+$/.test(x)) return null; const v = Number(x); if (v < 0 || v > 255) return null; n = (n << 8) + v; } return n >>> 0; }
function intToIp(n: number) { return [24,16,8,0].map((s)=>String((n >>> s) & 255)).join("."); }
function parse(input: string, t: (key: string) => string): Result { const m = input.trim().match(/^([^/]+)\/(\d{1,2})$/); if (!m) return { ok:false, error:t("tool.cidr.errorFormat")}; const ip = ipToInt(m[1]); const prefix = Number(m[2]); if (ip == null) return {ok:false,error:t("tool.cidr.errorIp")}; if (prefix < 0 || prefix > 32) return {ok:false,error:t("tool.cidr.errorPrefix")}; const mask = prefix === 0 ? 0 : (0xffffffff << (32-prefix)) >>> 0; const net = (ip & mask) >>> 0; const broadcast = (net | (~mask >>> 0)) >>> 0; const total = 2 ** (32-prefix); const usable = prefix >= 31 ? total : Math.max(0,total-2); const first = prefix >= 31 ? net : net + 1; const last = prefix >= 31 ? broadcast : broadcast - 1; return {ok:true, ip, prefix, mask, net, broadcast, first, last, total, usable}; }

export default function CidrTool() {
  const { t } = useI18n();
  const [cidr, setCidr] = useState("192.168.1.10/24");
  const [checkIp, setCheckIp] = useState("192.168.1.42");
  const result = useMemo(()=>parse(cidr, t),[cidr, t]);
  const contains = useMemo(()=>{ if(!result.ok) return null; const ip = ipToInt(checkIp); if(ip==null) return null; return (ip & result.mask) >>> 0 === result.net; },[checkIp,result]);
  return <div className="flex h-full flex-col">
    <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2.5 text-sm"><Network className="size-4 text-[var(--muted-foreground)]"/><span className="font-medium">CIDR / IP</span></div>
    <div className="flex flex-col gap-4 overflow-auto p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1.5"><span className="text-xs font-medium">CIDR</span><input value={cidr} onChange={(e)=>setCidr(e.target.value)} className="h-10 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 px-3 font-mono text-sm outline-none"/></label>
        <label className="flex flex-col gap-1.5"><span className="text-xs font-medium">{t("tool.cidr.checkIp")}</span><input value={checkIp} onChange={(e)=>setCheckIp(e.target.value)} className="h-10 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 px-3 font-mono text-sm outline-none"/></label>
      </div>
      {!result.ok ? <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-400">{result.error}</div> : <>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 p-3 text-sm">IP <span className="font-mono">{checkIp}</span> {contains == null ? t("tool.cidr.invalid") : contains ? t("tool.cidr.inside") : t("tool.cidr.outside")} <span className="font-mono">{cidr}</span></div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          <Row label={t("tool.cidr.network")} value={`${intToIp(result.net)}/${result.prefix}`} />
          <Row label={t("tool.cidr.subnetMask")} value={intToIp(result.mask)} />
          <Row label={t("tool.cidr.wildcardMask")} value={intToIp((~result.mask)>>>0)} />
          <Row label={t("tool.cidr.broadcast")} value={intToIp(result.broadcast)} />
          <Row label={t("tool.cidr.firstUsable")} value={intToIp(result.first)} />
          <Row label={t("tool.cidr.lastUsable")} value={intToIp(result.last)} />
          <Row label={t("tool.cidr.totalAddresses")} value={String(result.total)} />
          <Row label={t("tool.cidr.usableHosts")} value={String(result.usable)} />
          <Row label={t("tool.cidr.ipInteger")} value={String(result.ip)} />
        </div>
      </>}
    </div>
  </div>;
}
function Row({label,value}:{label:string;value:string}){return <div className="group rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 px-3 py-2"><div className="flex items-center justify-between gap-2"><div><div className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">{label}</div><div className="mt-1 font-mono text-sm">{value}</div></div><CopyButton text={value} iconOnly className="opacity-0 group-hover:opacity-100"/></div></div>}
