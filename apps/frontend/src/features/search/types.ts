/**
 * A user entry stored in the search history (localStorage).
 * Structurally identical to UserSearchResult from messages,
 * but defined independently to keep features decoupled.
 */
export interface SearchHistoryEntry {
  id: string
  username: string
  name: string | null
  photo_url: string | null
}
