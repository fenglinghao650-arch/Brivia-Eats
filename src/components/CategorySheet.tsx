"use client";

type CategorySheetProps = {
  categories: string[];
  selected: string | null; // null = "All"
  onSelect: (category: string | null) => void;
  onClose: () => void;
};

export default function CategorySheet({
  categories,
  selected,
  onSelect,
  onClose,
}: CategorySheetProps) {
  return (
    <>
      {/* Backdrop — covers explore area, closes sheet on tap */}
      <div
        className="absolute inset-0 z-20 bg-black/20"
        onClick={onClose}
      />

      {/* Sheet panel — slides up from bottom of explore area */}
      <div className="absolute bottom-0 left-0 right-0 z-30 rounded-t-2xl bg-white pt-3 pb-8 [animation:var(--animate-sheet-up)]">
        {/* Drag handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-200" />

        <h3 className="mb-1 px-5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 sm:text-xs">
          Category
        </h3>

        {/* List rows */}
        <div>
          {[null, ...categories].map((cat, idx) => {
            const isSelected = cat === selected;
            const label = cat ?? "All";
            const isLast = idx === categories.length;
            return (
              <button
                key={label}
                onClick={() => {
                  onSelect(cat);
                  onClose();
                }}
                className={`flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-zinc-50 ${
                  !isLast ? "border-b border-zinc-100" : ""
                }`}
              >
                <span
                  className={`text-sm font-medium ${
                    isSelected ? "text-zinc-900" : "text-zinc-500"
                  }`}
                >
                  {label}
                </span>
                {isSelected && (
                  <svg
                    className="h-4 w-4 shrink-0 text-zinc-900"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
