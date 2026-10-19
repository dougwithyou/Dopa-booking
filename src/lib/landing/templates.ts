import { Baby, Camera, Crown, Gem, GraduationCap, Heart, TreePine, Users, type LucideIcon } from 'lucide-react';
import type { LandingPageTheme } from '@/types/db';
import { getThemePreset } from './theme';

// Bilingual starter copy dropped into a new draft so a seasonal template
// reads as finished before the admin edits it. Same `**word**` duo
// convention as every other admin-edited heading.
export type TemplateStarterCopy = {
  eyebrow_en: string;
  eyebrow_es: string;
  headline_en: string;
  headline_es: string;
  subheadline_en: string;
  subheadline_es: string;
  gallery_heading_en: string;
  gallery_heading_es: string;
  closer_heading_en: string;
  closer_heading_es: string;
  closer_body_en: string;
  closer_body_es: string;
};

export type TemplateOption = {
  value: string;
  label: string;
  icon: LucideIcon;
  // Two brand colors used to render the preview card's gradient swatch —
  // purely a visual cue for picking a session type.
  swatch: [string, string];
  // Optional palette applied to the landing page when this template is
  // picked; templates without one keep the brand defaults.
  theme?: LandingPageTheme;
  // Optional decorative layer the public landing page renders on top.
  decoration?: 'snow';
  starterCopy?: TemplateStarterCopy;
};

export const TEMPLATE_OPTIONS: TemplateOption[] = [
  { value: 'general', label: 'General', icon: Camera, swatch: ['#9c4a2c', '#b8873b'] },
  { value: 'couples', label: 'Couples', icon: Heart, swatch: ['#4a2226', '#9c4a2c'] },
  { value: 'family', label: 'Family', icon: Users, swatch: ['#5b6b4d', '#b8873b'] },
  { value: 'quinceanera', label: 'Quinceañera', icon: Crown, swatch: ['#b8873b', '#4a2226'] },
  { value: 'senior', label: 'Senior', icon: GraduationCap, swatch: ['#221c17', '#9c4a2c'] },
  { value: 'newborn', label: 'Newborn', icon: Baby, swatch: ['#e9e0d0', '#b8873b'] },
  { value: 'engagement', label: 'Engagement', icon: Gem, swatch: ['#4a2226', '#b8873b'] },
  {
    value: 'christmas',
    label: 'Christmas',
    icon: TreePine,
    swatch: ['#1f4d3a', '#a3212b'],
    theme: getThemePreset('Christmas Eve')?.colors,
    decoration: 'snow',
    starterCopy: {
      eyebrow_en: 'Christmas Sessions',
      eyebrow_es: 'Sesiones de Navidad',
      headline_en: 'This year, keep the **magic**.',
      headline_es: 'Este año, guarda la **magia**.',
      subheadline_en:
        'Cozy holiday portraits for families, couples and little ones — styled sets, warm lights and photos ready for your Christmas cards.',
      subheadline_es:
        'Retratos navideños para familias, parejas y peques — sets decorados, luces cálidas y fotos listas para tus tarjetas de Navidad.',
      gallery_heading_en: 'Moments by the **tree**',
      gallery_heading_es: 'Momentos junto al **árbol**',
      closer_heading_en: 'Spots fill up before **December**',
      closer_heading_es: 'Los cupos se agotan antes de **diciembre**',
      closer_body_en: 'Holiday dates are limited. Pick your time and secure it with your deposit.',
      closer_body_es: 'Las fechas navideñas son limitadas. Elige tu horario y apártalo con tu depósito.',
    },
  },
];

export function getTemplate(value: string | null | undefined): TemplateOption | undefined {
  return TEMPLATE_OPTIONS.find((opt) => opt.value === value);
}
