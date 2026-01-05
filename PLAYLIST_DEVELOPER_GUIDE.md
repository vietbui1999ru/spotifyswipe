# Playlist Management - Developer Guide

**Target:** Frontend developers maintaining or extending playlist features
**Language:** TypeScript + React 19 + Next.js 15
**Date:** January 3, 2026

---

## Architecture Overview

### Component Hierarchy

```
Dashboard Layout
├── Navigation
├── Main Content
│   ├── Playlists Page (/playlists)
│   │   ├── PlaylistCard (repeated)
│   │   ├── CreatePlaylistModal
│   │   └── DeleteConfirmModal
│   │
│   ├── Playlist Detail (/playlists/[id])
│   │   ├── PlaylistHeader
│   │   │   └── EditPlaylistModal
│   │   ├── PlaylistSongList
│   │   └── DeleteConfirmModal
│   │
│   └── Swipe Page (/swipe)
│       ├── SongCard
│       └── SaveToPlaylistModal
│           └── CreatePlaylistModal
```

### Data Flow

```
User Action
    ↓
Component State Update
    ↓
Hook API Call (usePlaylist/usePlaylists)
    ↓
apiClient Request (with JWT cookie)
    ↓
Backend Response
    ↓
State Update / UI Render
    ↓
User Feedback (modal close, list update, etc.)
```

### State Management Pattern

```typescript
// Typically:
const [modalOpen, setModalOpen] = useState(false);
const [isLoading, setIsLoading] = useState(false);
const { playlist, error, fetchPlaylist, updatePlaylist } = usePlaylist();

const handleUpdate = useCallback(async (data) => {
  setIsLoading(true);
  try {
    await updatePlaylist(id, data);
    setModalOpen(false);
  } catch (err) {
    // Error already set in hook
  } finally {
    setIsLoading(false);
  }
}, [updatePlaylist]);
```

---

## Hook Reference

### usePlaylist(options?)

**Purpose:** Manage single playlist CRUD operations

**Options:**
```typescript
interface UsePlaylistOptions {
  playlistId?: string; // Optional initial ID
}
```

**Returns:**
```typescript
{
  // State
  playlist: PlaylistDetail | null,
  isLoading: boolean,
  error: string | null,

  // Methods
  fetchPlaylist: (id: string) => Promise<PlaylistDetail | null>,
  createPlaylist: (name, desc) => Promise<Playlist | null>,
  updatePlaylist: (id, name, desc) => Promise<Playlist | null>,
  deletePlaylist: (id: string) => Promise<boolean>,
  addSong: (playlistId, songId) => Promise<boolean>,
  removeSong: (playlistId, songId) => Promise<boolean>,
  addMultipleSongs: (playlistId, songIds[]) => Promise<boolean>,
}
```

**Usage:**
```typescript
const { playlist, fetchPlaylist, updatePlaylist } = usePlaylist();

useEffect(() => {
  fetchPlaylist('playlist-id');
}, []);

const handleUpdate = async (name, desc) => {
  await updatePlaylist('playlist-id', name, desc);
};
```

### usePlaylists()

**Purpose:** Manage playlist list and batch operations

**Returns:**
```typescript
{
  // State
  playlists: Playlist[],
  isLoading: boolean,
  error: string | null,

  // Methods
  fetchPlaylists: () => Promise<void>,
  createPlaylist: (name, desc) => Promise<Playlist | null>,
  deletePlaylist: (id: string) => Promise<boolean>,
  addSongsToPlaylist: (playlistId, songIds[]) => Promise<boolean>,
}
```

**Auto-fetches on mount** via useEffect

**Usage:**
```typescript
const { playlists, createPlaylist } = usePlaylists();

// Playlists automatically fetched on component mount
// Create a new one:
await createPlaylist('My Playlist', 'Description');
// List updates automatically
```

---

## API Endpoints Used

### List Playlists
```
GET /api/playlists
Response: { success: boolean, data: { playlists: Playlist[] } }
```

### Create Playlist
```
POST /api/playlists
Body: { name: string, description?: string }
Response: { success: boolean, data: { playlist: Playlist } }
```

