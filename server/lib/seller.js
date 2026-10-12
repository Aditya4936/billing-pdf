import { User } from '../models/User.js';

/**
 * The seller details of a form draft (company, bank, terms, jurisdiction), whitelisted and
 * trimmed by the User schema. Nothing is saved: the unsaved document is only a validator.
 */
export function sellerDetailsOf(source) {
  const { company, bank, terms, jurisdiction } = new User({
    profile: {
      company: source?.company,
      bank: source?.bank,
      terms: Array.isArray(source?.terms) ? source.terms.filter((term) => typeof term === 'string') : [],
      jurisdiction: source?.jurisdiction,
    },
  }).profile.toObject();
  return { company, bank, terms, jurisdiction };
}
