export type CampaignColorSlug =
  | 'crimson' | 'amber' | 'emerald' | 'sky' | 'violet'
  | 'rose' | 'lime' | 'orange' | 'indigo' | 'teal';

export type CampaignColor = {
  slug: CampaignColorSlug;
  label: string;
  hex: string;
  soft: string;
};

export const CAMPAIGN_COLORS: CampaignColor[] = [
  { slug: 'crimson', label: 'Crimson', hex: '#f43f5e', soft: 'rgba(244, 63, 94, 0.14)' },
  { slug: 'amber',   label: 'Amber',   hex: '#f59e0b', soft: 'rgba(245, 158, 11, 0.14)' },
  { slug: 'emerald', label: 'Emerald', hex: '#10b981', soft: 'rgba(16, 185, 129, 0.14)' },
  { slug: 'sky',     label: 'Sky',     hex: '#0ea5e9', soft: 'rgba(14, 165, 233, 0.14)' },
  { slug: 'violet',  label: 'Violet',  hex: '#8b5cf6', soft: 'rgba(139, 92, 246, 0.14)' },
  { slug: 'rose',    label: 'Rose',    hex: '#ec4899', soft: 'rgba(236, 72, 153, 0.14)' },
  { slug: 'lime',    label: 'Lime',    hex: '#84cc16', soft: 'rgba(132, 204, 22, 0.14)' },
  { slug: 'orange',  label: 'Orange',  hex: '#f97316', soft: 'rgba(249, 115, 22, 0.14)' },
  { slug: 'indigo',  label: 'Indigo',  hex: '#6366f1', soft: 'rgba(99, 102, 241, 0.14)' },
  { slug: 'teal',    label: 'Teal',    hex: '#14b8a6', soft: 'rgba(20, 184, 166, 0.14)' },
];

export function getCampaignColor(slug: string | null | undefined): CampaignColor {
  return CAMPAIGN_COLORS.find((c) => c.slug === slug) ?? CAMPAIGN_COLORS[1];
}

export function pickRandomColor(): CampaignColorSlug {
  return CAMPAIGN_COLORS[Math.floor(Math.random() * CAMPAIGN_COLORS.length)].slug;
}
