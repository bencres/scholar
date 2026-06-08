import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

export const countControl = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
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
