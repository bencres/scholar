import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

export const root = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: '10px var(--h-padding, 16px)',
  borderBottom: `0.5px solid ${cssVarV2('layer/insideBorder/border')}`,
  background: 'var(--affine-background-primary-color)',
});

export const header = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
});

export const title = style({
  fontSize: 13,
  fontWeight: 600,
  color: cssVarV2('text/primary'),
});

export const row = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
});

export const rowLabel = style({
  fontSize: 12,
  color: cssVarV2('text/secondary'),
  flexShrink: 0,
});

export const rowControl = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flex: 1,
  justifyContent: 'flex-end',
  minWidth: 0,
});

export const countLabel = style({
  minWidth: 16,
  fontSize: 13,
  fontWeight: 600,
  textAlign: 'center',
  color: cssVarV2('text/primary'),
  selectors: {
    '&[data-disabled="true"]': {
      opacity: 0.4,
    },
  },
});

export const countSuffix = style({
  fontSize: 12,
  color: cssVarV2('text/secondary'),
  selectors: {
    '&[data-disabled="true"]': {
      opacity: 0.4,
    },
  },
});
