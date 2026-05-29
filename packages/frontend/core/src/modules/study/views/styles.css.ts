import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

export const pageBody = style({
  width: '100%',
  height: '100%',
  borderTop: `0.5px solid ${cssVarV2.layer.insideBorder.border}`,
  overflow: 'auto',
});

export const content = style({
  maxWidth: 880,
  margin: '0 auto',
  padding: '32px 24px 48px',
});

export const sectionTitle = style({
  fontSize: 20,
  fontWeight: 600,
  marginBottom: 16,
  color: cssVarV2.text.primary,
});

export const deckList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
});

export const deckItem = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  borderRadius: 8,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  background: cssVarV2.layer.background.primary,
});

export const deckMeta = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
});

export const deckName = style({
  fontSize: 15,
  fontWeight: 600,
  color: cssVarV2.text.primary,
});

export const deckSub = style({
  fontSize: 12,
  color: cssVarV2.text.secondary,
});

export const emptyState = style({
  padding: 32,
  textAlign: 'center',
  color: cssVarV2.text.tertiary,
  border: `1px dashed ${cssVarV2.layer.insideBorder.border}`,
  borderRadius: 8,
});

export const cardSurface = style({
  minHeight: 280,
  padding: 24,
  borderRadius: 12,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  background: cssVarV2.layer.background.primary,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
});

export const cardLabel = style({
  fontSize: 12,
  fontWeight: 600,
  textTransform: 'uppercase',
  color: cssVarV2.text.secondary,
});

export const cardQuestion = style({
  fontSize: 18,
  lineHeight: '28px',
  color: cssVarV2.text.primary,
  whiteSpace: 'pre-wrap',
});

export const cardAnswer = style({
  fontSize: 15,
  lineHeight: '24px',
  color: cssVarV2.text.secondary,
  whiteSpace: 'pre-wrap',
});

export const actionsRow = style({
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  marginTop: 16,
});

export const previewGrid = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
});

export const previewItem = style({
  padding: 16,
  borderRadius: 8,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
});

export const previewHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
});

export const badge = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 18,
  height: 18,
  padding: '0 5px',
  marginLeft: 6,
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 600,
  background: cssVarV2.button.primary,
  color: cssVarV2.text.pureWhite,
});
