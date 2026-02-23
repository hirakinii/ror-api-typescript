import { z } from 'zod';

// ROR record main interface (spec Section 3)
export interface RorOrganization {
  admin: {
    created: {
      date: string;
      schema_version: '1.0' | '2.0' | '2.1';
    };
    last_modified: {
      date: string;
      schema_version: '1.0' | '2.0' | '2.1';
    };
  };
  domains?: string[];
  established?: number | null;
  external_ids?: Array<{
    all: string[];
    type: 'fundref' | 'grid' | 'isni' | 'wikidata';
    preferred?: string | null;
  }>;
  id: string;
  links?: Array<{ value: string; type: 'website' | 'wikipedia' }>;
  locations: Array<{
    geonames_id: number;
    geonames_details: {
      name: string;
      lat?: number | null;
      lng?: number | null;
      continent_code?: 'AF' | 'AN' | 'AS' | 'EU' | 'NA' | 'OC' | 'SA' | null;
      continent_name?:
        | 'Africa'
        | 'Antarctica'
        | 'Asia'
        | 'Europe'
        | 'Oceania'
        | 'South America'
        | 'North America'
        | null;
      country_code?: string | null;
      country_name?: string | null;
      country_subdivision_code?: string | null;
      country_subdivision_name?: string | null;
    };
  }>;
  names: Array<{
    value: string;
    types: Array<'acronym' | 'alias' | 'label' | 'ror_display'>;
    lang?: string | null;
  }>;
  relationships?: Array<{
    type: 'related' | 'parent' | 'child' | 'successor' | 'predecessor';
    id: string;
    label: string;
  }>;
  status: 'active' | 'inactive' | 'withdrawn';
  types: Array<
    'education' | 'funder' | 'healthcare' | 'company' | 'archive' | 'nonprofit' | 'government' | 'facility' | 'other'
  >;
}

const schemaVersionSchema = z.enum(['1.0', '2.0', '2.1']);

export const rorOrganizationSchema = z.object({
  admin: z.object({
    created: z.object({
      date: z.string(),
      schema_version: schemaVersionSchema,
    }),
    last_modified: z.object({
      date: z.string(),
      schema_version: schemaVersionSchema,
    }),
  }),
  domains: z.array(z.string()).optional(),
  established: z.number().nullable().optional(),
  external_ids: z
    .array(
      z.object({
        all: z.array(z.string()),
        type: z.enum(['fundref', 'grid', 'isni', 'wikidata']),
        preferred: z.string().nullable().optional(),
      }),
    )
    .optional(),
  id: z.string(),
  links: z
    .array(
      z.object({
        value: z.string(),
        type: z.enum(['website', 'wikipedia']),
      }),
    )
    .optional(),
  locations: z.array(
    z.object({
      geonames_id: z.number(),
      geonames_details: z.object({
        name: z.string(),
        lat: z.number().nullable().optional(),
        lng: z.number().nullable().optional(),
        continent_code: z.enum(['AF', 'AN', 'AS', 'EU', 'NA', 'OC', 'SA']).nullable().optional(),
        continent_name: z
          .enum(['Africa', 'Antarctica', 'Asia', 'Europe', 'Oceania', 'South America', 'North America'])
          .nullable()
          .optional(),
        country_code: z.string().nullable().optional(),
        country_name: z.string().nullable().optional(),
        country_subdivision_code: z.string().nullable().optional(),
        country_subdivision_name: z.string().nullable().optional(),
      }),
    }),
  ),
  names: z.array(
    z.object({
      value: z.string(),
      types: z.array(z.enum(['acronym', 'alias', 'label', 'ror_display'])),
      lang: z.string().nullable().optional(),
    }),
  ),
  relationships: z
    .array(
      z.object({
        type: z.enum(['related', 'parent', 'child', 'successor', 'predecessor']),
        id: z.string(),
        label: z.string(),
      }),
    )
    .optional(),
  status: z.enum(['active', 'inactive', 'withdrawn']),
  types: z.array(
    z.enum(['education', 'funder', 'healthcare', 'company', 'archive', 'nonprofit', 'government', 'facility', 'other']),
  ),
});

/** Type guard for RorOrganization using zod schema validation at runtime. */
export function isRorOrganization(value: unknown): value is RorOrganization {
  return rorOrganizationSchema.safeParse(value).success;
}
