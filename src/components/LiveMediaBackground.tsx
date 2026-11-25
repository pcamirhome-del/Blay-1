import React from 'react';

interface LiveMediaBackgroundProps {
  mediaUrl: string;
  mediaType: 'none' | 'image' | 'video';
  overlayOpacity: number;
}

/**
 * Shared Live Media Background Renderer:
 * Renders a fixed full-screen layer behind the app using <video autoPlay loop muted playsInline>
 * for MP4/WebM clips and <img> for photos/animated GIFs, topped with a synchronized dimming overlay.
 */
export const LiveMediaBackground: React.FC<LiveMediaBackgroundProps> = ({
  mediaUrl,
  mediaType,
  overlayOpacity,
}) => {
  const clampedOpacity = Math.min(90, Math.max(20, overlayOpacity || 65)) / 100;
  const hasValidMedia =
    Boolean(mediaUrl) &&
    !mediaUrl.startsWith('CHUNKED_MEDIA:') &&
    mediaType !== 'none';

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {hasValidMedia && mediaType === 'video' ? (
        <video
          key={mediaUrl}
          src={mediaUrl}
          autoPlay
          loop
          muted
          playsInline
          className="object-cover w-full h-full"
        />
      ) : hasValidMedia && mediaType === 'image' ? (
        <img
          key={mediaUrl}
          src={mediaUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="object-cover w-full h-full"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-[#090d16] via-[#131129] to-[#0f172a]" />
      )}

      {/* Synchronized Adjustable Dimming Overlay (20% to 90%) */}
      <div
        className="absolute inset-0 transition-colors duration-300"
        style={{
          backgroundColor: `rgba(9, 13, 22, ${hasValidMedia ? clampedOpacity : 0.45})`,
        }}
      />
    </div>
  );
};
