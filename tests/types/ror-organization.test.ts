import { describe, expect, it } from 'vitest';
import { isRorOrganization } from '../../src/types/ror-organization.js';

// Minimal valid RorOrganization fixture
const validOrganization = {
  admin: {
    created: { date: '2019-01-01', schema_version: '1.0' },
    last_modified: { date: '2024-06-01', schema_version: '2.1' },
  },
  id: 'https://ror.org/01q15rk86',
  locations: [
    {
      geonames_id: 1850147,
      geonames_details: { name: 'Tokyo' },
    },
  ],
  names: [{ value: 'Example University', types: ['label'] }],
  status: 'active',
  types: ['education'],
};

describe('isRorOrganization', () => {
  describe('valid input', () => {
    it('returns true for a valid RorOrganization', () => {
      expect(isRorOrganization(validOrganization)).toBe(true);
    });

    it('returns true when all optional properties are present', () => {
      const full = {
        ...validOrganization,
        domains: ['example.edu'],
        established: 1900,
        external_ids: [{ all: ['grid.12345.6'], type: 'grid', preferred: 'grid.12345.6' }],
        links: [{ value: 'https://example.edu', type: 'website' }],
        relationships: [{ type: 'parent', id: 'https://ror.org/abcdefg12', label: 'Parent Org' }],
      };
      expect(isRorOrganization(full)).toBe(true);
    });
  });

  describe('missing required properties', () => {
    it('returns false when admin is missing', () => {
      const { admin: _admin, ...rest } = validOrganization;
      expect(isRorOrganization(rest)).toBe(false);
    });

    it('returns false when id is missing', () => {
      const { id: _id, ...rest } = validOrganization;
      expect(isRorOrganization(rest)).toBe(false);
    });

    it('returns false when locations is missing', () => {
      const { locations: _locations, ...rest } = validOrganization;
      expect(isRorOrganization(rest)).toBe(false);
    });

    it('returns false when names is missing', () => {
      const { names: _names, ...rest } = validOrganization;
      expect(isRorOrganization(rest)).toBe(false);
    });

    it('returns false when status is missing', () => {
      const { status: _status, ...rest } = validOrganization;
      expect(isRorOrganization(rest)).toBe(false);
    });

    it('returns false when types is missing', () => {
      const { types: _types, ...rest } = validOrganization;
      expect(isRorOrganization(rest)).toBe(false);
    });
  });

  describe('invalid status values', () => {
    it('returns false when status is an unknown string', () => {
      expect(isRorOrganization({ ...validOrganization, status: 'unknown' })).toBe(false);
    });

    it('returns false when status is empty string', () => {
      expect(isRorOrganization({ ...validOrganization, status: '' })).toBe(false);
    });

    it('returns false when status is a number', () => {
      expect(isRorOrganization({ ...validOrganization, status: 1 })).toBe(false);
    });
  });

  describe('invalid types values', () => {
    it('returns false when types contains an unknown string', () => {
      expect(isRorOrganization({ ...validOrganization, types: ['invalid'] })).toBe(false);
    });

    it('returns false when types contains a mix of valid and invalid strings', () => {
      expect(isRorOrganization({ ...validOrganization, types: ['education', 'invalid'] })).toBe(false);
    });

    it('returns false when types is not an array', () => {
      expect(isRorOrganization({ ...validOrganization, types: 'education' })).toBe(false);
    });
  });

  describe('non-object inputs', () => {
    it('returns false for null', () => {
      expect(isRorOrganization(null)).toBe(false);
    });

    it('returns false for a string', () => {
      expect(isRorOrganization('hello')).toBe(false);
    });

    it('returns false for a number', () => {
      expect(isRorOrganization(42)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isRorOrganization(undefined)).toBe(false);
    });

    it('returns false for an empty object', () => {
      expect(isRorOrganization({})).toBe(false);
    });
  });
});
