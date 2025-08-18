import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from '@/types';

interface UserAvatarProps {
  user: Pick<User, 'photoUrl' | 'displayName' | 'name' | 'email'>;
  className?: string;
}

export function UserAvatar({ user, className }: UserAvatarProps) {
  const initials = (user.displayName || user.name || user.email || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Avatar className={className}>
      <AvatarImage 
        src={user.photoUrl} 
        alt={initials} 
      />
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}