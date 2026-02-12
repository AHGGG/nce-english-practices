import type * as React from "react";
import type { CSSProperties, ReactNode } from "react";

export interface BaseComponentProps {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export interface ClickableProps {
  onClick?: () => void;
  disabled?: boolean;
}

export interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

export interface CardProps extends BaseComponentProps {
  title?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  footer?: ReactNode;
}

export interface DialogProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  footer?: ReactNode;
  maxWidth?: string;
}

export interface ToastProps {
  message: string;
  type: "success" | "error" | "warning" | "info";
  duration?: number;
  onDismiss: () => void;
}

export type EventHandler<T = void> = (event: T) => void;
export type MouseEventHandler = EventHandler<React.MouseEvent<HTMLElement>>;
export type KeyboardEventHandler = EventHandler<
  React.KeyboardEvent<HTMLElement>
>;
export type FormSubmitHandler = EventHandler<React.FormEvent<HTMLFormElement>>;

export type ElementRef<T extends HTMLElement = HTMLDivElement> =
  React.RefObject<T>;
export type MutableRef<T> = React.MutableRefObject<T>;
