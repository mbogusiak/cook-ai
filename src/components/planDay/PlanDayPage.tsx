import React from "react";
import { QueryProvider } from "@/components/QueryProvider";
import { PlanDayView } from "./PlanDayView";

interface PlanDayPageProps {
  planId: number;
  date: string;
  supabaseUrl: string;
  supabaseKey: string;
}

export const PlanDayPage: React.FC<PlanDayPageProps> = ({ planId, date, supabaseUrl, supabaseKey }) => {
  return (
    <QueryProvider>
      <PlanDayView planId={planId} date={date} supabaseUrl={supabaseUrl} supabaseKey={supabaseKey} />
    </QueryProvider>
  );
};
