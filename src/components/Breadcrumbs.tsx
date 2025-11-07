import React from "react";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbsProps {
  path: string;
  planId?: number;
  date?: string;
}

export function Breadcrumbs({ path, planId, date }: BreadcrumbsProps): JSX.Element | null {
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("pl-PL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Generate breadcrumb items based on path
  const getBreadcrumbItems = () => {
    const items: { label: string; href: string }[] = [{ label: "Wszystkie plany", href: "/dashboard" }];

    if (path.includes("/plans/")) {
      if (planId) {
        items.push({
          label: `Plan #${planId}`,
          href: `/plans/${planId}`,
        });
      }

      if (path.includes("/days/") && date) {
        items.push({
          label: formatDate(date),
          href: `#`, // Current page, not clickable
        });
      }
    }

    return items;
  };

  const items = getBreadcrumbItems();

  // Show home icon with text on dashboard
  if (path === "/dashboard") {
    return (
      <div className="flex items-center justify-center gap-2">
        <Home className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Wszystkie plany</span>
      </div>
    );
  }

  return (
    <nav className="flex items-center gap-1 text-sm" aria-label="Nawigacja">
      <a
        href="/dashboard"
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Strona główna"
      >
        <Home className="h-4 w-4" />
      </a>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          {index === items.length - 1 ? (
            <span className="text-foreground font-medium">{item.label}</span>
          ) : (
            <a href={item.href} className="text-muted-foreground hover:text-foreground transition-colors">
              {item.label}
            </a>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
