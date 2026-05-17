import { useMemo, useState } from "react";
import { Database, Eraser, Minimize2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/tool/CopyButton";
import { useI18n } from "@/i18n";

const SAMPLE = "select u.id,u.name,count(o.id) as orders from users u left join orders o on o.user_id=u.id where u.active=1 and o.created_at>=now() - interval '30 days' group by u.id,u.name order by orders desc limit 20";
const KEYWORDS = new Set("select from where and or left right inner outer full join on group by order having limit offset insert into values update set delete create alter drop table index view with as union all distinct case when then else end returning interval desc asc".split(" "));
function formatSql(sql: string) { let s = sql.replace(/\s+/g," ").trim(); s = s.replace(/\b(select|from|where|left join|right join|inner join|outer join|full join|join|group by|order by|having|limit|offset|values|set|returning|union all|union)\b/gi, "\n$1"); s = s.replace(/,/g, ",\n  "); s = s.replace(/\b(and|or)\b/gi, "\n  $1"); return s.split("\n").map(l=>l.trimEnd()).filter(Boolean).map((l,i)=> i===0 ? l.trim() : l.startsWith("  ") ? l : l.trim()).join("\n"); }
function minifySql(sql: string) { return sql.replace(/--.*$/gm,"").replace(/\/\*[\s\S]*?\*\//g,"").replace(/\s+/g," ").trim(); }
function highlight(sql: string) { return sql.split(/(\b[a-z_]+\b)/gi).map((part,i)=> KEYWORDS.has(part.toLowerCase()) ? <span key={i} className="text-sky-400">{part.toUpperCase()}</span> : <span key={i}>{part}</span>); }

export default function SqlTool(){
 const { t } = useI18n();
 const [input,setInput]=useState(SAMPLE); const [mode,setMode]=useState<"format"|"minify">("format");
 const output=useMemo(()=> mode==="format"?formatSql(input):minifySql(input),[input,mode]);
 return <div className="flex h-full flex-col"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-2.5"><div className="flex items-center gap-2 text-sm"><Database className="size-4 text-[var(--muted-foreground)]"/><span className="font-medium">SQL Formatter</span></div><div className="flex gap-2"><Button size="sm" variant={mode==="format"?"default":"secondary"} onClick={()=>setMode("format")}><Wand2 className="size-3.5"/> {t("action.format")}</Button><Button size="sm" variant={mode==="minify"?"default":"secondary"} onClick={()=>setMode("minify")}><Minimize2 className="size-3.5"/> {t("action.minify")}</Button><Button size="sm" variant="ghost" onClick={()=>setInput("")} disabled={!input}><Eraser className="size-3.5"/> {t("action.clear")}</Button></div></div>
 <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-2"><div className="flex flex-col overflow-hidden border-b border-[var(--border)] md:border-b-0 md:border-r"><Header label={t("label.input")}/><textarea value={input} onChange={(e)=>setInput(e.target.value)} spellCheck={false} className="min-h-0 flex-1 resize-none bg-transparent p-3 font-mono text-sm outline-none" placeholder={t("tool.sql.placeholder")}/></div><div className="flex flex-col overflow-hidden"><Header label={t("label.output")} right={<CopyButton text={output}/>}/><pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap p-3 font-mono text-sm leading-relaxed">{highlight(output)}</pre></div></div></div>
}
function Header({label,right}:{label:string;right?:React.ReactNode}){return <div className="flex h-9 shrink-0 items-center justify-between border-b border-[var(--border)] px-3"><span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">{label}</span>{right}</div>}
