// Member success posts, shown publicly.
//
// Why this exists: 350+ people are in the Discord and 0 are paying. The single
// most persuasive thing in the business is the channel where members post their
// own wins, and it was invisible to anyone who had not joined. This is that
// channel, on the front page, with the invite underneath.
//
// The posts are mostly photos — an order confirmation, a screenshot of a
// locked-in price, the item in hand. Those images are the evidence, so the card
// leads with the picture and treats the caption as supporting detail. A
// text-only version of this would reduce "here is my order" to the words "got
// it for $39.99", which is precisely the thin, unverifiable-looking social
// proof the rest of this site works to avoid.
//
// What is deliberately absent, and enforced by worker/success-posts.test.js:
// no earnings figure, no "verified member" badge, and CAVEAT — which is
// imported from the worker module rather than retyped — travels with the feed.
// The disclaimer living only here would mean a broken component silently strips
// the one sentence making these posts defensible.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaDiscord, FaArrowRight } from 'react-icons/fa6';
import { FaBolt } from 'react-icons/fa';
import { timeAgo } from '../lib/dealSource';
import { useReducedMotion, motionVariants, getMotionProps } from '../lib/motion';
import { DISCORD_INVITE } from '../lib/checkout';

// Mirrors worker/successPosts.js CAVEAT. A test asserts the worker copy still
// contains "not typical" and "not a promise"; keep the two in step.
const CAVEAT =
  'Results are not typical and are not a promise of any income. These are ' +
  'individual posts from members. Judge each find on its own merits.';

export default function MemberSuccess() {
  const prefersReduced = useReducedMotion();
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/success', { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(String(res.status));
        const json = await res.json();
        if (!alive) return;
        setData({ posts: json.posts ?? [], caveat: json.caveat ?? CAVEAT });
      } catch {
        if (alive) setData({ posts: [], caveat: CAVEAT });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const posts = data?.posts ?? [];
  // An empty feed is a normal state, not a failure: the channel may not be
  // configured yet, or genuinely quiet this week. Either way the section still
  // has a job to do — it tells a visitor the server has people in it.
  const showEmpty = Boolean(data) && posts.length === 0;

  return (
    <section
      className="band-full band-bleed tint-glow relative py-12 md:py-16"
      aria-labelledby="success-title"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/30 to-transparent"
        aria-hidden="true"
      />
      <div className="mx-auto w-full max-w-[1800px] px-4 py-8 sm:px-6 md:py-12 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand">
              From the server
            </p>
            <h2 id="success-title" className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              What members actually caught
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
              Posts from our Discord, shared with permission. Open the server to post
              yours — the trial is free and no card is involved.
            </p>
          </div>
          <a
            href={DISCORD_INVITE}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline inline-flex shrink-0 items-center gap-2 text-sm"
          >
            <FaDiscord className="text-sm" aria-hidden="true" />
            Join the server
          </a>
        </div>

        {posts.length > 0 ? (
          <motion.ul
            {...getMotionProps(prefersReduced, motionVariants.staggerContainer)}
            className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3"
          >
            {posts.map((post) => (
              <motion.li
                key={post.id}
                {...getMotionProps(prefersReduced, motionVariants.staggerItem)}
                className="group relative overflow-hidden rounded-xl border border-white/10 bg-charcoal/60 transition-colors hover:border-brand/30"
              >
                {post.image ? (
                  <img
                    src={post.image}
                    // The caption is the alt text, so a screen reader hears what
                    // the photo shows rather than "image". Decorative where the
                    // caption is absent, so it is not announced twice.
                    alt={post.text || ''}
                    aria-hidden={post.text ? undefined : true}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center bg-[radial-gradient(90%_140%_at_18%_0%,rgba(244,63,94,0.2),transparent_78%)]">
                    <FaBolt className="h-6 w-6 text-brand-2" aria-hidden="true" />
                  </div>
                )}

                <div className="space-y-1.5 p-3">
                  {post.text && (
                    <p className="line-clamp-2 text-xs leading-relaxed text-zinc-300">{post.text}</p>
                  )}
                  <p className="flex items-center justify-between gap-2 text-[11px] text-zinc-500">
                    {/* A plain username. Nothing in Discord establishes who a
                        person is, so no trust badge goes here — an earlier
                        version of this site applied one to arbitrary posts,
                        which is the kind of small unearned claim that adds up.
                        The rule is asserted in member-success-feed.test.js. */}
                    <span className="truncate font-medium text-zinc-400">{post.author}</span>
                    {post.postedAt && <time dateTime={post.postedAt}>{timeAgo(post.postedAt)}</time>}
                  </p>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        ) : (
          showEmpty && (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center">
              <FaDiscord className="mx-auto h-6 w-6 text-zinc-600" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-zinc-300">The feed is quiet right now</p>
              <p className="mx-auto mt-1.5 max-w-md text-sm text-zinc-500">
                Member posts show up here as they land. Join the server to see them live and
                add your own.
              </p>
              <a
                href={DISCORD_INVITE}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary mt-5 inline-flex items-center gap-2 text-sm"
              >
                Join the server
                <FaArrowRight className="text-xs" aria-hidden="true" />
              </a>
            </div>
          )
        )}

        {/*
          The caveat is the sentence that makes showing member posts
          defensible, so it sits directly under the feed rather than in the
          footer where nobody reads it. Rendered whenever the feed renders.
        */}
        <p className="mt-6 max-w-3xl text-xs leading-relaxed text-zinc-500">
          {data?.caveat ?? CAVEAT}
        </p>
      </div>
    </section>
  );
}
