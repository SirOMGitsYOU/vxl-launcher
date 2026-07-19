import { Icon } from "@iconify/react";

interface ErrorMessageProps {
  message: string;
  className?: string;
}

export function ErrorMessage({ message, className = "" }: ErrorMessageProps) {
  return (
    <div
      className={`rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 text-sm p-3 ${className}`}
    >
      <Icon icon="pixel:warning" className="inline-block mr-2 w-4 h-4" />
      {message}
    </div>
  );
}
