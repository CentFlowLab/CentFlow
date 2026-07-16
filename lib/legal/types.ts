export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type LegalDocument = {
  title: string;
  version: string;
  lastUpdated: string;
  disclaimer: string;
  sections: LegalSection[];
};
