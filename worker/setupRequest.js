// Validation for the Deal Feed Setup intake form.
//
// WHY A WEBHOOK AND NOT STORAGE
// -----------------------------
// A buyer of the $55 setup hands over a Discord server invite and their
// username. That is their infrastructure, and it is not the site owner's to
// keep. The obvious build is "store it and show it in the dashboard", which
// would mean a list of every customer's server invite sitting in the admin
// UI and in the Durable Object — one admin page render away from being
// public, and one breach away from being someone else's problem.
//
// So this validates, posts to a Discord webhook, and returns. Nothing is
// persisted anywhere. The only copy that exists is the message in the
// owner's own #logs channel, which is exactly where a submitted order
// should land. There is no dashboard list to leak because there is no
// dashboard list.

const INVITE_MAX = 300;
const USERNAME_MAX = 80;
const NOTE_MAX = 500;

// Discord invites are discord.gg/xxx or discord.com/invite/xxx. The scheme is
// OPTIONAL, because people paste "discord.gg/dealprofit" constantly — Discord's
// own UI shows the bare form in places, and a scheme is exactly what gets
// stripped when copying a link out of a chat app into a form.
//
// The first version required "https://" and rejected every one of those with
// "That does not look like a Discord invite", which reads as the site being
// broken rather than the paste being incomplete.
//
// Requiring one of the two Discord host shapes is still what matters: it is
// what stops the field being used to paste an arbitrary URL into the owner's
// channel, which is the abuse case on a public form.
//
// Underscore is in the code character class because Discord invite codes
// contain them ("deal-profit_1"), and the first attempt left it out.
const INVITE_RE = /^(?:https?:\/\/)?(?:www\.)?(?:discord\.gg\/|discord\.com\/invite\/|discordapp\.com\/invite\/)[A-Za-z0-9_-]{2,64}\/?$/i;

const cleanStr = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// A Discord username is letters, digits, underscore or dot, 2-32 chars. New
// display names allow spaces, so this accepts a loose "display name" form too
// and only rejects things that are obviously not a name.
const USERNAME_RE = /^[A-Za-z0-9._ ]{2,32}$/;

export function validateSetupRequest(body) {
  const payload = body ?? {};

  // Honeypot. A real person never sees this field; a bot fills everything in.
  // Returning success rather than an error means a scripted submitter gets no
  // signal that it was detected.
  if (cleanStr(payload.website, 100)) {
    return { value: null, honeypot: true };
  }

  const invite = cleanStr(payload.invite, INVITE_MAX);
  const username = cleanStr(payload.username, USERNAME_MAX);
  const note = cleanStr(payload.note, NOTE_MAX);

  if (!invite) return { error: 'invite_required' };
  if (!INVITE_RE.test(invite)) return { error: 'invite_not_a_discord_link' };
  if (!username) return { error: 'username_required' };
  if (!USERNAME_RE.test(username)) return { error: 'username_invalid' };

  // Store a full https URL even when the scheme was omitted, so the copy that
  // lands in #logs is clickable rather than something the owner has to fix by
  // hand before using it.
  const normalised = /^https?:\/\//i.test(invite) ? invite : `https://${invite}`;

  return { value: { invite: normalised, username, note } };
}

// Builds the message that lands in #logs. Kept separate from the transport so
// the exact wording is testable — this text is what the owner acts on, and a
// silently empty field in it is a lost customer.
export function buildSetupMessage(v) {
  const lines = [
    '**New setup request**',
    `**Server:** ${v.invite}`,
    `**They are:** ${v.username}`,
  ];
  if (v.note) lines.push('', `> ${v.note}`);
  lines.push('', `Sent from goosiev.com/setup-request`);
  return lines.join('\n');
}