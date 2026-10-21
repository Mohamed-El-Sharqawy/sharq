// @sharq/ui — the shared list-pagination footer (SPEC §11 list screens:
// total + prev/next; §2-style canonical Arabic from @sharq/locales).
import { NEXT_PAGE, PREVIOUS_PAGE, TOTAL_COUNT } from "@sharq/locales";
import { Button } from "./button";

export function ListPagination({
  total,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: {
  total: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-muted-foreground">
        {TOTAL_COUNT}: {total}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" disabled={!hasPrev} onClick={onPrev}>
          {PREVIOUS_PAGE}
        </Button>
        <Button variant="outline" disabled={!hasNext} onClick={onNext}>
          {NEXT_PAGE}
        </Button>
      </div>
    </div>
  );
}
