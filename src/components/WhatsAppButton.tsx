"use client";

import { FaWhatsapp } from "react-icons/fa";

export default function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/5521988359825"
      target="_blank"
      rel="noreferrer"
      aria-label="WhatsApp"
      style={{
        position: "fixed",
        right: 24,
        bottom: 24,
        width: 68,
        height: 68,
        borderRadius: "50%",
        background: "#25D366",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        textDecoration: "none",
        zIndex: 9999,
        boxShadow: "0 10px 30px rgba(37,211,102,.45)",
        transition: ".2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      <FaWhatsapp size={38} />
    </a>
  );
}
