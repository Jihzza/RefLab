export interface SearchedUser {
  id: string;
  username: string;
  name: string | null;
  photo_url: string | null;
  is_following: boolean;
}
