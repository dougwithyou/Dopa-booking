import { Baby, Camera, Crown, Gem, GraduationCap, Heart, Users, type LucideIcon } from 'lucide-react';

export type TemplateOption = {
  value: string;
  label: string;
  icon: LucideIcon;
  // Two brand colors used to render the preview card's gradient swatch —
  // purely a visual cue for picking a session type, not a theme override.
  swatch: [string, string];
};

export const TEMPLATE_OPTIONS: TemplateOption[] = [
  { value: 'general', label: 'General', icon: Camera, swatch: ['#9c4a2c', '#b8873b'] },
  { value: 'couples', label: 'Couples', icon: Heart, swatch: ['#4a2226', '#9c4a2c'] },
  { value: 'family', label: 'Family', icon: Users, swatch: ['#5b6b4d', '#b8873b'] },
  { value: 'quinceanera', label: 'Quinceañera', icon: Crown, swatch: ['#b8873b', '#4a2226'] },
  { value: 'senior', label: 'Senior', icon: GraduationCap, swatch: ['#221c17', '#9c4a2c'] },
  { value: 'newborn', label: 'Newborn', icon: Baby, swatch: ['#e9e0d0', '#b8873b'] },
  { value: 'engagement', label: 'Engagement', icon: Gem, swatch: ['#4a2226', '#b8873b'] },
];