### Get Playlist Detail
```
GET /api/playlists/:id
Response: { success: boolean, data: { playlist: PlaylistDetail } }
```

### Update Playlist
```
PATCH /api/playlists/:id
Body: { name?: string, description?: string }
Response: { success: boolean, data: { playlist: Playlist } }
```

### Delete Playlist
```
DELETE /api/playlists/:id
Response: { success: boolean, data: { message: string } }
```

### Add Song to Playlist
```
POST /api/playlists/:id/songs
Body: { songId: string }
Response: { success: boolean, data: { playlist: PlaylistDetail } }
```

### Remove Song from Playlist
```
DELETE /api/playlists/:id/songs/:songId
Response: { success: boolean, data: { playlist: PlaylistDetail } }
```

---

## Component API Reference

### PlaylistCard

```typescript
interface PlaylistCardProps {
  playlist: Playlist;
  onDelete?: (playlistId: string) => void;
  isDeleting?: boolean;
}

// Usage:
<PlaylistCard
  playlist={p}
  onDelete={handleDelete}
  isDeleting={deletingId === p.id}
/>
```

### CreatePlaylistModal

```typescript
interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, desc: string) => Promise<void>;
  isLoading?: boolean;
}

// Usage:
<CreatePlaylistModal
  isOpen={open}
  onClose={() => setOpen(false)}
  onCreate={handleCreate}
  isLoading={isCreating}
/>
```

### EditPlaylistModal

```typescript
interface EditPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, desc: string) => Promise<void>;
  initialName: string;
  initialDescription: string;
  isLoading?: boolean;
}

// Usage:
<EditPlaylistModal
  isOpen={open}
  onClose={() => setOpen(false)}
  onSubmit={handleSubmit}
  initialName={playlist.name}
  initialDescription={playlist.description}
  isLoading={isSaving}
/>
```

### DeleteConfirmModal

```typescript
interface DeleteConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  danger?: boolean; // Red styling if true
}

// Usage:
<DeleteConfirmModal
  isOpen={confirmOpen}
  title="Delete Playlist"
  message={`Delete "${name}"?`}
  onConfirm={handleDelete}
  onCancel={() => setConfirmOpen(false)}
  isLoading={isDeleting}
  danger
/>
```

### PlaylistHeader

```typescript
interface PlaylistHeaderProps {
  playlist: PlaylistDetail;
  onEdit: (name: string, desc: string) => Promise<void>;
  onDelete: () => void;
  isDeleting?: boolean;
  isEditing?: boolean;
}

// Usage:
<PlaylistHeader
  playlist={playlist}
  onEdit={handleEdit}
  onDelete={handleDelete}
  isDeleting={isDeleting}
  isEditing={isEditing}
/>
```

### PlaylistSongList

```typescript
interface PlaylistSongListProps {
  songs: Track[];
  onRemoveSong: (songId: string) => Promise<void>;
  isRemoving?: boolean;
}

// Usage:
<PlaylistSongList
  songs={playlist.songs}
  onRemoveSong={handleRemove}
  isRemoving={removingSongId === song.id}
/>
```

### SaveToPlaylistModal

```typescript
interface SaveToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlists: Playlist[];
  songIds: string[];
  onSave: (playlistIds: string[]) => Promise<void>;
  onCreatePlaylist?: (name: string, desc: string) => Promise<Playlist | null>;
  isLoading?: boolean;
}

// Usage:
<SaveToPlaylistModal
  isOpen={open}
  onClose={() => setOpen(false)}
  playlists={playlists}
  songIds={likedSongs}
  onSave={handleSave}
  onCreatePlaylist={handleCreate}
  isLoading={isSaving}
/>
```

---

## Common Patterns

### Pattern 1: Create with Modal

```typescript
const { createPlaylist } = usePlaylists();
const [modalOpen, setModalOpen] = useState(false);
const [isCreating, setIsCreating] = useState(false);

const handleCreate = useCallback(async (name, desc) => {
  setIsCreating(true);
  try {
    await createPlaylist(name, desc);
    setModalOpen(false);
  } finally {
    setIsCreating(false);
  }
}, [createPlaylist]);

return (
  <>
    <button onClick={() => setModalOpen(true)}>Create</button>
    <CreatePlaylistModal
      isOpen={modalOpen}
      onClose={() => setModalOpen(false)}
      onCreate={handleCreate}
      isLoading={isCreating}
    />
  </>
);
```

