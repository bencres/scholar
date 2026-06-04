import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

export const pageBody = style({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  width: '100%',
  minHeight: 0,
});

export const toolbar = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 12,
  padding: '12px 24px',
  borderBottom: `1px solid ${cssVarV2.layer.insideBorder.border}`,
});

export const toolbarGroup = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
});

export const stats = style({
  fontSize: 13,
  lineHeight: '20px',
  color: cssVarV2.text.secondary,
  marginLeft: 'auto',
});

export const warning = style({
  fontSize: 13,
  lineHeight: '20px',
  color: cssVarV2.status.warning,
});

export const graphContainer = style({
  flex: 1,
  minHeight: 0,
  position: 'relative',
  background: cssVarV2.layer.background.primary,
});

export const emptyState = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  fontSize: 14,
  color: cssVarV2.text.secondary,
});

export const searchInput = style({
  minWidth: 160,
  maxWidth: 240,
  height: 32,
  padding: '0 10px',
  fontSize: 13,
  borderRadius: 8,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  background: cssVarV2.input.background,
  color: cssVarV2.text.primary,
});
