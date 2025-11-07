import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  hasActivePlan: boolean;
}

export default function BottomCTA({ hasActivePlan }: Props): JSX.Element {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background/90 backdrop-blur p-4">
      {hasActivePlan ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button className="w-full" disabled>
              Generuj plan
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={4}>
            użytkownik może mieć tylko jeden aktywny plan
          </TooltipContent>
        </Tooltip>
      ) : (
        <Button asChild className="w-full">
          <a href="/onboarding">Generuj plan</a>
        </Button>
      )}
    </div>
  );
}
