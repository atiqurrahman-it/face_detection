import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../api/client";

// Loads a backend image with fetch instead of a plain <img src>, so the
// ngrok-skip-browser-warning header is sent. Without it, ngrok's free plan
// answers <img> requests with an HTML warning page and the image breaks.
export default function ApiImage({ path, alt = "", ...rest }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;
    fetch(`${API_BASE_URL}${path}`, { headers: { "ngrok-skip-browser-warning": "true" } })
      .then((res) => (res.ok ? res.blob() : Promise.reject(res.status)))
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  return <img src={src || undefined} alt={alt} {...rest} />;
}
