"use client";

import React from "react";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Undo,
  Redo,
  Code,
  Minus,
} from "lucide-react";

interface EditorProps {
  content?: string;
  onChange?: (html: string) => void;
  editable?: boolean;
  placeholder?: string;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      disabled={disabled}
      title={title}
      className={`
        p-1.5 rounded-md transition-all text-sm
        ${active
          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
          : "text-ink-400 hover:text-ink-100 hover:bg-ink-700"
        }
        ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      {children}
    </button>
  );
}

export default function Editor({
  content = "",
  onChange,
  editable = true,
  placeholder = "Start writing your page content here…",
}: EditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "tiptap-editor-content focus:outline-none min-h-[360px] leading-relaxed",
      },
    },
  });

  if (!editor) return null;

  const groups = [
    {
      items: [
        {
          icon: <Undo size={14} />, title: "Undo",
          onClick: () => editor.chain().focus().undo().run(),
          disabled: !editor.can().undo(),
        },
        {
          icon: <Redo size={14} />, title: "Redo",
          onClick: () => editor.chain().focus().redo().run(),
          disabled: !editor.can().redo(),
        },
      ],
    },
    {
      items: [
        {
          icon: <Heading1 size={14} />, title: "Heading 1",
          onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
          active: editor.isActive("heading", { level: 1 }),
        },
        {
          icon: <Heading2 size={14} />, title: "Heading 2",
          onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
          active: editor.isActive("heading", { level: 2 }),
        },
      ],
    },
    {
      items: [
        {
          icon: <Bold size={14} />, title: "Bold",
          onClick: () => editor.chain().focus().toggleBold().run(),
          active: editor.isActive("bold"),
        },
        {
          icon: <Italic size={14} />, title: "Italic",
          onClick: () => editor.chain().focus().toggleItalic().run(),
          active: editor.isActive("italic"),
        },
        {
          icon: <UnderlineIcon size={14} />, title: "Underline",
          onClick: () => editor.chain().focus().toggleUnderline().run(),
          active: editor.isActive("underline"),
        },
        {
          icon: <Code size={14} />, title: "Code",
          onClick: () => editor.chain().focus().toggleCode().run(),
          active: editor.isActive("code"),
        },
      ],
    },
    {
      items: [
        {
          icon: <AlignLeft size={14} />, title: "Align left",
          onClick: () => editor.chain().focus().setTextAlign("left").run(),
          active: editor.isActive({ textAlign: "left" }),
        },
        {
          icon: <AlignCenter size={14} />, title: "Align center",
          onClick: () => editor.chain().focus().setTextAlign("center").run(),
          active: editor.isActive({ textAlign: "center" }),
        },
        {
          icon: <AlignRight size={14} />, title: "Align right",
          onClick: () => editor.chain().focus().setTextAlign("right").run(),
          active: editor.isActive({ textAlign: "right" }),
        },
      ],
    },
    {
      items: [
        {
          icon: <List size={14} />, title: "Bullet list",
          onClick: () => editor.chain().focus().toggleBulletList().run(),
          active: editor.isActive("bulletList"),
        },
        {
          icon: <ListOrdered size={14} />, title: "Ordered list",
          onClick: () => editor.chain().focus().toggleOrderedList().run(),
          active: editor.isActive("orderedList"),
        },
        {
          icon: <Quote size={14} />, title: "Blockquote",
          onClick: () => editor.chain().focus().toggleBlockquote().run(),
          active: editor.isActive("blockquote"),
        },
        {
          icon: <Minus size={14} />, title: "Horizontal rule",
          onClick: () => editor.chain().focus().setHorizontalRule().run(),
        },
      ],
    },
  ];

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900 overflow-hidden focus-within:border-amber-500/40 transition-colors">
      {editable && (
        <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-ink-800 bg-ink-950/50">
          {groups.map((group, gi) => (
            <div key={gi} className="flex items-center gap-0.5">
              {gi > 0 && <div className="w-px h-4 bg-ink-700 mx-1" />}
              {group.items.map((item, ii) => (
                <ToolbarButton key={ii} {...item}>
                  {item.icon}
                </ToolbarButton>
              ))}
            </div>
          ))}
        </div>
      )}
      <div className="p-5 prose-custom">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
