export type IconType =
  | 'deacon-out'
  | 'deacon-in'
  | 'censor-ready'
  | 'censor-hand'
  | 'water-boil'
  | 'water-take'
  | 'gospel-gates'
  | 'gospel-throne'
  | 'bread-bless'
  | 'bread-distribute';

export interface AnnotationPosition {
  // XPath to locate the element in the DOM
  xpath: string;
  // Character offset within the text node
  offset: number;
  // Text snippet for fallback matching
  textSnippet: string;
}

export interface Annotation {
  id: string;
  type: 'icon' | 'note';
  iconType?: IconType;
  noteText?: string;
  position: AnnotationPosition;
  serviceType: string; // e.g., "Matins", "Vespers"
  createdAt: number;
  updatedAt: number;
}

export interface IconDefinition {
  type: IconType;
  emoji: string;
  label: string;
  description: string;
}

export const ICON_DEFINITIONS: IconDefinition[] = [
  {
    type: 'deacon-out',
    emoji: '🚪➡️',
    label: 'Deacon Going Out',
    description: 'Mark when the deacon goes out the door',
  },
  {
    type: 'deacon-in',
    emoji: '➡️🚪',
    label: 'Deacon Coming In',
    description: 'Mark when the deacon comes back in',
  },
  {
    type: 'censor-ready',
    emoji: '🔥',
    label: 'Prepare Censor',
    description: 'Censor needs to be made ready',
  },
  {
    type: 'censor-hand',
    emoji: '🤲🔥',
    label: 'Hand Censor',
    description: 'Hand censor to deacon or priest',
  },
  {
    type: 'water-boil',
    emoji: '💧🔥',
    label: 'Boil Water',
    description: 'Water needs to be boiled',
  },
  {
    type: 'water-take',
    emoji: '💧➡️',
    label: 'Take Water',
    description: 'Take water to deacon at altar',
  },
  {
    type: 'gospel-gates',
    emoji: '📖🚪',
    label: 'Gospel Stand - Gates',
    description: 'Place gospel stand in front of gates',
  },
  {
    type: 'gospel-throne',
    emoji: '📖👑',
    label: 'Gospel Stand - Throne',
    description: 'Move gospel stand in front of throne',
  },
  {
    type: 'bread-bless',
    emoji: '🍞🙏',
    label: 'Bless Bread',
    description: 'Take blessed bread to altar',
  },
  {
    type: 'bread-distribute',
    emoji: '🍞👥',
    label: 'Distribute Bread',
    description: 'Put out blessed bread for parishioners',
  },
];

export const NOTE_EMOJI = '📝';
