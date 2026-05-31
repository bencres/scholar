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

export const hero = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: '20px 24px',
  marginBottom: 24,
  borderRadius: 12,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  background: cssVarV2.layer.background.secondary,
});

export const heroTitle = style({
  fontSize: 22,
  fontWeight: 600,
  color: cssVarV2.text.primary,
});

export const heroSub = style({
  fontSize: 14,
  lineHeight: '22px',
  color: cssVarV2.text.secondary,
});

export const deckList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
});

export const deckListItem = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  padding: '14px 16px',
  borderRadius: 10,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  background: cssVarV2.layer.background.primary,
  cursor: 'pointer',
  transition: 'background 0.15s ease, border-color 0.15s ease',
  selectors: {
    '&:hover': {
      background: cssVarV2.layer.background.hoverOverlay,
      borderColor: cssVarV2.layer.insideBorder.primaryBorder,
    },
    '&:focus-visible': {
      outline: `2px solid ${cssVarV2.layer.insideBorder.primaryBorder}`,
      outlineOffset: 2,
    },
  },
});

export const deckListItemMain = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  minWidth: 0,
  flex: 1,
});

export const deckListItemActions = style({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexShrink: 0,
});

export const deckDuePill = style({
  fontSize: 12,
  fontWeight: 600,
  lineHeight: '20px',
  padding: '2px 8px',
  borderRadius: 999,
  color: cssVarV2.text.pureWhite,
  background: cssVarV2.button.primary,
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

export const debugResponse = style({
  marginTop: 16,
  maxHeight: 320,
  overflow: 'auto',
  padding: 12,
  textAlign: 'left',
  fontSize: 12,
  lineHeight: '18px',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  color: cssVarV2.text.secondary,
  background: cssVarV2.layer.background.secondary,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
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

export const deckPageHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 24px 0',
  gap: 16,
  flexWrap: 'wrap',
});

export const breadcrumb = style({
  fontSize: 14,
  lineHeight: '22px',
  color: cssVarV2.text.secondary,
  display: 'flex',
  alignItems: 'center',
  minWidth: 0,
});

export const breadcrumbItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  minWidth: 0,
  selectors: {
    '&[data-active="true"]': {
      color: cssVarV2.text.primary,
      fontWeight: 500,
    },
  },
});

export const breadcrumbLink = style({
  color: 'inherit',
  textDecoration: 'none',
  selectors: {
    '&:hover': {
      color: cssVarV2.text.primary,
    },
  },
});

export const breadcrumbIcon = style({
  fontSize: 18,
  color: cssVarV2.icon.primary,
  flexShrink: 0,
});

export const breadcrumbSeparator = style({
  marginLeft: 4,
  marginRight: 8,
  flexShrink: 0,
});

export const headerActions = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexShrink: 0,
});

export const deckStats = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  marginBottom: 20,
});

export const deckStatPill = style({
  fontSize: 13,
  lineHeight: '20px',
  padding: '4px 10px',
  borderRadius: 999,
  color: cssVarV2.text.secondary,
  background: cssVarV2.layer.background.secondary,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
});

export const deckStatLink = style({
  fontSize: 13,
  lineHeight: '20px',
  padding: '4px 10px',
  borderRadius: 999,
  color: cssVarV2.text.secondary,
  background: cssVarV2.layer.background.secondary,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  cursor: 'pointer',
  selectors: {
    '&:hover': {
      color: cssVarV2.text.primary,
      borderColor: cssVarV2.layer.insideBorder.primaryBorder,
    },
  },
});

export const browseCardList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
});

export const browseCard = style({
  borderRadius: 10,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  background: cssVarV2.layer.background.primary,
  overflow: 'hidden',
});

export const browseCardHeader = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: 12,
  width: '100%',
  padding: '14px 16px',
  border: 'none',
  background: 'transparent',
  textAlign: 'left',
  cursor: 'pointer',
  color: 'inherit',
  selectors: {
    '&:hover:not(:disabled)': {
      background: cssVarV2.layer.background.hoverOverlay,
    },
  },
});

export const browseCardHeaderStatic = style({
  cursor: 'default',
});

export const browseCardIndex = style({
  flexShrink: 0,
  width: 28,
  height: 28,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 600,
  color: cssVarV2.text.secondary,
  background: cssVarV2.layer.background.secondary,
});

export const browseCardHeaderMain = style({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
});

export const browseCardMeta = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
});

export const cardTypeBadge = style({
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
  padding: '2px 8px',
  borderRadius: 6,
  color: cssVarV2.text.secondary,
  background: cssVarV2.layer.background.secondary,
});

export const browseCardHeaderExtra = style({
  flexShrink: 0,
});

export const browseCardChevron = style({
  flexShrink: 0,
  fontSize: 20,
  color: cssVarV2.icon.secondary,
  transition: 'transform 0.15s ease',
  marginTop: 4,
});

export const browseCardChevronExpanded = style({
  transform: 'rotate(180deg)',
});

export const browseCardBody = style({
  padding: '0 16px 16px 56px',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
});

export const browseCardSection = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
});

export const browseCardFooter = style({
  paddingTop: 4,
});

export const browseList = style({
  margin: 0,
  paddingLeft: 20,
  fontSize: 14,
  lineHeight: '22px',
  color: cssVarV2.text.secondary,
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
