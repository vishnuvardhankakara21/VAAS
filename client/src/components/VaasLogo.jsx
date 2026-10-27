import vaasMark from "../assets/vaas-mark.png";
import vaasFull from "../assets/vaas-logo-full.png";

export default function VaasLogo({ size = 20, className = "", full = false, alt = "VAAS" }) {
  const src = full ? vaasFull : vaasMark;
  const widthVal = full
    ? (typeof size === "number" ? `${size * 2.2}px` : size)
    : (typeof size === "number" ? `${size}px` : size);
  const heightVal = typeof size === "number" ? `${size}px` : size;

  return (
    <img
      src={src}
      alt={alt}
      className={`vaas-logo-img ${className}`}
      style={{
        width: widthVal,
        height: heightVal,
        objectFit: "contain",
        display: "inline-block",
        verticalAlign: "middle",
        flexShrink: 0,
        userSelect: "none",
      }}
      draggable={false}
    />
  );
}
