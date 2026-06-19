export interface LegalDocumentMeta {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  version: string;
  effectiveDate: string;
  intro?: string;
  footerLine?: string;
}

export interface LegalToc {
  label: string;
  items: string[];
}

export type LegalBlock =
  | { kind: 'p'; text: string }
  | { kind: 'h3'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'callout'; variant: 'warning' | 'info'; text: string }
  | { kind: 'table'; headers: string[]; rows: string[][] }
  | { kind: 'subscriptionPricingTable'; headers: string[]; targetType: 'USER' | 'RESTAURANT' }
  | { kind: 'card'; title: string; text: string }
  | { kind: 'cards'; items: Array<{ title: string; text: string }> }
  | { kind: 'keyValue'; items: Array<{ label: string; value: string }> }
  | { kind: 'hr' };

export interface LegalSection {
  title: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  meta: LegalDocumentMeta;
  toc?: LegalToc;
  sections: LegalSection[];
}

export function emptyLegalDocument(): LegalDocument {
  return {
    meta: {
      title: '',
      version: '1.0',
      effectiveDate: '',
    },
    sections: [],
  };
}

export function parseLegalDocument(raw: unknown): LegalDocument {
  if (!raw || typeof raw !== 'object') return emptyLegalDocument();
  const doc = raw as LegalDocument;
  return {
    meta: {
      eyebrow: doc.meta?.eyebrow ?? '',
      title: doc.meta?.title ?? '',
      subtitle: doc.meta?.subtitle ?? '',
      version: doc.meta?.version ?? '1.0',
      effectiveDate: doc.meta?.effectiveDate ?? '',
      intro: doc.meta?.intro ?? '',
      footerLine: doc.meta?.footerLine ?? '',
    },
    toc: doc.toc
      ? {
          label: doc.toc.label ?? '',
          items: Array.isArray(doc.toc.items) ? [...doc.toc.items] : [],
        }
      : undefined,
    sections: Array.isArray(doc.sections)
      ? doc.sections.map((section) => ({
          title: section.title ?? '',
          blocks: Array.isArray(section.blocks) ? structuredClone(section.blocks) : [],
        }))
      : [],
  };
}

export function cloneLegalDocument(doc: LegalDocument): LegalDocument {
  return structuredClone(doc);
}
