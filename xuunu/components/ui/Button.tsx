import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export default function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const baseClass = variant === "secondary" ? "btn-secondary" : "btn-primary";
  return <button className={`${baseClass} ${className}`.trim()} {...props} />;
}
