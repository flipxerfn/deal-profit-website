// What the feed actually catches, with the numbers attached.
//
// The gap this fills
// ------------------
// A competitor's storefront is a wall of receipts — every product he lists is a
// concrete catch with real figures, so his credibility IS his catalogue. This
// site had 200 real deals and surfaced none of them as evidence; the storefront
// described the service rather than demonstrating it.
//
// A visitor deciding whether $25 is worth it cannot tell what they are buying
// from a description. They can tell at a glance from six real catches with a
// price, the retail price, and a link that still works.
//
// What this deliberately does not do
// ----------------------------------
// It claims nothing about anybody's earnings. "Profit per order" appears in the
// source Discord bots' own post titles — that language is never promoted here,
// because income claims are on Whop's scam list and will cost the account. The
// proof offered is the discount, which is measurable and asserts nothing about
// what anyone earned.
//
// Every figure is computed from the live feed at render time. A hardcoded
// "67% median" would stop being true the moment the feed changed and become a
// claim instead of a measurement.
import { useEffect, useState } from 'react';
import { FaBolt, FaArrowUpRightFromSquare } from 'react-icons/fa6';
import { isSourceLink } from '../lib/dealSource';
import { measurableCatches, discountStats, topCatches } from '../lib/proof';

const ENDPOINT = '/api/deals';
const SHOW = 6;

export default function ProofCatches() {
  const [state, setState] = useState({ ready: false, catches: [], stats: null });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(ENDPOINT, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        const list = Array.isArray(data?.deals) ? data.deals : [];
        if (!alive) return;

        // Only catches the reader can actually open count as evidence. This
        // site claims 99% of posts link to a live listing; showing an unlinkable
        // one here would quietly contradict that.
        const usable = list.filter((d) => isSourceLink(d?.url ?? d?.cta?.href));
        const catches = topCatches(measurableCatches(usable), SHOW);
        setState({ ready: true, catches, stats: discountStats(usable) });
      } catch {
        if (alive) setState({ ready: true, catches: [], stats: null });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // A band that says "we caught nothing" is worse than no band at all, so an
  // empty or unmeasured feed renders nothing rather than an empty shell.
  if (!state.ready || !state.catches.length || !state.stats) return null;

  const { median, atLeast50, total } = state.stats;
  const round = (n) => Math.round(n);

  return (
    <section className="surface-raised rounded-2xl border border-white/10 bg-charcoal p-5 sm:p-7" aria-labelledby="proof-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-2">
            <FaBolt className="h-3 w-3" aria-hidden="true" />
            From the live feed
          </p>
          <h2 id="proof-title" className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            What a catch actually looks like
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Real listings from the feed, with the price they were caught at and the
            retail price they replaced. Every one links to the listing.
          </p>
        </div>

        {/* The sample size is shown next to the median on purpose. "67% median"
            means nothing without knowing it is out of 115 listings rather than 3. */}
        <dl className="flex gap-5 sm:gap-7">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wider text-muted">Median catch</dt>
            <dd className="mt-0.5 text-2xl font-extrabold tabular-nums text-brand sm:text-3xl">
              {round(median)}%
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wider text-muted">Half off or more</dt>
            <dd className="mt-0.5 text-2xl font-extrabold tabular-nums text-white sm:text-3xl">
              {atLeast50}
              <span className="text-base font-semibold text-muted">/{total}</span>
            </dd>
          </div>
        </dl>
      </div>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {state.catches.map((d) => (
          <li key={d.id}>
            <a
              href={d.url ?? d.cta?.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-full flex-col rounded-xl border border-white/5 bg-charcoal-2 p-4 transition-colors hover:border-brand/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <p className="line-clamp-2 text-sm font-semibold leading-snug text-white group-hover:text-brand-2">
                {d.title}
              </p>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-xl font-extrabold tabular-nums text-brand">
                  ${d.price.toFixed(2)}
                </span>
                <span className="text-xs text-muted-2 line-through tabular-nums">
                  ${d.referencePrice.toFixed(2)}
                </span>
                <span className="ml-auto rounded-md bg-brand/15 px-1.5 py-0.5 text-xs font-extrabold tabular-nums text-brand-2">
                  {round(d.discountPct)}% off
                </span>
              </div>

              <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted transition-colors group-hover:text-brand-2">
                Check the listing
                <FaArrowUpRightFromSquare className="h-2.5 w-2.5" aria-hidden="true" />
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}