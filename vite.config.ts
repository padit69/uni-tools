import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

function injectGoogleTag(measurementId: string | undefined): Plugin {
  return {
    name: "inject-google-tag",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        if (!measurementId) {
          return html.replace(/\s*<!-- GOOGLE_TAG -->\n?/, "\n");
        }
        const tag = `<!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${measurementId}');
    </script>`;
        return html.replace("<!-- GOOGLE_TAG -->", tag);
      },
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const gaId = env.VITE_GA_MEASUREMENT_ID?.trim() || undefined;

  return {
    plugins: [react(), tailwindcss(), injectGoogleTag(gaId)],
    preview: {
      allowedHosts: ["tools.hihi.team"],
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "CDN-Cache-Control": "no-store",
        "Cloudflare-CDN-Cache-Control": "no-store",
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
    },
  };
});