### Pattern 2: Delete with Confirmation

```typescript
const [confirmOpen, setConfirmOpen] = useState(false);
const [isDeleting, setIsDeleting] = useState(false);

const handleConfirmDelete = useCallback(async () => {
  setIsDeleting(true);
  try {
    const success = await deletePlaylist(id);
    if (success) setConfirmOpen(false);
  } finally {
    setIsDeleting(false);
  }
}, [id, deletePlaylist]);

return (
  <>
    <button onClick={() => setConfirmOpen(true)}>Delete</button>
    <DeleteConfirmModal
      isOpen={confirmOpen}
      title="Delete Playlist"
      message={`Delete "${name}"?`}
      onConfirm={handleConfirmDelete}
      onCancel={() => setConfirmOpen(false)}
      isLoading={isDeleting}
    />
  </>
);
```

### Pattern 3: Fetch on Mount with Dependency

```typescript
const { playlist, fetchPlaylist } = usePlaylist();
const { id } = useParams();

useEffect(() => {
  if (id) {
    fetchPlaylist(id);
  }
}, [id, fetchPlaylist]);
```

### Pattern 4: Optimistic Updates

```typescript
const handleRemoveSong = useCallback(async (songId: string) => {
  // Optimistically update UI
  setPlaylist(prev => ({
    ...prev,
    songs: prev.songs.filter(s => s.id !== songId),
  }));

  try {
    await removeSong(playlistId, songId);
  } catch (err) {
    // Revert on error
    await fetchPlaylist(playlistId);
  }
}, []);
```

---

## Error Handling

### Try-Catch Pattern

```typescript
const handleOperation = useCallback(async () => {
  setError(null);
  try {
    const result = await apiOperation();
    // Handle success
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    setError(message);
  }
}, []);
```

### Hook Error State

Hooks automatically set error state:

```typescript
const { error, playlist } = usePlaylist();

// Use error in UI:
{error && (
  <div className="error">
    {error}
    <button onClick={retry}>Retry</button>
  </div>
)}
```

### API Client Interceptor

401 errors automatically redirect to login:

```typescript
// In apiClient.ts - already configured
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);
```

---

## TypeScript Interfaces

### Core Data Types

```typescript
export interface Playlist {
  id: string;
  name: string;
  description: string;
  songCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistDetail extends Playlist {
  songs: Track[];
  songIds: string[];
}

interface Track {
  id: string;
  name: string;
  artists: Array<{ id: string; name: string }>;
  album: {
    id: string;
    name: string;
    imageUrl: string | null;
  };
  durationMs: number;
  previewUrl?: string | null;
  popularity: number;
}
```

### API Response Types

```typescript
interface PlaylistsListResponse {
  success: boolean;
  data: {
    playlists: Playlist[];
  };
}

interface PlaylistDetailResponse {
  success: boolean;
  data: {
    playlist: PlaylistDetail;
  };
}

interface CreatePlaylistResponse {
  success: boolean;
  data: {
    playlist: Playlist;
  };
}
```

---

## Performance Considerations

### Memoization

```typescript
// ✅ Good: Dependency array prevents unnecessary recreations
const handleDelete = useCallback(
  async (id: string) => { /* ... */ },
  [deletePlaylist] // Only recreate if deletePlaylist changes
);

// ❌ Bad: No dependency array causes closure issues
const handleDelete = async (id: string) => { /* ... */ };
```

### Audio Playback Memory

```typescript
// Use ref map to prevent multiple audio instances
const audioRefMap = useRef<Map<string, HTMLAudioElement>>(new Map());

const handleStop = useCallback(() => {
  // Clean up on unmount
  audioRefMap.current.forEach(audio => audio.pause());
}, []);
```

### Batch Operations

```typescript
// ✅ Good: Parallel requests with Promise.all
await Promise.all(
  playlistIds.map(id => addSong(id, songId))
);

// ❌ Bad: Sequential requests (slower)
for (const id of playlistIds) {
  await addSong(id, songId);
}
```

