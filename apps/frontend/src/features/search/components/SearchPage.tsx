import SearchInput from './SearchInput'
import UserListItem from './UserListItem'
import SearchHistoryItem from './SearchHistoryItem'
import { useSearch } from '@/features/search/hooks/useSearch'

export default function SearchPage() {
  const { searchTerm, setSearchTerm, results, isLoading, historyUsers, clearHistoryUsers, selectHistoryUser, addHistoryUser } = useSearch()

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Search users</h2>

      <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search by name or username" />

      {historyUsers.length > 0 && (
        <div className="mt-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-(--text-muted)">Recent searches</div>
            <div>
              <button onClick={clearHistoryUsers} className="text-xs text-(--text-muted) hover:underline">Clear</button>
            </div>
          </div>

          <div className="mt-2 flex flex-col gap-2">
            {historyUsers.map((u) => (
              <SearchHistoryItem key={u.username} user={u} onClick={() => selectHistoryUser(u)} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 bg-(--bg-primary) border border-(--border-subtle) rounded-(--radius-input)">
        {isLoading ? (
          <div className="p-4 text-(--text-muted)">Searching…</div>
        ) : searchTerm.trim() === '' ? (
          null
        ) : results.length === 0 ? (
          <div className="p-4 text-(--text-muted)">No results</div>
        ) : (
          results.map((u) => <UserListItem key={u.id} user={u} onSelect={addHistoryUser} />)
        )}
      </div>
    </div>
  )
}
