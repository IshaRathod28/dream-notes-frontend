import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { Color } from "@tiptap/extension-color";
import { TextStyle, FontSize } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";

const FONT_SIZES = ["8", "9", "10", "11", "12", "14", "16", "18", "20", "24", "28", "32", "36", "48", "72"];

// ─── Small helpers ────────────────────────────────────────────────────────────

function Sep() {
  return <div className="w-px self-stretch bg-gray-200 dark:bg-gray-700 mx-0.5" />;
}

function Btn({ onClick, active, disabled, title, children, className = "" }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      disabled={disabled}
      title={title}
      className={`
        flex items-center justify-center min-w-[26px] h-[26px] px-1 rounded text-[13px] select-none transition-colors
        ${active
          ? "bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        }
        ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
        ${className}
      `}
    >
      {children}
    </button>
  );
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────

function Toolbar({ editor }) {
  if (!editor) return null;

  const headingLevel = [1, 2, 3].find((l) => editor.isActive("heading", { level: l }));

  // Read current font size from editor attributes
  const currentSize = editor.getAttributes("textStyle").fontSize?.replace("px", "") ?? "";

  return (
    <div className="flex flex-wrap items-center gap-y-1 gap-x-0 px-2 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-t-xl">

      {/* Group 1 — Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <Btn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo (Ctrl+Z)">
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5z"/><path d="M3 2.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1H10v9a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3H3.5a.5.5 0 0 1-.5-.5z"/></svg>
        </Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo (Ctrl+Y)">
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 scale-x-[-1]" fill="currentColor"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5z"/><path d="M3 2.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1H10v9a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3H3.5a.5.5 0 0 1-.5-.5z"/></svg>
        </Btn>
      </div>

      <Sep />

      {/* Group 2 — Style + Size */}
      <div className="flex items-center gap-1">
        {/* Heading / Paragraph style */}
        <select
          value={headingLevel ?? "0"}
          onChange={(e) => {
            const val = Number(e.target.value);
            if (val === 0) editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: val }).run();
          }}
          className="h-[26px] text-[12px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-1.5 text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer min-w-[88px]"
        >
          <option value="0">Normal</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
        </select>

        {/* Font size */}
        <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 overflow-hidden h-[26px]">
          <input
            type="number"
            min="6"
            max="96"
            value={currentSize}
            placeholder="12"
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) { editor.chain().focus().unsetFontSize().run(); return; }
              editor.chain().focus().setFontSize(val + "px").run();
            }}
            className="w-[38px] text-center text-[12px] bg-transparent text-gray-700 dark:text-gray-300 focus:outline-none px-1 py-0"
          />
          <div className="flex flex-col border-l border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                const cur = parseInt(currentSize || "12");
                const next = FONT_SIZES.find((s) => parseInt(s) > cur) ?? "72";
                editor.chain().focus().setFontSize(next + "px").run();
              }}
              className="flex items-center justify-center w-4 h-[12px] hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 text-[8px] leading-none"
            >▲</button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                const cur = parseInt(currentSize || "12");
                const prev = [...FONT_SIZES].reverse().find((s) => parseInt(s) < cur) ?? "8";
                editor.chain().focus().setFontSize(prev + "px").run();
              }}
              className="flex items-center justify-center w-4 h-[12px] hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 text-[8px] leading-none"
            >▼</button>
          </div>
        </div>
      </div>

      <Sep />

      {/* Group 3 — Bold / Italic / Underline / Strike */}
      <div className="flex items-center gap-0.5">
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold (Ctrl+B)">
          <span className="font-bold text-[13px]">B</span>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic (Ctrl+I)">
          <span className="italic font-serif text-[13px]">I</span>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline (Ctrl+U)">
          <span className="underline text-[13px]">U</span>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
          <span className="line-through text-[13px]">S</span>
        </Btn>
      </div>

      <Sep />

      {/* Group 4 — Color + Highlight */}
      <div className="flex items-center gap-0.5">
        {/* Text color */}
        <label
          className="relative flex flex-col items-center justify-center cursor-pointer w-[26px] h-[26px] rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Font Color"
        >
          <span className="font-bold text-[13px] text-gray-700 dark:text-gray-300 leading-none">A</span>
          <div className="absolute bottom-[3px] left-[4px] right-[4px] h-[3px] rounded-full" style={{ backgroundColor: editor.getAttributes("textStyle").color || "#000000" }} />
          <input
            type="color"
            defaultValue="#000000"
            onInput={(e) => editor.chain().focus().setColor(e.target.value).run()}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          />
        </label>

        {/* Highlight */}
        <label
          className="relative flex flex-col items-center justify-center cursor-pointer w-[26px] h-[26px] rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Highlight Color"
        >
          <span className="text-[13px] leading-none">
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300" fill="currentColor">
              <path d="M1 13.5a.5.5 0 0 0 .5.5h3.797a.5.5 0 0 0 .353-.146l8.137-8.137a.5.5 0 0 0 0-.708L10.854 1.854a.5.5 0 0 0-.707 0L1.146 9.99a.5.5 0 0 0-.146.354v3.157zm5.49-9.196 1.853 1.853-6.44 6.44H.5v-1.71l6.99-6.583z"/>
            </svg>
          </span>
          <div
            className="absolute bottom-[3px] left-[4px] right-[4px] h-[3px] rounded-full"
            style={{ backgroundColor: editor.getAttributes("highlight").color || "#fef08a" }}
          />
          <input
            type="color"
            defaultValue="#fef08a"
            onInput={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          />
        </label>
      </div>

      <Sep />

      {/* Group 5 — Lists */}
      <div className="flex items-center gap-0.5">
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet List">
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
            <path d="M5 3.5h7a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1zm0 4h7a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1zm0 4h7a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1zM1.5 3a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1zm0 4a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1zm0 4a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1z"/>
          </svg>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered List">
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
            <path d="M5 3.5h7a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1zm0 4h7a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1zm0 4h7a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1zM1 2.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1H2v.5h.5a.5.5 0 0 1 0 1H2v.5h.5a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5v-3zm1 5.5-.595.792A.5.5 0 0 1 1 8.5V8h-.5a.5.5 0 0 1-.4-.8l.5-.667a.5.5 0 0 1 .8 0L2 7.2V6.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1H3v.5h.5a.5.5 0 0 1 0 1H3v.5h.5a.5.5 0 0 1 0 1H2zm-1 4v-.5H1.5a.5.5 0 0 1 0-1H2v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 0 1H3v.5a.5.5 0 0 1-1 0z"/>
          </svg>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Blockquote">
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
            <path d="M12 12a1 1 0 0 0 1-1V8.558a1 1 0 0 0-1-1h-1.388q0-.527.062-1.054.093-.558.31-.992t.559-.683q.34-.279.868-.279V3q-.868 0-1.52.372a3.3 3.3 0 0 0-1.085.992 4.9 4.9 0 0 0-.62 1.458A7.7 7.7 0 0 0 9 7.558V11a1 1 0 0 0 1 1zm-6 0a1 1 0 0 0 1-1V8.558a1 1 0 0 0-1-1H4.612q0-.527.062-1.054.094-.558.31-.992.217-.434.559-.683.34-.279.868-.279V3q-.868 0-1.52.372a3.3 3.3 0 0 0-1.085.992 4.9 4.9 0 0 0-.62 1.458A7.7 7.7 0 0 0 3 7.558V11a1 1 0 0 0 1 1z"/>
          </svg>
        </Btn>
      </div>

      <Sep />

      {/* Group 6 — Alignment */}
      <div className="flex items-center gap-0.5">
        <Btn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align Left">
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor"><path d="M2 12.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/></svg>
        </Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Center">
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor"><path d="M4 12.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/></svg>
        </Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align Right">
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor"><path d="M6 12.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-4-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm4-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-4-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/></svg>
        </Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} title="Justify">
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor"><path d="M2 12.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/></svg>
        </Btn>
      </div>

      <Sep />

      {/* Group 7 — Clear */}
      <Btn
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        title="Clear Formatting"
        className="gap-1 px-1.5"
      >
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor"><path d="M8.086 2.207a2 2 0 0 1 2.828 0l3.879 3.879a2 2 0 0 1 0 2.828l-5.5 5.5A2 2 0 0 1 7.879 15H5.12a2 2 0 0 1-1.414-.586l-2.5-2.5a2 2 0 0 1 0-2.828zm.66 11.34L3.453 8.254 1.914 9.793a1 1 0 0 0 0 1.414l2.5 2.5a1 1 0 0 0 .707.293H7.88a1 1 0 0 0 .707-.293z"/></svg>
        <span className="text-[11px]">Clear</span>
      </Btn>

    </div>
  );
}

// ─── RichTextEditor ───────────────────────────────────────────────────────────

export default function RichTextEditor({ content, onChange, minHeight = "120px", autoFocus = false }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: content || "",
    autofocus: autoFocus,
    onUpdate({ editor }) {
      onChange?.(editor.getHTML());
    },
  });

  // Sync content when it changes externally (e.g. switching notes)
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== content) {
      editor.commands.setContent(content || "", false);
    }
  }, [content, editor]);

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm focus-within:border-blue-400 dark:focus-within:border-blue-500 focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] transition-all">
      <Toolbar editor={editor} />
      <EditorContent
        editor={editor}
        style={{ minHeight }}
        className="rich-editor px-4 py-3 text-sm text-gray-800 dark:text-gray-200 focus:outline-none"
      />
    </div>
  );
}
