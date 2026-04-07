import type { EncounterStatus } from './types';

export const STATUS_META: Record<EncounterStatus, {
  label: string;
  color: string;
  bg: string;
  icon: string;
}> = {
  pending_confirmation: { label: 'Pending', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', icon: '◇' },
  scheduled:      { label: 'Scheduled',    color: '#6b7280', bg: 'rgba(107,114,128,0.12)', icon: '○' },
  ready:          { label: 'Ready',        color: '#d97706', bg: 'rgba(217,119,6,0.12)',   icon: '◉' },
  'in-visit':     { label: 'In Visit',     color: '#10b981', bg: 'rgba(16,185,129,0.15)',  icon: '●' },
  'note-pending': { label: 'Note Pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: '◎' },
  'note-ready':   { label: 'Note Ready',   color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  icon: '◆' },
  signed:         { label: 'Signed',       color: '#475569', bg: 'rgba(71,85,105,0.08)',   icon: '✓' },
};

export const PAYER_COLORS: Record<string, string> = {
  'HMHI-BHN':     '#f59e0b',
  'Optum PMHP':   '#3b82f6',
  'Optum':        '#3b82f6',
  'SelectHealth': '#10b981',
  'Molina':       '#ef4444',
  'DMBA':         '#8b5cf6',
  'Medicaid':     '#f59e0b',
  'Healthy U':    '#10b981',
};
