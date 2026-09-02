"use client";

import { useState } from "react";
import Image from "next/image";
import { Store } from "lucide-react";
import { useCurrentUser } from "@/features/auth/hooks/use-auth";
import { getImageUrl } from "@/lib/images/image-url";
import { cn } from "@/lib/utils/cn";

export type RestaurantBrandingProps = {
  restaurant?: {
    name?: string | null;
    logo?: string | null;
  } | null;
  showLogo?: boolean;
  showName?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  logoClassName?: string;
  nameClassName?: string;
  fallbackName?: string;
};

export function RestaurantBranding({
  restaurant: propRestaurant,
  showLogo = true,
  showName = true,
  size = "md",
  className,
  logoClassName,
  nameClassName,
  fallbackName,
}: RestaurantBrandingProps) {
  const [imageError, setImageError] = useState(false);

  // Only call hook if propRestaurant is omitted
  const isPropProvided = propRestaurant !== undefined;
  const currentUserQuery = useCurrentUser({ enabled: !isPropProvided });
  const user = currentUserQuery.data?.data?.user;
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const restaurant = isPropProvided
    ? propRestaurant
    : user?.restaurant ||
      (user?.restaurantName || user?.restaurantLogo
        ? { name: user.restaurantName, logo: user.restaurantLogo }
        : null);

  const name =
    restaurant?.name ||
    fallbackName ||
    (isSuperAdmin ? "Royal POS" : "Restaurant POS");

  const rawLogo = restaurant?.logo;
  const logoUrl = rawLogo ? getImageUrl(rawLogo) : "";
  const isExternalUrl = /^https?:\/\//i.test(logoUrl);

  const sizeClasses = {
    sm: {
      container: "gap-2",
      logo: "h-7 w-7 text-xs rounded-md",
      icon: "h-3.5 w-3.5",
      name: "text-xs font-semibold",
    },
    md: {
      container: "gap-2.5",
      logo: "h-9 w-9 text-sm rounded-lg",
      icon: "h-4 w-4",
      name: "text-sm font-bold",
    },
    lg: {
      container: "gap-3",
      logo: "h-11 w-11 text-base rounded-xl",
      icon: "h-5 w-5",
      name: "text-base font-bold leading-tight",
    },
    xl: {
      container: "gap-4",
      logo: "h-16 w-16 text-xl rounded-2xl",
      icon: "h-8 w-8",
      name: "text-xl font-bold leading-tight",
    },
  }[size];

  return (
    <div className={cn("flex items-center min-w-0", sizeClasses.container, className)}>
      {showLogo && (
        <div
          className={cn(
            "relative flex shrink-0 items-center justify-center overflow-hidden border border-[var(--border-soft)] bg-[var(--surface-strong)] text-[var(--muted)] shadow-xs transition duration-200",
            sizeClasses.logo,
            logoClassName,
          )}
        >
          {logoUrl && !imageError ? (
            <Image
              src={logoUrl}
              alt={name}
              fill
              sizes="(max-width: 768px) 64px, 128px"
              className="object-cover"
              onError={() => setImageError(true)}
              unoptimized={isExternalUrl || logoUrl.startsWith("data:") || logoUrl.startsWith("blob:")}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-bold uppercase text-[var(--muted)]">
              {name && name.trim() ? (
                name.trim().charAt(0)
              ) : (
                <Store className={sizeClasses.icon} />
              )}
            </div>
          )}
        </div>
      )}
      {showName && (
        <div className="min-w-0 flex-1">
          <div className={cn("truncate text-[var(--text)]", sizeClasses.name, nameClassName)}>
            {name}
          </div>
        </div>
      )}
    </div>
  );
}
