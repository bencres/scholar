import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

const modalBase = {
  padding: '20px 0',
  alignSelf: 'start' as const,
  marginTop: '120px',
  maxHeight: 'calc(100dvh - 240px)',
  overflow: 'auto' as const,
};

export const container = style({
  ...modalBase,
  maxWidth: 480,
  minWidth: 360,
});

export const containerWide = style({
  ...modalBase,
  maxWidth: 640,
  minWidth: 420,
});

export const titleContainer = style({
  display: 'flex',
  width: '100%',
  flexDirection: 'column',
});

export const titleStyle = style({
  fontSize: cssVar('fontH6'),
  fontWeight: '600',
});

export const viewport = style({
  maxHeight: 'calc(100vh - 220px)',
  padding: '0 24px',
});

export const scrollBar = style({
  width: 6,
  transform: 'translateX(-4px)',
});

export const formSection = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
});

export const cardTypeControl = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
  width: '100%',
});

export const countLabel = style({
  minWidth: 16,
  fontSize: 14,
  fontWeight: 600,
  textAlign: 'center',
  color: cssVarV2.text.primary,
  selectors: {
    '&[data-disabled="true"]': {
      opacity: 0.4,
    },
  },
});

export const countSuffix = style({
  fontSize: 14,
  color: cssVarV2.text.secondary,
  selectors: {
    '&[data-disabled="true"]': {
      opacity: 0.4,
    },
  },
});

export const modelSelect = style({
  width: '100%',
  maxWidth: 220,
  padding: '4px 8px',
  fontSize: 14,
  borderRadius: 6,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  background: cssVar('white'),
  color: cssVarV2.text.primary,
  cursor: 'pointer',
  selectors: {
    '&:focus': {
      outline: 'none',
      borderColor: cssVarV2.button.primary,
    },
  },
});

export const focusInput = style({
  width: '100%',
});

export const actions = style({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
  paddingTop: 16,
});

export const previewTitle = style({
  fontSize: cssVar('fontH6'),
  fontWeight: 600,
  paddingTop: 8,
});

export const previewList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  paddingTop: 12,
});

export const errorState = style({
  marginTop: 12,
  fontSize: 14,
  color: cssVarV2.status.error,
});

export const savedState = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  paddingTop: 8,
});

export const savedTitle = style({
  fontSize: 14,
  color: cssVarV2.text.secondary,
});

export const savedDeckLink = style({
  fontSize: cssVar('fontH6'),
  fontWeight: 600,
  color: cssVarV2.button.primary,
  textDecoration: 'none',
  selectors: {
    '&:hover': {
      textDecoration: 'underline',
    },
  },
});
