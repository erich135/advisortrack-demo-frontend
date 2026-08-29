import { isPublicDemo } from './publicDemo';

export const NORTHSTAR_DISPLAY_DOMAIN = 'northstaradvisory.dem';

const CLONE_LOCAL_SUFFIX = /\.[0-9a-f]{12}$/i;

export type DisplayEmailPerson = {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

export const slugPersonLocalPart = (firstName: string, lastName: string): string => {
  const slug = (value: string): string =>
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[''`´]/g, '')
      .replace(/\s+/g, '.')
      .replace(/[^a-z0-9.-]+/g, '.')
      .replace(/\.+/g, '.')
      .replace(/^\.+|\.+$/g, '');

  return [slug(firstName), slug(lastName)].filter(Boolean).join('.');
};

export const stripCloneEmailSuffix = (email: string): string => {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf('@');
  if (at < 0) return trimmed.replace(CLONE_LOCAL_SUFFIX, '');
  const local = trimmed.slice(0, at).replace(CLONE_LOCAL_SUFFIX, '');
  return local;
};

const localPartFor = (person: DisplayEmailPerson): string => {
  const fromName = slugPersonLocalPart(person.firstName ?? '', person.lastName ?? '');
  if (fromName) return fromName;
  return stripCloneEmailSuffix(person.email ?? '');
};

const duplicateIndex = (person: DisplayEmailPerson, peers: readonly DisplayEmailPerson[]): number => {
  const base = localPartFor(person);
  if (!base) return 0;
  const ordered = [...peers].sort((left, right) => (left.id ?? '').localeCompare(right.id ?? ''));
  const same = ordered.filter((peer) => localPartFor(peer) === base);
  if (same.length <= 1) return 0;
  const index = same.findIndex((peer) => Boolean(person.id) && peer.id === person.id);
  return index < 0 ? 0 : index;
};

/**
 * Always-clean Northstar display email. Used by tests and by the demo UI helper.
 * Does not change stored/clone-safe addresses.
 */
export const northstarDisplayEmail = (
  person: DisplayEmailPerson,
  peers: readonly DisplayEmailPerson[] = []
): string => {
  const base = localPartFor(person);
  if (!base) return '';
  const index = duplicateIndex(person, peers);
  const local = index === 0 ? base : `${base}${index + 1}`;
  return `${local}@${NORTHSTAR_DISPLAY_DOMAIN}`;
};

export const hasCloneEmailSuffix = (email: string | null | undefined): boolean =>
  Boolean(email && CLONE_LOCAL_SUFFIX.test(email.split('@')[0] ?? ''));

/** Demo UI only. Live/admin builds keep the stored email. */
export const memberDisplayEmail = (
  person: DisplayEmailPerson,
  peers: readonly DisplayEmailPerson[] = []
): string => {
  const stored = person.email?.trim() ?? '';
  if (!isPublicDemo) return stored;
  return northstarDisplayEmail(person, peers) || stored;
};

/**
 * When editing in demo, keep the clone-safe stored email unless the operator
 * typed a different address from the visible display value.
 */
export const emailForMemberUpdate = (
  member: DisplayEmailPerson,
  formEmail: string,
  peers: readonly DisplayEmailPerson[] = []
): string | undefined => {
  const trimmed = formEmail.trim();
  if (!trimmed) return undefined;
  if (!isPublicDemo) return trimmed;
  const visible = memberDisplayEmail(member, peers);
  if (trimmed.toLowerCase() === visible.toLowerCase()) return undefined;
  if (trimmed.toLowerCase() === (member.email ?? '').trim().toLowerCase()) return undefined;
  return trimmed;
};
