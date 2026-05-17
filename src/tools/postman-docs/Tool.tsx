import { useMemo, useState } from "react";
import yaml from "js-yaml";
import { CheckSquare, Copy, Download, FileJson, FolderOpen, List, Link as LinkIcon, Search, Square, TreePine, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n";

type AnyRecord = Record<string, unknown>;

interface MdFile {
  path: string;
  content: string;
}

const SAMPLE_URL = "https://example.com/postman_collection.json";

export default function PostmanDocsTool() {
  const { t } = useI18n();
  const [sourceUrl, setSourceUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<MdFile[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [selected, setSelected] = useState(0);
  const [viewMode, setViewMode] = useState<"list" | "tree">("tree");
  const [search, setSearch] = useState("");
  const current = files[selected] ?? null;
  const selectedFiles = useMemo(() => files.filter((file) => selectedPaths.includes(file.path)), [files, selectedPaths]);
  const visibleFiles = useMemo(() => filterFiles(files, search), [files, search]);

  const stats = useMemo(() => {
    const markdown = files.reduce((sum, file) => sum + file.content.length, 0);
    return { files: files.length, markdown };
  }, [files]);

  const convertText = (text: string, prefix = "") => {
    try {
      const source = parseSpec(text);
      const converted = prefixFiles(convertAnySpec(source), prefix);
      applyFiles(converted);
      setSelected(0);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const loadUrl = async () => {
    if (!sourceUrl.trim()) return;
    try {
      const res = await fetch(sourceUrl);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      convertText(await res.text());
    } catch (e) {
      setError(`${t("tool.postman.loadUrlError")}: ${(e as Error).message}. ${t("tool.postman.corsFileHint")}`);
    }
  };

  const loadFile = async (file: File | undefined) => {
    if (!file) return;
    convertText(await file.text());
  };

  const applyFiles = (nextFiles: MdFile[]) => {
    setFiles(nextFiles);
    setSelectedPaths(nextFiles.map((file) => file.path));
  };

  const downloadZip = async () => {
    if (selectedFiles.length === 0) return;
    const blob = createZip(selectedFiles);
    downloadBlob(blob, "postman_docs.zip");
  };

  const togglePath = (path: string, checked: boolean) => {
    setSelectedPaths((current) => checked ? Array.from(new Set([...current, path])) : current.filter((item) => item !== path));
  };

  const toggleFolder = (folder: string, checked: boolean) => {
    const children = files.filter((file) => file.path.startsWith(`${folder}/`)).map((file) => file.path);
    setSelectedPaths((current) => {
      if (checked) return Array.from(new Set([...current, ...children]));
      return current.filter((path) => !children.includes(path));
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 overflow-x-auto border-b border-[var(--border)] px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileJson className="size-4 text-[var(--muted-foreground)]" />
          Postman Docs
        </div>
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="icon" className="size-8" onClick={() => current && navigator.clipboard.writeText(current.content)} disabled={!current} title={t("tool.postman.copySelected")}>
            <Copy className="size-3.5" />
          </Button>
          <Button size="sm" onClick={downloadZip} disabled={selectedFiles.length === 0}>
            <Download className="size-3.5" />
            ZIP
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[380px_1fr]">
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto border-b border-[var(--border)] p-4 lg:border-b-0 lg:border-r">
          <div className="space-y-2">
            <div className="text-xs font-medium">{t("tool.postman.importUrl")}</div>
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <LinkIcon className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <input
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder={SAMPLE_URL}
                  className="h-9 w-full rounded-md border border-[var(--border)] bg-transparent pl-7 pr-2 font-mono text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  spellCheck={false}
                />
              </div>
              <Button variant="secondary" size="sm" onClick={loadUrl} disabled={!sourceUrl.trim()}>
                {t("tool.postman.load")}
              </Button>
            </div>
          </div>

          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border)] bg-[var(--muted)]/15 p-6 text-center text-xs text-[var(--muted-foreground)] hover:bg-[var(--muted)]/25">
            <Upload className="size-5" />
            <span>{t("tool.postman.chooseFile")}</span>
            <input type="file" accept="application/json,.json,.yaml,.yml" className="hidden" onChange={(e) => loadFile(e.target.files?.[0])} />
          </label>

          {error && <div className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-400">{error}</div>}

          <div className="grid grid-cols-2 gap-2 text-xs">
            <Stat label={t("tool.postman.files")} value={stats.files} />
            <Stat label={t("tool.postman.chars")} value={stats.markdown} />
          </div>

          <div className="min-h-0 space-y-1">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-xs font-medium">{t("tool.postman.exportSelection")}</div>
              {files.length > 0 && (
                <div className="flex gap-1">
                  <button
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "grid size-7 place-items-center rounded-md",
                      viewMode === "list" ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                    )}
                    title={t("tool.postman.listView")}
                  >
                    <List className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode("tree")}
                    className={cn(
                      "grid size-7 place-items-center rounded-md",
                      viewMode === "tree" ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                    )}
                    title={t("tool.postman.treeView")}
                  >
                    <TreePine className="size-3.5" />
                  </button>
                  <Button variant="secondary" size="icon" className="size-7" onClick={() => setSelectedPaths(files.map((file) => file.path))} title={t("tool.postman.selectAll")}>
                    <CheckSquare className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => setSelectedPaths([])} title={t("tool.postman.clearSelection")}>
                    <Square className="size-3.5" />
                  </Button>
                </div>
              )}
            </div>
            {files.length > 0 && (
              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("tool.postman.search")}
                  className="h-8 w-full rounded-md border border-[var(--border)] bg-transparent pl-7 pr-2 font-mono text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  spellCheck={false}
                />
              </div>
            )}
            {files.length === 0 ? (
              <div className="rounded-md border border-dashed border-[var(--border)] px-3 py-3 text-xs text-[var(--muted-foreground)]">
                {t("tool.postman.empty")}
              </div>
            ) : visibleFiles.length === 0 ? (
              <div className="rounded-md border border-dashed border-[var(--border)] px-3 py-3 text-xs text-[var(--muted-foreground)]">
                {t("tool.postman.noMatch")}
              </div>
            ) : (
              viewMode === "list" ? (
                <AllFileList
                  files={visibleFiles}
                  allFiles={files}
                  selected={selected}
                  selectedPaths={selectedPaths}
                  setSelected={setSelected}
                  togglePath={togglePath}
                />
              ) : (
              <>
                <TreeFileList
                  nodes={buildTree(visibleFiles)}
                  files={files}
                  selected={selected}
                  selectedPaths={selectedPaths}
                  setSelected={setSelected}
                  togglePath={togglePath}
                  toggleFolder={toggleFolder}
                />
              </>
              )
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden">
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-[var(--border)] px-3">
            <div className="truncate font-mono text-xs text-[var(--muted-foreground)]">{current?.path ?? "Preview"}</div>
            <Button variant="ghost" size="sm" onClick={() => current && downloadBlob(new Blob([current.content], { type: "text/markdown;charset=utf-8" }), current.path.split("/").pop() ?? "doc.md")} disabled={!current}>
              <Download className="size-3.5" />
              MD
            </Button>
          </div>
          {current ? (
            <textarea value={current.content} readOnly className="min-h-0 flex-1 resize-none bg-transparent p-4 font-mono text-xs focus:outline-none" />
          ) : (
            <div className="flex flex-1 items-center justify-center p-6 text-xs text-[var(--muted-foreground)]">
              No markdown preview yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--muted)]/15 px-3 py-2">
      <div className="font-mono text-sm font-semibold">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">{label}</div>
    </div>
  );
}

interface TreeNode {
  name: string;
  path: string;
  children: TreeNode[];
  file?: MdFile;
}

function AllFileList({
  files,
  allFiles,
  selected,
  selectedPaths,
  setSelected,
  togglePath,
}: {
  files: MdFile[];
  allFiles: MdFile[];
  selected: number;
  selectedPaths: string[];
  setSelected: (index: number) => void;
  togglePath: (path: string, checked: boolean) => void;
}) {
  return (
    <>
      {files.map((file) => (
        (() => {
          const originalIndex = allFiles.findIndex((item) => item.path === file.path);
          return (
        <div
          key={file.path}
          className={cn(
            "grid grid-cols-[18px_1fr] items-center gap-2 rounded-md px-2 py-1.5 text-xs",
            selected === originalIndex ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "hover:bg-[var(--muted)]"
          )}
        >
          <input type="checkbox" checked={selectedPaths.includes(file.path)} onChange={(e) => togglePath(file.path, e.target.checked)} className="size-3 accent-[var(--primary)]" />
          <button onClick={() => setSelected(originalIndex)} className="truncate text-left font-mono">
            {file.path}
          </button>
        </div>
          );
        })()
      ))}
    </>
  );
}

function TreeFileList({
  nodes,
  files,
  selected,
  selectedPaths,
  setSelected,
  togglePath,
  toggleFolder,
  trail = [],
}: {
  nodes: TreeNode[];
  files: MdFile[];
  selected: number;
  selectedPaths: string[];
  setSelected: (index: number) => void;
  togglePath: (path: string, checked: boolean) => void;
  toggleFolder: (path: string, checked: boolean) => void;
  trail?: boolean[];
}) {
  return (
    <>
      {nodes.map((node, nodeIndex) => {
        const isLast = nodeIndex === nodes.length - 1;
        if (node.file) {
          const index = files.findIndex((file) => file.path === node.file?.path);
          return (
            <div
              key={node.path}
              className={cn(
                "grid grid-cols-[auto_18px_1fr] items-center gap-2 rounded-md px-2 py-1.5 text-xs",
                selected === index ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "hover:bg-[var(--muted)]"
              )}
            >
              <TreeGuide trail={trail} isLast={isLast} />
              <input type="checkbox" checked={selectedPaths.includes(node.file.path)} onChange={(e) => togglePath(node.file!.path, e.target.checked)} className="size-3 accent-[var(--primary)]" />
              <button onClick={() => setSelected(index)} className="truncate text-left font-mono">
                {node.name}
              </button>
            </div>
          );
        }

        const childFiles = files.filter((file) => file.path.startsWith(`${node.path}/`));
        const checked = childFiles.length > 0 && childFiles.every((file) => selectedPaths.includes(file.path));
        return (
          <div key={node.path}>
            <label className="grid grid-cols-[auto_18px_16px_1fr] items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-[var(--muted)]">
              <TreeGuide trail={trail} isLast={isLast} />
              <input type="checkbox" checked={checked} onChange={(e) => toggleFolder(node.path, e.target.checked)} className="size-3 accent-[var(--primary)]" />
              <FolderOpen className="size-3.5 text-[var(--muted-foreground)]" />
              <span className="truncate font-mono">{node.name}/</span>
            </label>
            <TreeFileList
              nodes={node.children}
              files={files}
              selected={selected}
              selectedPaths={selectedPaths}
              setSelected={setSelected}
              togglePath={togglePath}
              toggleFolder={toggleFolder}
              trail={[...trail, isLast]}
            />
          </div>
        );
      })}
    </>
  );
}

function TreeGuide({ trail, isLast }: { trail: boolean[]; isLast: boolean }) {
  return (
    <span className="whitespace-pre font-mono text-[var(--muted-foreground)]">
      {trail.map((last, index) => <span key={index}>{last ? "   " : "│  "}</span>)}
      {isLast ? "└─" : "├─"}
    </span>
  );
}

function buildTree(files: MdFile[]): TreeNode[] {
  const root: TreeNode[] = [];
  for (const file of files) {
    const parts = file.path.split("/");
    let level = root;
    let prefix = "";
    parts.forEach((part, index) => {
      prefix = prefix ? `${prefix}/${part}` : part;
      const isFile = index === parts.length - 1;
      let node = level.find((item) => item.name === part);
      if (!node) {
        node = { name: part, path: prefix, children: [], file: isFile ? file : undefined };
        level.push(node);
      }
      level = node.children;
    });
  }
  return root;
}

function filterFiles(files: MdFile[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return files;
  return files.filter((file) => {
    if (file.path.toLowerCase().includes(q)) return true;
    return file.path.split("/").some((part) => part.toLowerCase().includes(q));
  });
}

function parseSpec(text: string): AnyRecord {
  try {
    const parsed = JSON.parse(text);
    if (isRecord(parsed)) return parsed;
  } catch {
    const parsed = yaml.load(text);
    if (isRecord(parsed)) return parsed;
  }
  throw new Error("File is not a valid JSON/YAML object.");
}

function convertAnySpec(source: AnyRecord): MdFile[] {
  if (source.openapi || source.swagger) return convertOpenApi(source);
  if (source.info && source.item) return convertCollection(source);
  throw new Error("Could not detect a Postman collection or Swagger/OpenAPI spec.");
}

function prefixFiles(files: MdFile[], prefix: string): MdFile[] {
  if (!prefix) return files;
  return files.map((file) => ({ ...file, path: `${prefix}${file.path}` }));
}

function urlString(url: unknown): string {
  if (typeof url === "string") return url;
  if (isRecord(url)) {
    const raw = url.raw;
    if (typeof raw === "string" && raw) return raw;
    const host = Array.isArray(url.host) ? url.host.join(".") : "";
    const path = Array.isArray(url.path) ? url.path.join("/") : "";
    return `${host}/${path}`;
  }
  return "";
}

function renderKvTable(rows: unknown, cols: string[]) {
  if (!Array.isArray(rows) || rows.length === 0) return "";
  const header = `| ${cols.join(" | ")} |`;
  const sep = `| ${cols.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => {
    const record = isRecord(row) ? row : {};
    return `| ${cols.map((col) => String(record[col] ?? "").replace(/\n/g, " ").replace(/\|/g, "\\|")).join(" | ")} |`;
  });
  return [header, sep, ...body].join("\n");
}

function renderRequest(item: AnyRecord, level: number) {
  const name = String(item.name ?? "Unnamed");
  const req = isRecord(item.request) ? item.request : {};
  const method = String(req.method ?? "");
  const url = urlString(req.url);
  const description = String(req.description ?? "");
  const out = [`${"#".repeat(level)} ${name}`, "", `\`${method} ${url}\``, ""];

  if (description) out.push(description, "");
  const headers = req.header;
  if (Array.isArray(headers) && headers.length > 0) out.push("**Headers**", "", renderKvTable(headers, ["key", "value"]), "");

  if (isRecord(req.url)) {
    if (Array.isArray(req.url.query) && req.url.query.length > 0) out.push("**Query parameters**", "", renderKvTable(req.url.query, ["key", "value", "description"]), "");
    if (Array.isArray(req.url.variable) && req.url.variable.length > 0) out.push("**Path variables**", "", renderKvTable(req.url.variable, ["key", "value", "description"]), "");
  }

  const body = isRecord(req.body) ? req.body : {};
  if (typeof body.raw === "string" && body.raw) {
    const options = isRecord(body.options) ? body.options : {};
    const rawOptions = isRecord(options.raw) ? options.raw : {};
    out.push("**Request body**", "", `\`\`\`${String(rawOptions.language ?? "")}`, body.raw, "```", "");
  }

  const responses = Array.isArray(item.response) ? item.response : [];
  if (responses.length > 0) {
    out.push("**Responses**", "");
    responses.forEach((resp) => {
      const record = isRecord(resp) ? resp : {};
      out.push(`- **${String(record.name ?? "Response")}** — \`${String(record.code ?? "")} ${String(record.status ?? "")}\``);
      if (record.body) {
        out.push("", `  \`\`\`${String(record._postman_previewlanguage ?? "")}`);
        String(record.body).split("\n").forEach((line) => out.push(`  ${line}`));
        out.push("  ```");
      }
    });
    out.push("");
  }

  return out.join("\n");
}

function slugify(name: string) {
  return (name || "untitled").trim().replace(/[^\w\-. ]+/gu, "").replace(/ /g, "_") || "untitled";
}

function isFolder(item: AnyRecord) {
  return "item" in item;
}

function isLeafFolder(folder: AnyRecord) {
  const items = Array.isArray(folder.item) ? folder.item : [];
  return items.every((child) => isRecord(child) && !isFolder(child));
}

function renderLeafFolder(folder: AnyRecord) {
  const lines = [`# ${String(folder.name ?? "Folder")}`, ""];
  if (folder.description) lines.push(String(folder.description), "");
  const items = Array.isArray(folder.item) ? folder.item : [];
  items.forEach((child) => {
    if (isRecord(child)) lines.push(renderRequest(child, 2));
  });
  return `${lines.join("\n").trimEnd()}\n`;
}

function renderRequestsOnly(name: string, requests: AnyRecord[], description = "") {
  const lines = [`# ${name}`, ""];
  if (description) lines.push(description, "");
  requests.forEach((child) => lines.push(renderRequest(child, 2)));
  return `${lines.join("\n").trimEnd()}\n`;
}

function writeTree(items: AnyRecord[], parentName: string, files: MdFile[], indexLines: string[], dir = "", relPrefix = "") {
  const directRequests = items.filter((item) => !isFolder(item));
  const subFolders = items.filter(isFolder);

  if (directRequests.length > 0) {
    const fileName = `${slugify(parentName)}.md`;
    files.push({ path: `${dir}${fileName}`, content: renderRequestsOnly(parentName, directRequests) });
    indexLines.push(`- [${parentName}](${relPrefix}${fileName})`);
  }

  subFolders.forEach((folder) => {
    const name = String(folder.name ?? "Folder");
    const slug = slugify(name);
    if (isLeafFolder(folder)) {
      const fileName = `${slug}.md`;
      files.push({ path: `${dir}${fileName}`, content: renderLeafFolder(folder) });
      indexLines.push(`- [${name}](${relPrefix}${fileName})`);
    } else {
      indexLines.push(`- **${name}/**`);
      const children = Array.isArray(folder.item) ? folder.item.filter(isRecord) : [];
      writeTree(children, name, files, indexLines, `${dir}${slug}/`, `${relPrefix}${slug}/`);
    }
  });
}

function convertCollection(collection: AnyRecord): MdFile[] {
  const info = isRecord(collection.info) ? collection.info : {};
  const title = String(info.name ?? "API Collection");
  const description = String(info.description ?? "");
  const files: MdFile[] = [];
  const indexLines = [`# ${title}`, ""];

  if (description) indexLines.push(description, "");
  if (Array.isArray(collection.variable) && collection.variable.length > 0) {
    indexLines.push("## Variables", "", renderKvTable(collection.variable, ["key", "value"]), "");
  }
  const items = Array.isArray(collection.item) ? collection.item.filter(isRecord) : [];
  if (items.length > 0) {
    indexLines.push("## Endpoints", "");
    writeTree(items, title, files, indexLines);
  }

  return [{ path: "README.md", content: `${indexLines.join("\n").trimEnd()}\n` }, ...files];
}

function convertOpenApi(spec: AnyRecord): MdFile[] {
  const info = isRecord(spec.info) ? spec.info : {};
  const title = String(info.title ?? "API Documentation");
  const version = info.version ? ` v${String(info.version)}` : "";
  const description = String(info.description ?? "");
  const files: MdFile[] = [];
  const paths = isRecord(spec.paths) ? spec.paths : {};
  const tags = new Map<string, Array<{ path: string; method: string; operation: AnyRecord }>>();

  Object.entries(paths).forEach(([path, methods]) => {
    if (!isRecord(methods)) return;
    Object.entries(methods).forEach(([method, operation]) => {
      if (!["get", "post", "put", "patch", "delete", "head", "options"].includes(method) || !isRecord(operation)) return;
      const tag = Array.isArray(operation.tags) && operation.tags[0] ? String(operation.tags[0]) : "Endpoints";
      if (!tags.has(tag)) tags.set(tag, []);
      tags.get(tag)!.push({ path, method: method.toUpperCase(), operation });
    });
  });

  const indexLines = [`# ${title}${version}`, ""];
  if (description) indexLines.push(description, "");
  indexLines.push("## Endpoints", "");

  tags.forEach((operations, tag) => {
    const fileName = `${slugify(tag)}.md`;
    indexLines.push(`- [${tag}](${fileName})`);
    files.push({ path: fileName, content: renderOpenApiTag(tag, operations, spec) });
  });

  return [{ path: "README.md", content: `${indexLines.join("\n").trimEnd()}\n` }, ...files];
}

function renderOpenApiTag(tag: string, operations: Array<{ path: string; method: string; operation: AnyRecord }>, spec: AnyRecord) {
  const lines = [`# ${tag}`, ""];
  operations.forEach(({ path, method, operation }) => {
    lines.push(`## ${operation.summary ? String(operation.summary) : `${method} ${path}`}`, "");
    lines.push(`\`${method} ${path}\``, "");
    if (operation.description) lines.push(String(operation.description), "");

    const parameters = Array.isArray(operation.parameters) ? operation.parameters : [];
    const query = parameters.filter((p) => isRecord(p) && p.in === "query");
    const pathParams = parameters.filter((p) => isRecord(p) && p.in === "path");
    const headers = parameters.filter((p) => isRecord(p) && p.in === "header");
    if (query.length > 0) lines.push("**Query parameters**", "", renderOpenApiParams(query), "");
    if (pathParams.length > 0) lines.push("**Path variables**", "", renderOpenApiParams(pathParams), "");
    if (headers.length > 0) lines.push("**Headers**", "", renderOpenApiParams(headers), "");

    if (isRecord(operation.requestBody)) {
      lines.push("**Request body**", "");
      lines.push(renderOpenApiRequestBody(operation.requestBody, spec), "");
    }

    if (isRecord(operation.responses)) {
      lines.push("**Responses**", "");
      Object.entries(operation.responses).forEach(([code, response]) => {
        const resolved = resolveRef(response, spec);
        const description = isRecord(resolved) ? String(resolved.description ?? "") : "";
        lines.push(`- \`${code}\` ${description}`.trim());
      });
      lines.push("");
    }
  });
  return `${lines.join("\n").trimEnd()}\n`;
}

function renderOpenApiParams(params: unknown[]) {
  return renderKvTable(params.map((param) => {
    const record = resolveRef(param, {}) as AnyRecord;
    const schema = isRecord(record.schema) ? record.schema : {};
    return {
      key: record.name,
      value: schema.type ?? "",
      description: record.description ?? "",
    };
  }), ["key", "value", "description"]);
}

function renderOpenApiRequestBody(requestBody: AnyRecord, spec: AnyRecord) {
  const content = isRecord(requestBody.content) ? requestBody.content : {};
  const media = Object.keys(content)[0];
  if (!media) return "";
  const mediaObj = isRecord(content[media]) ? content[media] : {};
  const example = mediaObj.example ?? (isRecord(mediaObj.examples) ? Object.values(mediaObj.examples)[0] : undefined);
  const schema = resolveRef(mediaObj.schema, spec);
  const payload = example ? stringifyExample(example) : schema ? JSON.stringify(schema, null, 2) : "";
  const lang = media.includes("json") ? "json" : "";
  return [`_${media}_`, "", `\`\`\`${lang}`, payload, "```"].join("\n");
}

function resolveRef(value: unknown, spec: AnyRecord): unknown {
  if (!isRecord(value) || typeof value.$ref !== "string") return value;
  const parts = value.$ref.replace(/^#\//, "").split("/");
  let cursor: unknown = spec;
  for (const part of parts) {
    if (!isRecord(cursor)) return value;
    cursor = cursor[part];
  }
  return cursor;
}

function stringifyExample(value: unknown) {
  const resolved = isRecord(value) && "value" in value ? value.value : value;
  return typeof resolved === "string" ? resolved : JSON.stringify(resolved, null, 2);
}

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function createZip(files: MdFile[]) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  files.forEach((file) => {
    const name = encoder.encode(file.path);
    const data = encoder.encode(file.content);
    const crc = crc32(data);
    const local = zipHeader(0x04034b50, name, data.length, crc, offset);
    const central = zipHeader(0x02014b50, name, data.length, crc, offset);
    localParts.push(local, name, data);
    centralParts.push(central, name);
    offset += local.length + name.length + data.length;
  });

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const view = new DataView(end.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, files.length, true);
  view.setUint16(10, files.length, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, offset, true);

  const blobParts = [...localParts, ...centralParts, end].map((part) => {
    const copy = new Uint8Array(part.byteLength);
    copy.set(part);
    return copy.buffer;
  });
  return new Blob(blobParts, { type: "application/zip" });
}

function zipHeader(signature: number, name: Uint8Array, size: number, crc: number, offset: number) {
  const isCentral = signature === 0x02014b50;
  const bytes = new Uint8Array(isCentral ? 46 : 30);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, signature, true);
  if (isCentral) {
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint32(16, crc, true);
    view.setUint32(20, size, true);
    view.setUint32(24, size, true);
    view.setUint16(28, name.length, true);
    view.setUint32(42, offset, true);
  } else {
    view.setUint16(4, 20, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, size, true);
    view.setUint32(22, size, true);
    view.setUint16(26, name.length, true);
  }
  return bytes;
}

function crc32(data: Uint8Array) {
  let crc = -1;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ -1) >>> 0;
}
