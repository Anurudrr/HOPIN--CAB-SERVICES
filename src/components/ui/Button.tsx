import * as React from "react";
import { Link, type LinkProps } from "react-router-dom";

import { cn } from "../../lib/utils";

type ButtonVariant = "primary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonStyleProps {
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "border-2 border-black bg-black text-white shadow-soft hover:bg-white hover:text-black hover:shadow-premium hover:-translate-x-[2px] hover:-translate-y-[2px]",
  outline:
    "border-2 border-black bg-white text-black shadow-soft hover:bg-black hover:text-white hover:shadow-premium hover:-translate-x-[2px] hover:-translate-y-[2px]",
  ghost:
    "border-2 border-transparent bg-transparent text-black hover:border-black hover:bg-black hover:text-white",
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-4 py-2.5",
  md: "px-6 py-3",
  lg: "px-8 py-4 md:px-10",
};

export function buttonStyles({
  className,
  size = "md",
  variant = "primary",
}: ButtonStyleProps = {}) {
  return cn(
    "relative inline-flex items-center justify-center rounded-none font-black uppercase tracking-[0.22em] text-[11px] transition-[transform,box-shadow,background-color,color] duration-200 ease-out active:translate-x-0 active:translate-y-0 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonStyleProps {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, size = "md", type = "button", variant = "primary", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={buttonStyles({ className, size, variant })}
      {...props}
    />
  ),
);

Button.displayName = "Button";

type RouterButtonLinkProps = ButtonStyleProps &
  Omit<LinkProps, "className" | "to"> & {
    to: LinkProps["to"];
  };

type AnchorButtonLinkProps = ButtonStyleProps &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    to?: never;
  };

export type ButtonLinkProps = RouterButtonLinkProps | AnchorButtonLinkProps;

function isRouterButtonLinkProps(props: ButtonLinkProps): props is RouterButtonLinkProps {
  return "to" in props && props.to !== undefined;
}

export const ButtonLink = React.forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  ({ className, size = "md", variant = "primary", ...props }, ref) => {
    const sharedClassName = buttonStyles({ className, size, variant });

    if (isRouterButtonLinkProps(props)) {
      const { to, ...linkProps } = props;

      return <Link ref={ref} to={to} className={sharedClassName} {...linkProps} />;
    }

    const { href, ...anchorProps } = props as AnchorButtonLinkProps;

    return <a ref={ref} href={href} className={sharedClassName} {...anchorProps} />;
  },
);

ButtonLink.displayName = "ButtonLink";