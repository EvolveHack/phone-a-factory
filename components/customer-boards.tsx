import { CUSTOMER_IDS, CUSTOMERS, type CustomerId } from "@/contract/view";
import { boardSrc, safeBoardBase } from "./floor-copy";

export function CustomerBoards({
  boardUrl,
  flash,
  reload,
}: {
  boardUrl: string;
  flash: Partial<Record<CustomerId, boolean>>;
  reload: Record<CustomerId, number>;
}) {
  const base = safeBoardBase(boardUrl);
  return (
    <section className="grid h-full min-h-0 grid-cols-2 gap-3 p-3 pb-1" data-floor-region="boards">
      {CUSTOMER_IDS.map((id) => (
        <BoardFrame key={id} id={id} base={base} flash={Boolean(flash[id])} reload={reload[id] ?? 0} />
      ))}
    </section>
  );
}

function BoardFrame({
  id,
  base,
  flash,
  reload,
}: {
  id: CustomerId;
  base: string | null;
  flash: boolean;
  reload: number;
}) {
  const name = CUSTOMERS[id].name;
  return (
    <div
      data-customer={id}
      data-flash={flash ? "on" : "off"}
      className={`relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl border-8 bg-black ${flash ? "border-emerald-400" : "border-white/15"}`}
    >
      {flash ? <div className="pointer-events-none absolute inset-0 z-10 animate-pulse border-8 border-emerald-400" /> : null}
      <div className="min-h-0 flex-1 overflow-hidden">
        {base ? (
          <iframe
            key={`${id}-${reload}`}
            title={name}
            src={boardSrc(base, CUSTOMERS[id].path, reload)}
            className="origin-top-left border-0 bg-black"
            style={{ width: "160%", height: "160%", transform: "scale(0.625)" }}
          />
        ) : (
          <div className="grid h-full place-items-center px-6 text-center text-[28px] leading-snug">
            The live board will show here.
          </div>
        )}
      </div>
    </div>
  );
}
