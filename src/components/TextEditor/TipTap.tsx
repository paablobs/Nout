import { useMemo, useEffect, useRef } from "react";
import { useEditor, EditorContent, EditorContext } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import { all, createLowlight } from "lowlight";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";

import { ColorHighlighter } from "./ColorHighlighter/ColorHighlighter";
import { SmilieReplacer } from "./SmilieReplacer/SmilieReplacer";
import "./TipTap.css";

interface TiptapProps {
  content: string;
  onChange?: (content: string) => void;
  editable?: boolean;
}

// create a lowlight instance
const lowlight = createLowlight(all);

const Tiptap = ({ content, onChange, editable = true }: TiptapProps) => {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false },
      }),
      Highlight,
      Typography,
      ColorHighlighter,
      SmilieReplacer,
      CodeBlockLowlight.configure({
        lowlight,
      }),
    ],
    content: content ?? "",
    editable,
    autofocus: "end",
    onUpdate: ({ editor: ed }) => {
      onChangeRef.current?.(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class: "editor",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (content === undefined) return;
    const current = editor.getHTML();
    if (content === current) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        editor.commands.setContent(content);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [editor, content]);

  const providerValue = useMemo(() => ({ editor }), [editor]);

  return (
    <EditorContext.Provider value={providerValue}>
      <div data-testid="tiptap-editor">
        <EditorContent editor={editor} />
      </div>
    </EditorContext.Provider>
  );
};

export default Tiptap;
