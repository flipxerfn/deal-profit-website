// Real, recent listings get the prime spot; an old example never masquerades as a new find.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowRight, FaBolt, FaExternalLinkAlt, FaRegClock } from 'react-icons/fa';
import { DEALS as FALLBACK } from '../data/deals';
import { hostOf, isSourceLink, timeAgo } from '../lib/dealSource';
import { isNonProductImage } from '../lib/imageQuality';
import { useReducedMotion } from '../lib/motion';

const ENDPOINT = '/api/deals';
const OTHER_FINDS = 2;

const listingUrl = (deal) => deal.url ?? deal.cta?.href;
const money = (amount) =>
  typeof amount === 'number'
    ? amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    : null;
const markdown = (deal) =>
  deal.referencePrice > deal.price && deal.referencePrice > 0
    ? Math.round((1 - deal.price / deal.referencePrice) * 100)
    : null;

export default function LiveHeroFeed() {
  const prefersReduced = useReducedMotion();
  const [deals, setDeals] = useState(null);
  const [live, setLive] = useState(false);
  const [imageUnavailable, setImageUnavailable] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const response = await fetch(ENDPOINT, { headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(String(response.status));
        const payload = await response.json();
        const verified = (Array.isArray(payload?.deals) ? payload.deals : [])
          .filter((deal) => isSourceLink(listingUrl(deal)) && (deal.title || '').trim());
        if (!alive) return;
        setDeals(verified.slice(0, 3));
        setLive(verified.length > 0);
      } catch {
        if (alive) {
          setDeals(null);
          setLive(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const fallback = FALLBACK.map((deal) => ({ ...deal, url: null, postedAt: null }));
  const current = live && deals?.length ? deals : null;
  const fallbackWithPhotos = fallback.filter((deal) => deal.image);
  // Prefer a genuinely photographic product listing over a Discord repost screenshot.
  const primary = current?.find((deal) => deal.image && !deal.image.includes('cdn.discordapp.com'))
    ?? current?.find((deal) => deal.image)
    ?? current?.[0]
    ?? fallbackWithPhotos[0]
    ?? fallback[0];
  const primaryImage = primary?.image && !imageUnavailable ? primary.image : null;
  const rest = (current ?? [])
    .filter((deal) => deal.id !== primary?.id)
    .slice(0, OTHER_FINDS);
  const url = listingUrl(primary);
  const retailer = primary.retailer ?? hostOf(url) ?? primary.categoryLabel;
  const percentOff = markdown(primary);
  const price = primary.displayPrice ?? money(primary.price);
  const age = primary.postedAt ? timeAgo(primary.postedAt) : null;

  return (
    <section className="hero-live-card" aria-label={live ? 'Latest community deals' : 'Deal example'}>
      <article>
        <div className={`hero-live-image${primaryImage ? '' : ' hero-live-image--compact'}`}>
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={primary.imageAlt || primary.title}
              fetchPriority="high"
              decoding="async"
              referrerPolicy="no-referrer"
              onLoad={(event) => {
                const image = event.currentTarget;
                if (isNonProductImage(image.naturalWidth, image.naturalHeight)) setImageUnavailable(true);
              }}
              onError={() => setImageUnavailable(true)}
            />
          ) : (
            <div className="hero-live-no-image" aria-hidden="true">
              <FaBolt />
            </div>
          )}
          <div className="hero-live-image-shade" aria-hidden="true" />
          <div className="hero-live-badges">
            <span className={live ? 'hero-live-status' : 'hero-example-status'}>
              <span className={live ? 'hero-live-dot' : 'hero-example-dot'} aria-hidden="true" />
              {live ? 'Live find' : 'Worked example'}
            </span>
            {primary.categoryLabel && <span className="hero-deal-category">{primary.categoryLabel}</span>}
          </div>
          {percentOff !== null && <span className="hero-deal-discount">−{percentOff}%</span>}
        </div>

        <div className="hero-live-details">
          <div className="hero-live-copy">
            <p className="hero-live-retailer">{retailer}</p>
            <h2 className="hero-live-title">{primary.title}</h2>
            <p className="hero-live-age">
              <FaRegClock aria-hidden="true" />
              {live && age ? (
                <><span>Caught </span><time dateTime={primary.postedAt}>{age}</time></>
              ) : (
                <span>Archived example · no current offer</span>
              )}
            </p>
          </div>
          <div className="hero-live-price-wrap">
            {primary.referencePrice > primary.price && (
              <span className="hero-live-was">Was {money(primary.referencePrice)}</span>
            )}
            {price && <span className="hero-live-price">{price}</span>}
          </div>
        </div>

        {live && primary.description && <p className="hero-live-description">{primary.description}</p>}

        <div className="hero-live-footer">
          {live && url ? (
            <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="hero-live-cta">
              Check live listing <FaExternalLinkAlt aria-hidden="true" />
            </a>
          ) : (
            <Link to="/deals" className="hero-live-cta">
              Browse today’s live feed <FaArrowRight aria-hidden="true" />
            </Link>
          )}
          <span className="hero-live-provenance">
            <span aria-hidden="true" className="hero-live-provenance-dot" />
            {live ? 'Posted by the community' : 'Live feed temporarily unavailable'}
          </span>
        </div>
      </article>

      {rest.length > 0 && (
        <div className="hero-live-secondary" aria-label="More recent finds">
          {rest.map((deal) => {
            const href = listingUrl(deal);
            const otherAge = deal.postedAt ? timeAgo(deal.postedAt) : null;
            return (
              <a
                key={deal.id}
                href={href}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="hero-live-secondary-row"
              >
                <span className="hero-live-secondary-mark" aria-hidden="true">
                  <FaBolt />
                </span>
                <span className="hero-live-secondary-copy">
                  <span className="hero-live-secondary-title">{deal.title}</span>
                  <span className="hero-live-secondary-meta">
                    {deal.retailer ?? deal.categoryLabel}
                    {otherAge ? ` · caught ${otherAge}` : ''}
                  </span>
                </span>
                <span className="hero-live-secondary-price">{deal.displayPrice ?? money(deal.price)}</span>
                <FaArrowRight className="hero-live-secondary-arrow" aria-hidden="true" />
              </a>
            );
          })}
          <Link to="/deals" className="hero-live-more">
            See every live find <FaArrowRight aria-hidden="true" />
          </Link>
        </div>
      )}

      {!live && (
        <div className="hero-live-offline" role="status">
          Showing an archived example while the live feed reconnects.{' '}
          <Link to="/deals">Check the feed</Link>
        </div>
      )}
    </section>
  );
}
