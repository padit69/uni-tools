# uni · tool

Web app đa-tool cho dev, chạy 100% trên trình duyệt — không backend, không tracking.

Tool đầu tiên: **JSON Tool** (Format / Validate / Tree view / Convert JSON↔YAML/CSV/XML).
Kiến trúc registry cho phép thêm tool mới rất nhanh.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4 + shadcn-style components (Radix primitives + cva)
- Style: Raycast / glassmorphism (frosted, gradient mesh, ⌘K)
- CodeMirror 6 cho editor, jsonc-parser cho validate, js-yaml / papaparse / fast-xml-parser cho convert
- cmdk cho command palette

## Scripts

```bash
pnpm dev          # dev server (http://localhost:5173)
pnpm build        # production build → dist/
pnpm preview      # serve dist/ locally
pnpm test         # vitest run
pnpm test:watch   # vitest watch
pnpm lint         # tsc --noEmit
```

## Thêm tool mới

1. `cp -r src/tools/_template src/tools/<your-tool>`
2. Sửa `src/tools/<your-tool>/Tool.tsx` (đổi tên export)
3. Thêm 1 entry vào `src/tools/registry.ts`:

   ```ts
   {
     id: "base64",
     slug: "base64",
     name: "Base64",
     category: "encode",
     icon: KeyRound,
     description: "Encode / decode Base64",
     keywords: ["base64", "encode", "decode"],
     Component: lazy(() => import("./base64/Tool")),
     shortcut: "⌘+B",
   }
   ```

Sidebar, Command Palette (⌘K), và route `/tools/<slug>` sẽ tự cập nhật.

## Kiến trúc

```
src/
├─ components/
│   ├─ layout/        # AppShell, Sidebar, TopBar, GlassCard
│   ├─ command-palette/  # ⌘K dialog đọc registry
│   ├─ theme/         # Light/Dark/System
│   └─ ui/            # shadcn-style primitives
├─ tools/
│   ├─ registry.ts    # 👈 trung tâm — thêm tool ở đây
│   ├─ types.ts
│   ├─ json/          # JSON tool
│   └─ _template/     # template để clone
├─ hooks/             # useLocalStorage, useToolHistory, ...
├─ pages/             # Home, NotFound
├─ lib/cn.ts
├─ routes.tsx
└─ main.tsx
```

## Privacy

Tất cả tool xử lý ngay trong trình duyệt. Không có backend, không request ra ngoài. Lịch sử input lưu ở `localStorage`, có thể xóa bằng cách xóa site data.

## Deploy

App build ra static thuần — deploy được trên Vercel, Netlify, GitHub Pages, Cloudflare Pages...

```bash
pnpm build
# upload dist/ lên static host bất kỳ
```

Nhớ config rewrite: SPA route `/*` → `/index.html`.
