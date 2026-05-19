import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useI18n, type Lang } from "@/i18n";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const DEFAULT_TITLE = SITE_NAME;
const DEFAULT_DESCRIPTION =
  "Uni Tools — bộ công cụ dev đa năng, chạy hoàn toàn trên trình duyệt.";

const OG_LOCALE: Record<Lang, string> = {
  vi: "vi_VN",
  en: "en_US",
};

function upsertMeta(
  selector: string,
  create: () => HTMLMetaElement,
  content: string
) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

function removeMeta(selector: string) {
  document.head.querySelector<HTMLMetaElement>(selector)?.remove();
}

export interface PageMetaProps {
  title: string;
  description: string;
  /** Pathname only, e.g. `/tools/json`. Defaults to current location. */
  path?: string;
  /** Comma-separated keywords; omitted when empty. */
  keywords?: string;
  noindex?: boolean;
}

export function PageMeta({
  title,
  description,
  path,
  keywords,
  noindex = false,
}: PageMetaProps) {
  const { lang } = useI18n();
  const { pathname } = useLocation();
  const pagePath = path ?? pathname;
  const canonical = `${SITE_URL}${pagePath === "/" ? "" : pagePath}`;
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const image = `${SITE_URL}/favicon.svg`;

  useEffect(() => {
    document.title = fullTitle;
    document.documentElement.lang = lang;

    upsertMeta(
      'meta[name="description"]',
      () => {
        const el = document.createElement("meta");
        el.name = "description";
        return el;
      },
      description
    );

    if (keywords) {
      upsertMeta(
        'meta[name="keywords"]',
        () => {
          const el = document.createElement("meta");
          el.name = "keywords";
          return el;
        },
        keywords
      );
    } else {
      removeMeta('meta[name="keywords"]');
    }

    if (noindex) {
      upsertMeta(
        'meta[name="robots"]',
        () => {
          const el = document.createElement("meta");
          el.name = "robots";
          return el;
        },
        "noindex, nofollow"
      );
    } else {
      removeMeta('meta[name="robots"]');
    }

    const ogTags: Array<[string, string]> = [
      ["og:title", fullTitle],
      ["og:description", description],
      ["og:url", canonical],
      ["og:type", "website"],
      ["og:site_name", SITE_NAME],
      ["og:locale", OG_LOCALE[lang]],
      ["og:image", image],
    ];
    for (const [property, content] of ogTags) {
      upsertMeta(
        `meta[property="${property}"]`,
        () => {
          const el = document.createElement("meta");
          el.setAttribute("property", property);
          return el;
        },
        content
      );
    }

    const twitterTags: Array<[string, string]> = [
      ["twitter:card", "summary"],
      ["twitter:title", fullTitle],
      ["twitter:description", description],
      ["twitter:image", image],
    ];
    for (const [name, content] of twitterTags) {
      upsertMeta(
        `meta[name="${name}"]`,
        () => {
          const el = document.createElement("meta");
          el.name = name;
          return el;
        },
        content
      );
    }

    upsertLink("canonical", canonical);

    return () => {
      document.title = DEFAULT_TITLE;
      document.documentElement.lang = "vi";
      upsertMeta(
        'meta[name="description"]',
        () => {
          const el = document.createElement("meta");
          el.name = "description";
          return el;
        },
        DEFAULT_DESCRIPTION
      );
      removeMeta('meta[name="keywords"]');
      removeMeta('meta[name="robots"]');
    };
  }, [canonical, description, fullTitle, image, keywords, lang, noindex]);

  return null;
}
