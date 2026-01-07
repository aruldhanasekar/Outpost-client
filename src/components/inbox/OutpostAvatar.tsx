// OutpostAvatar.tsx - Shows avatar ONLY for Outpost users
// No avatar/letter fallback for non-Outpost senders

interface OutpostAvatarProps {
  outpostPhotoUrl?: string | null;
  size?: number;
  className?: string;
}

export function OutpostAvatar({ 
  outpostPhotoUrl, 
  size = 64,
  className = ''
}: OutpostAvatarProps) {
  // Only render if sender is an Outpost user
  if (!outpostPhotoUrl) {
    return null;
  }

  return (
    <img
      src={outpostPhotoUrl}
      alt="Sender"
      className={`rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
      onError={(e) => {
        // Hide if image fails to load
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}

export default OutpostAvatar;