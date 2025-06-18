// /app/editor/[username]/page.tsx
import EditPage from './EditPage';

export default function EditorUsernamePage({ params }: { params: { username: string } }) {
  return <EditPage username={params.username} />;
}