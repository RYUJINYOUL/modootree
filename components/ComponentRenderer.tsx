import { ComponentLibrary } from '@/components/edit/ComponentLibrary';

interface ComponentRendererProps {
  type: string;
  uid: string;
  username: string;
  isEditable: boolean;
  isAllowed: boolean;
}

export default function ComponentRenderer({
  type,
  uid,
  username,
  isEditable,
  isAllowed
}: ComponentRendererProps) {
  const Component = ComponentLibrary[type as keyof typeof ComponentLibrary];
  
  if (!Component) return null;
  
  return (
    <Component
      username={username}
      uid={uid}
      isEditable={isEditable}
      isAllowed={isAllowed}
    />
  );
} 