---

## Testing Helper Functions

### Mock usePlaylist Hook

```typescript
jest.mock('@/hooks/usePlaylist', () => ({
  usePlaylist: () => ({
    playlist: { id: '1', name: 'Test', songs: [] },
    isLoading: false,
    error: null,
    fetchPlaylist: jest.fn(),
    updatePlaylist: jest.fn(),
    deletePlaylist: jest.fn(),
  }),
}));
```

### Mock API Responses

```typescript
jest.mock('@/lib/apiClient', () => ({
  get: jest.fn().mockResolvedValue({
    data: {
      success: true,
      data: { playlists: [] },
    },
  }),
}));
```

---

## Common Issues & Solutions

### Issue 1: State Not Updating After Delete

**Problem:** Component deletes item but state doesn't update

**Solution:** Ensure hook or callback updates parent state:

```typescript
// ❌ Wrong: Only updates local state
const [local, setLocal] = useState(data);
await deletePlaylist(id);
// setLocal not called - data stale

// ✅ Correct: Hook handles update
const { playlists, deletePlaylist } = usePlaylists();
await deletePlaylist(id); // Hook updates playlists state
```

### Issue 2: Modal Stuck Open

**Problem:** Modal doesn't close after action

**Solution:** Ensure callback closes modal:

```typescript
const handleCreate = async (name, desc) => {
  await createPlaylist(name, desc);
  setModalOpen(false); // Must call this
};
```

### Issue 3: Form Validation Not Working

**Problem:** Empty form submitted

**Solution:** Add client-side validation:

```typescript
if (!name.trim()) {
  setError('Name required');
  return;
}
await createPlaylist(name, desc);
```

### Issue 4: Audio Playing from Multiple Tabs

**Problem:** Multiple audio elements playing simultaneously

**Solution:** Stop previous playback:

```typescript
if (playingSongId) {
  const otherAudio = audioRefMap.get(playingSongId);
  if (otherAudio) otherAudio.pause();
}
setPlayingSongId(songId);
```

---

## Debugging

### Enable Request Logging

```typescript
// In apiClient.ts
apiClient.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.url, config.method);
    return config;
  }
);

apiClient.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.data);
    return response;
  }
);
```

### Check Hook State

```typescript
const { playlists, isLoading, error } = usePlaylists();

useEffect(() => {
  console.log('Playlists updated:', { playlists, isLoading, error });
}, [playlists, isLoading, error]);
```

### React DevTools

1. Install React DevTools extension
2. Inspect component tree
3. Check state in "Hooks" section
4. View re-render reasons in Profiler

---

## Future Enhancement Guidelines

### Adding Playlist Search

```typescript
// Add to usePlaylists hook:
const [searchTerm, setSearchTerm] = useState('');
const filteredPlaylists = useMemo(
  () => playlists.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  ),
  [playlists, searchTerm]
);
```

### Adding Playlist Sorting

```typescript
const [sortBy, setSortBy] = useState<'name' | 'date'>('date');
const sortedPlaylists = useMemo(
  () => [...playlists].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }),
  [playlists, sortBy]
);
```

### Adding Collaborative Playlists

```typescript
// Extend Playlist interface:
interface Playlist {
  id: string;
  name: string;
  collaborators: string[]; // User IDs
  isCollaborative: boolean;
}

// Add to hooks:
sharePlaylist: (playlistId: string, userEmail: string) => Promise<void>;
```

---

## Deployment Checklist

- [ ] All TypeScript errors resolved
- [ ] All console warnings addressed
- [ ] All test cases pass
- [ ] Error states tested
- [ ] Performance benchmarks met
- [ ] Mobile responsive verified
- [ ] Accessibility audit passed
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Changelog updated

---

## Resources

- [React Hooks Documentation](https://react.dev/reference/react/hooks)
- [Next.js App Router](https://nextjs.org/docs/app)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

## Support

For questions or issues:

1. Check error messages in browser console
2. Review API responses in Network tab
3. Check component props with React DevTools
4. Verify backend is running on :3001
5. Check browser console for warnings

---

**Last Updated:** January 3, 2026
**Version:** 1.0
**Status:** Production Ready
