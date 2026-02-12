import React from 'react'
import SearchInput from './SearchInput'
import UserListItem from './UserListItem'
import SearchHistoryItem from './SearchHistoryItem'
import { useSearch } from '@/features/search/hooks/useSearch'

export default function SearchPage() {
  const { searchTerm, setSearchTerm, results, isLoading, history, historyUsers, clearHistory, clearHistoryUsers, selectHistoryItem, selectHistoryUser, addHistoryUser } = useSearch()

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Search users</h2>

      <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search by name or username" />

      {(historyUsers.length > 0 || history.length > 0) && (
        <div className="mt-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-(--text-muted)">Recent searches</div>
            <div className="flex gap-3">
              {historyUsers.length > 0 && (
                <button onClick={clearHistoryUsers} className="text-xs text-(--text-muted) hover:underline">Clear users</button>
              )}
              {history.length > 0 && (
                <button onClick={clearHistory} className="text-xs text-(--text-muted) hover:underline">Clear terms</button>
              )}
            </div>
          </div>

          <div className="mt-2 flex flex-col gap-2">
            {historyUsers.map((u) => (
              <SearchHistoryItem key={u.username} user={u} onClick={() => selectHistoryUser(u)} />
            ))}

            {history.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {history.map((h) => (
                  <button key={h} onClick={() => selectHistoryItem(h)} className="px-3 py-1 bg-(--bg-surface-2) text-(--text-muted) rounded-full text-sm">
                    {h}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 bg-(--bg-primary) border border-(--border-subtle) rounded-(--radius-input)">
        {isLoading ? (
          <div className="p-4 text-(--text-muted)">Searching…</div>
        ) : results.length === 0 ? (
          <div className="p-4 text-(--text-muted)">No results</div>
        ) : (
          results.map((u) => <UserListItem key={u.id} user={u} onSelect={addHistoryUser} />)
        )}
      </div>
    </div>
  )
}
