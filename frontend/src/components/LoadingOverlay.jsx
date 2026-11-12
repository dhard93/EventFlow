import "../LoadingOverlay.css";

export default function LoadingOverlay({
  isLoading,
  message = "Loading..."
}) {
  if (!isLoading) return null;

  return (
    <div className="loading-overlay">
      <div className="loading-card">
        <div className="loading-spinner"></div>
        <p>{message}</p>
      </div>
    </div>
  );
}