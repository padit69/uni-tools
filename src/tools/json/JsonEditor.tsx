import CodeMirror, { type Extension, type ReactCodeMirrorProps } from "@uiw/react-codemirror";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { yaml as yamlLang } from "@codemirror/lang-yaml";
import { xml as xmlLang } from "@codemirror/lang-xml";
import { linter, lintGutter } from "@codemirror/lint";
import { oneDark } from "@codemirror/theme-one-dark";
import { useMemo } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";

type Lang = "json" | "yaml" | "xml" | "text";

interface JsonEditorProps extends Omit<ReactCodeMirrorProps, "extensions" | "theme"> {
  lang?: Lang;
  withLinter?: boolean;
}

export function JsonEditor({
  lang = "json",
  withLinter = false,
  className,
  ...props
}: JsonEditorProps) {
  const { resolved } = useTheme();

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
      {...props}
    />
  );
}
