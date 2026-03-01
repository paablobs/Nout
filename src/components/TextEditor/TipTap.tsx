import { useMemo, useEffect } from "react";
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
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "editor",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (content !== undefined && content !== current) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  const providerValue = useMemo(() => ({ editor }), [editor]);

  return (
    <EditorContext.Provider value={providerValue}>
      <EditorContent editor={editor} />
    </EditorContext.Provider>
  );
};

export default Tiptap;
