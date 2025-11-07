import { useEffect, useState } from "react";

interface CurrentPathInfo {
  path: string;
  planId?: number;
  date?: string;
}

export function useCurrentPath(): CurrentPathInfo {
  const [pathInfo, setPathInfo] = useState<CurrentPathInfo>({
    path: typeof window !== "undefined" ? window.location.pathname : "/dashboard",
  });

  useEffect(() => {
    const path = window.location.pathname;
    const planIdMatch = path.match(/\/plans\/(\d+)/);
    const dateMatch = path.match(/\/days\/(\d{4}-\d{2}-\d{2})/);

    setPathInfo({
      path,
      planId: planIdMatch ? Number(planIdMatch[1]) : undefined,
      date: dateMatch ? dateMatch[1] : undefined,
    });
  }, []);

  return pathInfo;
}
