"use client";

import type { ComponentProps, ReactNode } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * The app-wide action buttons: create / edit / delete.
 *
 * Conventions:
 * - Create → a labelled button (`CreateButton`), at the start or end of a list.
 * - Per-row edit / delete → icon buttons (`EditAction`, `DeleteAction`) inside `RowActions`, always
 *   with a tooltip plus `sr-only` so they are discoverable by mouse and readable by screen readers.
 */

type ButtonVariant = ComponentProps<typeof Button>["variant"];

interface CreateButtonProps {
  /** Button text, e.g. "Thêm thành viên" */
  label: string;
  /** Icon before the text, a plus sign by default */
  icon?: ReactNode;
  /** Button variant, `default` by default (emphasises the primary action) */
  variant?: ButtonVariant;
  /** Extra classes */
  className?: string;
  /** Called on click */
  onClick: () => void;
}

/**
 * The create button: always labelled, since this is the primary action and should not have to be guessed from an icon.
 * @param label - Button text
 * @param icon - Icon before the text
 * @param variant - Button variant
 * @param className - Extra classes
 * @param onClick - Called on click
 * @returns The create button
 */
export function CreateButton({
  label,
  icon = <Plus className="size-4" />,
  variant = "default",
  className,
  onClick,
}: CreateButtonProps) {
  return (
    <Button variant={variant} className={className} onClick={onClick}>
      {icon}
      {label}
    </Button>
  );
}

interface RowActionsProps {
  /** The row's action buttons */
  children: ReactNode;
  /** Extra classes */
  className?: string;
}

/**
 * Group a row's action buttons so their spacing stays uniform.
 * @param children - The action buttons
 * @param className - Extra classes
 * @returns The action button group
 */
export function RowActions({ children, className }: RowActionsProps) {
  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      {children}
    </div>
  );
}

interface RowActionButtonProps {
  /** Label used for both the tooltip and screen readers */
  label: string;
  /** Button icon */
  icon: ReactNode;
  /** Button variant, `ghost` by default so it does not compete with the row content */
  variant?: ButtonVariant;
  /** Disable the button (e.g. past the editing deadline) */
  disabled?: boolean;
  /** Extra classes */
  className?: string;
  /** Called on click */
  onClick: () => void;
}

/**
 * An icon button with a tooltip, for a per-row action.
 * The basis of `EditAction`/`DeleteAction`; use it directly for other actions (cancel, confirm…) to
 * keep exactly one icon button style inside tables.
 * @param label - Label for the tooltip and screen readers
 * @param icon - Button icon
 * @param variant - Button variant
 * @param disabled - Disable the button
 * @param className - Extra classes
 * @param onClick - Called on click
 * @returns The icon button with its tooltip
 */
export function RowActionButton({
  label,
  icon,
  variant = "ghost",
  disabled,
  className,
  onClick,
}: RowActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={variant}
            size="icon-sm"
            disabled={disabled}
            className={className}
            onClick={onClick}
          />
        }
      >
        {icon}
        <span className="sr-only">{label}</span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

type ActionButtonProps = Omit<RowActionButtonProps, "icon" | "label"> & {
  /** Label override, for naming the subject (e.g. "Sửa Mèo Mập") */
  label?: string;
};

/**
 * A row's edit button.
 * @param label - Label override, "Sửa" by default
 * @param props - Remaining action button props
 * @returns The edit button
 */
export function EditAction({ label = "Sửa", ...props }: ActionButtonProps) {
  return (
    <RowActionButton
      label={label}
      icon={<Pencil className="size-4" />}
      {...props}
    />
  );
}

/**
 * A row's delete button, always destructive-coloured to mark it as a destructive action.
 * @param label - Label override, "Xoá" by default
 * @param className - Extra classes
 * @param props - Remaining action button props
 * @returns The delete button
 */
export function DeleteAction({
  label = "Xoá",
  className,
  ...props
}: ActionButtonProps) {
  return (
    <RowActionButton
      label={label}
      icon={<Trash2 className="size-4" />}
      className={cn("text-destructive", className)}
      {...props}
    />
  );
}
