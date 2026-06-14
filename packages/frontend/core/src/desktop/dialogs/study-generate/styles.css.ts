import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

export const container = style({
  maxWidth: 480,
  minWidth: 360,
  padding: '20px 0',
  alignSelf: 'start',
  marginTop: '120px',
  maxHeight: 'calc(100dvh - 240px)',
  overflow: 'auto',
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
});

export const countInput = style({
  width: 52,
  padding: '4px 8px',
  fontSize: 14,
  borderRadius: 6,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  background: cssVar('white'),
  color: cssVarV2.text.primary,
  textAlign: 'center',
  selectors: {
    '&:disabled': {
      opacity: 0.4,
      cursor: 'not-allowed',
    },
    '&:focus': {
      outline: 'none',
      borderColor: cssVarV2.button.primary,
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
  paddingTop: 16,
});
