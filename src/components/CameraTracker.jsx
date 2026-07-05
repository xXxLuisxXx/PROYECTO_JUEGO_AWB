export default function CameraTracker({ videoRef, active }) {
  return (
    <video
      ref={videoRef}
      className={`camera-feed ${active ? 'camera-feed-active' : ''}`}
      playsInline
      muted
      autoPlay
    />
  );
}
