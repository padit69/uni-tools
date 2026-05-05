/**
 * Template để thêm tool mới.
 *
 * Cách dùng:
 *   1. Copy thư mục này: cp -r src/tools/_template src/tools/<your-tool>
 *   2. Sửa Tool.tsx và file pure-fn (nếu có)
 *   3. Thêm 1 entry vào src/tools/registry.ts:
 *
 *        {
 *          id: "your-tool",
 *          slug: "your-tool",
 *          name: "Your Tool",
 *          category: "encode",                  // json | encode | generate | convert | text
 *          icon: KeyRound,                      // lucide-react icon
 *          description: "Mô tả ngắn",
 *          keywords: ["base64", "encode"],     // dùng cho ⌘K fuzzy search
 *          Component: lazy(() => import("./your-tool/Tool")),
 *          shortcut: "⌘+B",                    // optional
 *        }
 *
 *   Sidebar và Command Palette sẽ tự cập nhật. Không cần đụng routing.
 */
export {};
