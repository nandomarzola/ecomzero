"use client";
import { useState, useEffect } from "react";

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("cookieConsent")) setShow(true);
  }, []);

  const accept = () => {
    localStorage.setItem("cookieConsent", "true");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div style={{ position: "fixed", bottom: 0, width: "100%", background: "#222", color: "#fff", padding: "12px", zIndex: 10000 }}>
      Este site usa cookies para melhorar a experiência.{" "}
      <button onClick={accept} style={{ marginLeft: "12px", padding: "6px 12px" }}>Aceitar</button>
    </div>
  );
}
