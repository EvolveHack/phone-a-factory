"use client";

import Link from "next/link";
import type { FactoryRequest, StateSnapshot } from "@/contract/types";
import { PRODUCTS, type Product, type ProductCustomer } from "@/contract/products";
import { Shell } from "./shell";
import { customerColor, stationOf } from "./stations";
import { useFactory } from "./use-factory";

/** Every app the factory can change, each customer's own copy, and the changes that are live on it. */
export function AppsScreen({ initial }: { initial: StateSnapshot }) {
  const { state, error } = useFactory(initial);
  return (
    <Shell error={error}>
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-[36px] font-medium leading-none tracking-[-0.03em]">Apps on the line.</h1>
        <p className="mt-3 text-[15px] text-fg/55">
          Each customer has its own copy of the app. A change that goes live lands on the caller&apos;s copy only.
        </p>
      </div>
      <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-6 overflow-y-auto pr-1 xl:grid-cols-3">
        {Object.values(PRODUCTS).map((product) => (
          <AppCard key={product.id} product={product} requests={state.requests} />
        ))}
      </div>
    </Shell>
  );
}

function AppCard({ product, requests }: { product: Product; requests: FactoryRequest[] }) {
  return (
    <section className="rounded-2xl bg-panel-2 p-7 ring-1 ring-line" data-product={product.id}>
      <h2 className="font-[family-name:var(--font-display)] text-[22px] font-medium leading-none tracking-tight">{product.name}</h2>
      <p className="mt-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-fg/45">by {product.vendor}</p>
      <p className="mt-3 text-[14px] leading-relaxed text-fg/65">{product.what}</p>
      <div className="mt-6 space-y-5">
        {product.customers.map((customer) => (
          <CustomerBlock key={customer.id} product={product} customer={customer} requests={requests.filter((r) => r.customer === customer.id)} />
        ))}
      </div>
    </section>
  );
}

function CustomerBlock({ product, customer, requests }: { product: Product; customer: ProductCustomer; requests: FactoryRequest[] }) {
  const color = customerColor(customer.id);
  const live = requests.filter((r) => r.status === "live");
  const open = requests.filter((r) => {
    const station = stationOf(r);
    return station !== null && station !== "live";
  });
  return (
    <div className="border-t border-fg/10 pt-4">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-[13px] font-semibold uppercase tracking-[0.12em]" style={{ color }}>
          {customer.name}
        </p>
        <a
          href={`${product.prodUrl}${customer.path}`}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-lg bg-fg/10 px-3 py-1 text-[13px] font-semibold hover:bg-fg/15"
        >
          Open app
        </a>
      </div>
      {live.length === 0 && open.length === 0 ? <p className="mt-1.5 text-[14px] text-fg/30">No changes yet.</p> : null}
      <ul className="mt-2.5 space-y-1">
        {open.map((r) => (
          <AskLink key={r.id} request={r} mark={stationOf(r) === "gate" ? "Needs a person" : "In progress"} tone="text-gate" />
        ))}
        {live.map((r) => (
          <AskLink key={r.id} request={r} mark="Live" tone="text-live" />
        ))}
      </ul>
    </div>
  );
}

function AskLink({ request, mark, tone }: { request: FactoryRequest; mark: string; tone: string }) {
  return (
    <li>
      <Link href={`/asks/${request.id}`} className="flex items-baseline gap-3 rounded-lg px-2 py-1 text-[14px] hover:bg-fg/[0.06]">
        <span className={`w-24 shrink-0 text-[12px] font-semibold ${tone}`}>{mark}</span>
        <span className="line-clamp-2 text-fg/85">{request.classification?.askOneLine ?? request.ask}</span>
      </Link>
    </li>
  );
}
