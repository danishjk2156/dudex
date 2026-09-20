import React from 'react';

/**
 * DefaultUserAvatarSvg
 * A clean, modern, friendly store operator profile portrait SVG avatar
 */
export function DefaultUserAvatarSvg({ className = 'w-full h-full' }) {
  return (
    <svg
      viewBox="0 0 128 128"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="64" cy="64" r="64" fill="url(#user-avatar-grad)" />
      <defs>
        <linearGradient id="user-avatar-grad" x1="16" y1="16" x2="112" y2="112" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4338CA" />
          <stop offset="0.5" stopColor="#4F46E5" />
          <stop offset="1" stopColor="#6366F1" />
        </linearGradient>
        <linearGradient id="user-skin-grad" x1="44" y1="36" x2="84" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FED7AA" />
          <stop offset="1" stopColor="#FDBA74" />
        </linearGradient>
        <linearGradient id="user-hair-grad" x1="40" y1="20" x2="88" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E293B" />
          <stop offset="1" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id="user-shirt-grad" x1="24" y1="88" x2="104" y2="128" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0F172A" />
          <stop offset="1" stopColor="#1E1B4B" />
        </linearGradient>
      </defs>

      {/* Shoulders & Shirt */}
      <path
        d="M20 128C20 102 39.5 86 64 86C88.5 86 108 102 108 128H20Z"
        fill="url(#user-shirt-grad)"
      />
      {/* Modern Polo / Crew Collar */}
      <path
        d="M50 86C54 94 60 98 64 98C68 98 74 94 78 86"
        stroke="#94A3B8"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Placket */}
      <path d="M64 98V110" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
      <circle cx="64" cy="103" r="1.2" fill="#CBD5E1" />
      <circle cx="64" cy="107" r="1.2" fill="#CBD5E1" />

      {/* Neck */}
      <path d="M53 72H75V88H53V72Z" fill="#EA580C" fillOpacity="0.25" />
      <path d="M53 72H75V84H53V72Z" fill="url(#user-skin-grad)" />

      {/* Head / Face */}
      <ellipse cx="64" cy="54" rx="20.5" ry="24.5" fill="url(#user-skin-grad)" />

      {/* Ears */}
      <ellipse cx="42.5" cy="54" rx="3.5" ry="6" fill="#FDBA74" />
      <ellipse cx="85.5" cy="54" rx="3.5" ry="6" fill="#FDBA74" />

      {/* Hair (Sleek modern taper cut) */}
      <path
        d="M43.5 48C42 31 49 20 64 20C79 20 86 31 84.5 48C81.5 44 76 39 68 39C60 39 52 43 43.5 48Z"
        fill="url(#user-hair-grad)"
      />
      <path
        d="M42 36C45 27 53 21 64 21C75 21 83 27 86 36C84 30 78 24 64 24C50 24 44 30 42 36Z"
        fill="#334155"
        fillOpacity="0.6"
      />

      {/* Beard & Mustache detail (Subtle grooming) */}
      <path
        d="M50 59C50 69 56 75 64 75C72 75 78 69 78 59C78 65 72 72 64 72C56 72 50 65 50 59Z"
        fill="#0F172A"
        fillOpacity="0.18"
      />

      {/* Eyes */}
      <ellipse cx="55.5" cy="52" rx="2.5" ry="3" fill="#0F172A" />
      <ellipse cx="72.5" cy="52" rx="2.5" ry="3" fill="#0F172A" />
      <circle cx="56.5" cy="51" r="0.9" fill="#FFFFFF" />
      <circle cx="73.5" cy="51" r="0.9" fill="#FFFFFF" />

      {/* Eyebrows */}
      <path d="M51 45.5C53.5 44 58 44.5 60 45.5" stroke="#1E293B" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M68 45.5C70 44.5 74.5 44 77 45.5" stroke="#1E293B" strokeWidth="1.8" strokeLinecap="round" />

      {/* Nose */}
      <path d="M64 53V59L62 60" stroke="#EA580C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />

      {/* Friendly Smile */}
      <path
        d="M57 63.5C59 66.5 69 66.5 71 63.5"
        stroke="#9A3412"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * UserAvatar Component
 * Displays the user's custom uploaded photo if available, or the clean default SVG portrait
 */
export function UserAvatar({
  photo,
  name = 'User',
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  className = '',
  ring = true,
}) {
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20 sm:w-22 sm:h-22',
  };

  const ringClasses = ring
    ? 'ring-3 ring-indigo-500/20 dark:ring-indigo-400/30 border-2 border-white dark:border-slate-800'
    : '';

  const dimension = sizeClasses[size] || sizeClasses.md;

  return (
    <div
      className={`relative rounded-full overflow-hidden shrink-0 shadow-sm flex items-center justify-center bg-indigo-50 dark:bg-slate-800 ${dimension} ${ringClasses} ${className}`}
    >
      {photo ? (
        <img
          src={photo}
          alt={name || 'User Profile'}
          className="w-full h-full object-cover rounded-full"
        />
      ) : (
        <DefaultUserAvatarSvg className="w-full h-full object-cover" />
      )}
    </div>
  );
}
