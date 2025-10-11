import { useEffect, useRef } from 'react'

type RichTextEditorProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  ariaLabel?: string
}

type ToolbarAction = {
  command: string
  icon: string
  label: string
  value?: string
}

const toolbarActions: ToolbarAction[] = [
  { command: 'bold', icon: 'B', label: 'In đậm' },
  { command: 'italic', icon: 'I', label: 'In nghiêng' },
  { command: 'underline', icon: 'U', label: 'Gạch dưới' },
  { command: 'strikeThrough', icon: 'S', label: 'Gạch ngang' },
  { command: 'insertUnorderedList', icon: '•', label: 'Danh sách dấu chấm' },
  { command: 'insertOrderedList', icon: '1.', label: 'Danh sách số' },
  { command: 'formatBlock', icon: '❝', label: 'Trích dẫn', value: 'blockquote' },
  { command: 'formatBlock', icon: '</>', label: 'Đoạn mã', value: 'pre' },
]

export function RichTextEditor({ value, onChange, placeholder, ariaLabel }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!editorRef.current) return
    const current = editorRef.current
    if (current.innerHTML !== value) {
      current.innerHTML = value || ''
    }
  }, [value])

  const handleInput = () => {
    if (!editorRef.current) return
    onChange(editorRef.current.innerHTML)
  }

  const executeCommand = (action: ToolbarAction) => {
    editorRef.current?.focus()
    document.execCommand(action.command, false, action.value ?? undefined)
    handleInput()
  }

  return (
    <div className="rich-text-editor">
      <div className="rich-text-editor__toolbar" role="toolbar" aria-label="Định dạng văn bản">
        {toolbarActions.map((action) => (
          <button
            key={action.command + (action.value ?? '')}
            type="button"
            onClick={() => executeCommand(action)}
            className="rich-text-editor__button"
            aria-label={action.label}
          >
            {action.icon}
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        className="rich-text-editor__content"
        contentEditable
        data-placeholder={placeholder}
        onInput={handleInput}
        onBlur={handleInput}
        aria-label={ariaLabel}
        spellCheck
      />
    </div>
  )
}

export default RichTextEditor