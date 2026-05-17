import { createContext, useContext, type ReactNode } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export type Lang = "vi" | "en";

type Dict = Record<string, string>;

const dict: Record<Lang, Dict> = {
  vi: {
    "app.tagline": "Bộ công cụ dev — chạy 100% trên trình duyệt",
    "app.description": "Một nơi cho mọi tool dev hay dùng. JSON, encode, generator, converter, text utilities — và sẽ thêm nữa.",
    "app.quickSearchHint.before": "Bấm",
    "app.quickSearchHint.after": "để tìm tool nhanh.",
    "nav.home": "Home",
    "search.placeholder": "Tìm tool...",
    "search.commandPlaceholder": "Tìm tool, gõ keyword...",
    "search.empty": "Không tìm thấy tool nào.",
    "sidebar.empty": "Không có tool nào khớp.",
    "sidebar.customizeTitle": "Tùy chỉnh vị trí / pin tool",
    "sidebar.customizeHint": "Kéo thả để đổi vị trí, bấm pin để đưa lên đầu.",
    "sidebar.arrange": "Sắp xếp tool",
    "sidebar.pinned": "Pinned",
    "pin.pin": "Pin lên đầu",
    "pin.unpin": "Bỏ pin",
    "cta.title": "Muốn thêm tool khác?",
    "cta.desc": "Gửi góp ý hoặc yêu cầu thêm tool mới — mô tả use-case, input/output mong muốn.",
    "cta.button": "Gửi yêu cầu",
    "feedback.title": "Góp ý / yêu cầu thêm tool",
    "feedback.desc": "Mô tả tool bạn muốn thêm, use-case, input/output mong muốn. Form này mở email client hoặc copy nội dung để gửi nhanh.",
    "feedback.name": "Tên / team",
    "feedback.namePlaceholder": "Tên của bạn",
    "feedback.contact": "Liên hệ",
    "feedback.contactPlaceholder": "Email, Telegram, GitHub...",
    "feedback.idea": "Nội dung góp ý",
    "feedback.ideaPlaceholder": "Ví dụ: thêm tool parse log nginx, input là log text, output thống kê status code...",
    "feedback.close": "Đóng",
    "feedback.copy": "Copy nội dung",
    "feedback.send": "Gửi góp ý",
    "feedback.copied": "Đã copy nội dung góp ý",
  },
  en: {
    "app.tagline": "Developer toolbox — runs 100% in your browser",
    "app.description": "One place for everyday developer tools. JSON, encoding, generators, converters, text utilities — with more to come.",
    "app.quickSearchHint.before": "Press",
    "app.quickSearchHint.after": "to quickly find a tool.",
    "nav.home": "Home",
    "search.placeholder": "Search tools...",
    "search.commandPlaceholder": "Search tools or keywords...",
    "search.empty": "No tools found.",
    "sidebar.empty": "No matching tools.",
    "sidebar.customizeTitle": "Customize order / pin tools",
    "sidebar.customizeHint": "Drag to reorder, click pin to move a tool to the top.",
    "sidebar.arrange": "Arrange tools",
    "sidebar.pinned": "Pinned",
    "pin.pin": "Pin to top",
    "pin.unpin": "Unpin",
    "cta.title": "Want another tool?",
    "cta.desc": "Send feedback or request a new tool — describe the use-case and expected input/output.",
    "cta.button": "Send request",
    "feedback.title": "Feedback / request a tool",
    "feedback.desc": "Describe the tool you want, use-case, and expected input/output. This form opens your email client or copies the request content.",
    "feedback.name": "Name / team",
    "feedback.namePlaceholder": "Your name",
    "feedback.contact": "Contact",
    "feedback.contactPlaceholder": "Email, Telegram, GitHub...",
    "feedback.idea": "Feedback / request",
    "feedback.ideaPlaceholder": "Example: add an nginx log parser; input is log text, output is status-code stats...",
    "feedback.close": "Close",
    "feedback.copy": "Copy content",
    "feedback.send": "Send feedback",
    "feedback.copied": "Feedback content copied",
  },
};

const I18nContext = createContext<{ lang: Lang; setLang: (lang: Lang) => void; t: (key: string) => string } | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useLocalStorage<Lang>("ui-language", "vi");
  const t = (key: string) => dict[lang][key] ?? dict.vi[key] ?? key;
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
