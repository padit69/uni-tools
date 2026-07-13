import CodeMirror, {
  EditorView,
  type Extension,
  type ReactCodeMirrorProps,
  type ReactCodeMirrorRef,
} from "@uiw/react-codemirror";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { yaml as yamlLang } from "@codemirror/lang-yaml";
import { xml as xmlLang } from "@codemirror/lang-xml";
import { linter, lintGutter } from "@codemirror/lint";
import { oneDark } from "@codemirror/theme-one-dark";
import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";

type Lang = "json" | "yaml" | "xml" | "text";

export interface JsonEditorHandle {
  /** Scroll to a document range and select it (highlights the row). */
  revealRange: (from: number, to: number) => void;
}

interface JsonEditorProps extends Omit<ReactCodeMirrorProps, "extensions" | "theme"> {
  lang?: Lang;
  withLinter?: boolean;
}

export const JsonEditor = forwardRef<JsonEditorHandle, JsonEditorProps>(function JsonEditor(
  { lang = "json", withLinter = false, className, onCreateEditor, ...props },
  ref
) {
  const { resolved } = useTheme();
  const cmRef = useRef<ReactCodeMirrorRef>(null);

  useImperativeHandle(ref, () => ({
    revealRange(from, to) {
      const view = cmRef.current?.view;
      if (!view) return;
      const docLen = view.state.doc.length;
      const a = Math.max(0, Math.min(from, docLen));
      const b = Math.max(a, Math.min(to, docLen));
      view.dispatch({
        selection: { anchor: a, head: b },
        effects: EditorView.scrollIntoView(a, { y: "center" }),
      });
      view.focus();
    },
  }));

  const extensions = useMemo<Extension[]>(() => {
    const ext: Extension[] = [];
    if (lang === "json") ext.push(json());
    if (lang === "yaml") ext.push(yamlLang());
    if (lang === "xml") ext.push(xmlLang());
    if (withLinter && lang === "json") {
      ext.push(linter(jsonParseLinter()), lintGutter());
    }
    return ext;
  }, [lang, withLinter]);

  return (
    <CodeMirror
      ref={cmRef}
      className={className}
      extensions={extensions}
      theme={resolved === "dark" ? oneDark : "light"}
      basicSetup={{
        foldGutter: true,
        lineNumbers: true,
        highlightActiveLine: true,
        highlightActiveLineGutter: false,
        bracketMatching: true,
        autocompletion: false,
      }}
      onCreateEditor={onCreateEditor}
      {...props}
    />
  );
});
