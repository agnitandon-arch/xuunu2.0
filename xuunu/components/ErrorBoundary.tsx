import type { ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

export default function ErrorBoundary({
  children,
  fallback = null,
}: ErrorBoundaryProps) {
  return <>{children ?? fallback}</>;
}
