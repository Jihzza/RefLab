interface SearchInputProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export default function SearchInput({ value, onChange, placeholder = 'Search users' }: SearchInputProps) {
  return (
    <div className="w-full flex items-center gap-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 px-4 py-2 bg-(--bg-surface-2) border border-(--border-subtle) text-(--text-primary) rounded-(--radius-input) focus:outline-none focus:ring-1 focus:ring-(--brand-yellow) placeholder-(--text-muted)"
      />
      {value ? (
        <button
          onClick={() => onChange('')}
          className="px-3 py-2 text-sm text-(--text-muted) bg-(--bg-surface-2) rounded-(--radius-button) hover:bg-(--bg-hover)"
          aria-label="Clear search"
        >
          Clear
        </button>
      ) : null}
    </div>
  )
}
