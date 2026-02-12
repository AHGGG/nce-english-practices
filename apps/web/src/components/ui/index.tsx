/* eslint-disable react-refresh/only-export-components */
import { useId } from "react";
import type {
  ButtonHTMLAttributes,
  ComponentType,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import { Loader2 } from "lucide-react";
export { ToastProvider, useToast } from "./Toast";
export { Dialog, DialogButton } from "./Dialog";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "text";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
  icon?: ComponentType<{ className?: string }>;
  className?: string;
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ComponentType<{ className?: string }>;
  error?: string;
  className?: string;
}

interface CardProps {
  children: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  variant?: "default" | "elevated" | "outline" | "highlight";
  className?: string;
  actions?: ReactNode;
}

interface TagProps {
  children: ReactNode;
  variant?: "solid" | "outline";
  color?: "green" | "pink" | "cyan" | "amber" | "gray";
  className?: string;
}

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  options?: SelectOption[];
  className?: string;
  error?: string;
}

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "primary" | "success" | "warning" | "danger";
  className?: string;
}

export const Button = ({
  children,
  variant = "primary",
  size = "md",
  fullWidth,
  isLoading,
  icon: Icon,
  className = "",
  ...props
}: ButtonProps) => {
  const base =
    "inline-flex items-center justify-center gap-2 font-semibold tracking-wide transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base";

  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-accent-primary text-bg-base hover:bg-accent-primary/90 hover:shadow-accent shadow-soft",
    secondary:
      "bg-transparent text-accent-primary border border-accent-primary/30 hover:bg-accent-primary/10 hover:border-accent-primary/50",
    outline:
      "bg-transparent text-text-secondary border border-border hover:border-text-primary hover:text-text-primary",
    ghost:
      "bg-transparent text-text-secondary hover:text-text-primary hover:bg-white/5",
    danger:
      "bg-transparent text-accent-danger border border-accent-danger/30 hover:bg-accent-danger/10 hover:border-accent-danger/50",
    text: "bg-transparent text-accent-primary hover:text-white px-0 border-none",
  };

  const sizes: Record<ButtonSize, string> = {
    sm: "text-xs px-4 py-2",
    md: "text-sm px-6 py-2.5",
    lg: "text-base px-8 py-3",
    icon: "p-2.5 aspect-square",
  };

  const sizeClass = variant === "text" ? "" : sizes[size];

  return (
    <button
      className={`${base} ${variants[variant]} ${sizeClass} ${fullWidth ? "w-full" : ""} ${className}`}
      disabled={isLoading || props.disabled}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading && (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="sr-only">Loading...</span>
        </>
      )}
      {!isLoading && Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
};

export const Input = ({
  icon: Icon,
  error,
  className = "",
  ...props
}: InputProps) => {
  const errorId = useId();

  return (
    <div className={`relative group flex-grow ${className}`}>
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon className="w-4 h-4 text-text-muted group-focus-within:text-accent-primary transition-colors" />
        </div>
      )}
      <input
        type="text"
        className={`w-full bg-glass-bg backdrop-blur-xl border border-glass-border text-text-primary px-4 py-3 text-sm rounded-xl focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/30 transition-all placeholder:text-text-muted/50 ${Icon ? "pl-10" : ""} ${error ? "border-accent-danger/50 focus:border-accent-danger focus:ring-accent-danger/30" : ""}`}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      {error && (
        <span
          id={errorId}
          role="alert"
          className="absolute -bottom-5 left-0 text-[10px] text-accent-danger"
        >
          {error}
        </span>
      )}
    </div>
  );
};

export const Card = ({
  children,
  title,
  subtitle,
  variant = "default",
  className = "",
  actions,
}: CardProps) => {
  const variants: Record<NonNullable<CardProps["variant"]>, string> = {
    default:
      "bg-glass-bg backdrop-blur-xl border border-glass-border hover:border-accent-primary/30 rounded-2xl",
    elevated:
      "bg-glass-bg backdrop-blur-xl border border-glass-border shadow-card rounded-2xl",
    outline:
      "bg-transparent border border-glass-border border-dashed rounded-2xl",
    highlight:
      "bg-glass-bg backdrop-blur-xl border border-accent-primary/30 hover:border-accent-primary/50 shadow-accent rounded-2xl",
  };

  return (
    <div
      className={`p-6 transition-all duration-300 ${variants[variant]} ${className}`}
    >
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-xl font-semibold text-text-primary mb-1">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-text-secondary">{subtitle}</p>
          )}
        </div>
      )}
      <div className="text-text-secondary leading-relaxed">{children}</div>
      {actions && (
        <div className="mt-6 pt-4 border-t border-glass-border flex gap-3">
          {actions}
        </div>
      )}
    </div>
  );
};

export const Tag = ({
  children,
  variant = "solid",
  color = "green",
  className = "",
}: TagProps) => {
  const colors: Record<NonNullable<TagProps["color"]>, string> = {
    green: "bg-accent-primary/20 text-accent-primary border-accent-primary/30",
    pink: "bg-accent-danger/20 text-accent-danger border-accent-danger/30",
    cyan: "bg-accent-info/20 text-accent-info border-accent-info/30",
    amber: "bg-accent-warning/20 text-accent-warning border-accent-warning/30",
    gray: "bg-white/5 text-text-muted border-white/10",
  };

  const base =
    "inline-flex items-center px-2.5 py-1 text-[10px] font-semibold tracking-wide border rounded-full";
  const style =
    variant === "outline"
      ? colors[color].replace(/\/20/g, "/10").replace(/\/30/g, "/20")
      : colors[color];

  return <span className={`${base} ${style} ${className}`}>{children}</span>;
};

export const Select = ({
  label,
  options = [],
  className = "",
  error,
  ...props
}: SelectProps) => {
  const selectId = useId();
  const errorId = useId();
  const inputId = props.id || selectId;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs text-text-secondary uppercase tracking-wider"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={inputId}
          className={`w-full bg-glass-bg backdrop-blur-xl border border-glass-border text-text-primary px-4 py-2.5 text-sm rounded-xl focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/30 transition-all appearance-none cursor-pointer ${error ? "border-accent-danger/50 focus:border-accent-danger focus:ring-accent-danger/30" : ""}`}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-text-muted">
          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
            <path
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
              fillRule="evenodd"
            />
          </svg>
        </div>
      </div>
      {error && (
        <span
          id={errorId}
          role="alert"
          className="text-[10px] text-accent-danger"
        >
          {error}
        </span>
      )}
    </div>
  );
};

export const Badge = ({
  children,
  variant = "default",
  className = "",
}: BadgeProps) => {
  const variants: Record<NonNullable<BadgeProps["variant"]>, string> = {
    default: "bg-glass-bg border border-glass-border text-text-secondary",
    primary:
      "bg-accent-primary/10 border border-accent-primary/20 text-accent-primary",
    success:
      "bg-accent-success/10 border border-accent-success/20 text-accent-success",
    warning:
      "bg-accent-warning/10 border border-accent-warning/20 text-accent-warning",
    danger:
      "bg-accent-danger/10 border border-accent-danger/20 text-accent-danger",
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
