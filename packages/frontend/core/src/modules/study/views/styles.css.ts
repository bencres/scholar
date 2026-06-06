import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

export const body = style({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  width: '100%',
  minHeight: 0,
  containerName: 'study-body',
  containerType: 'size',
});

export const scrollArea = style({
  height: 0,
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  paddingTop: '12px',
});

export const scrollContent = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  padding: '0 24px 32px',
  '@container': {
    'study-body (width <= 500px)': {
      padding: '0 20px 32px',
    },
    'study-body (width <= 393px)': {
      padding: '0 16px 32px',
    },
  },
});

export const toolbarArea = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  padding: '12px 24px 0',
  '@container': {
    'study-body (width <= 500px)': {
      padding: '12px 20px 0',
    },
    'study-body (width <= 393px)': {
      padding: '12px 16px 0',
    },
  },
});

export const headerTitle = style({
  fontSize: 18,
  lineHeight: '26px',
  fontWeight: 600,
  paddingLeft: 8,
  color: cssVarV2.text.primary,
});

export const headerMeta = style({
  fontSize: 14,
  lineHeight: '22px',
  color: cssVarV2.text.secondary,
});

export const sectionTitle = style({
  fontSize: 18,
  lineHeight: '26px',
  fontWeight: 600,
  marginBottom: 12,
  color: cssVarV2.text.primary,
});

export const heroSub = style({
  fontSize: 14,
  lineHeight: '22px',
  color: cssVarV2.text.secondary,
});

export const modeGrid = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  marginTop: 6,
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
});

export const formCard = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  padding: 16,
  borderRadius: 10,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  background: cssVarV2.layer.background.primary,
});

export const formTitle = style({
  fontSize: 14,
  fontWeight: 600,
  color: cssVarV2.text.primary,
});

export const formGrid = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
});

export const toggleRow = style({
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
});

export const inlineActions = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
});

export const modeOptionRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginTop: 12,
  color: cssVarV2.text.secondary,
});

export const modeSummary = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  color: cssVarV2.text.secondary,
  fontSize: 14,
});

export const conceptGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 10,
  marginTop: 12,
});

export const conceptCard = style({
  padding: 12,
  borderRadius: 10,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  background: cssVarV2.layer.background.secondary,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
});

export const conceptTitle = style({
  fontSize: 13,
  fontWeight: 600,
  color: cssVarV2.text.primary,
});

export const conceptMeta = style({
  fontSize: 12,
  lineHeight: '18px',
  color: cssVarV2.text.secondary,
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

export const browseCardEditing = style({
  borderColor: cssVarV2.layer.insideBorder.primaryBorder,
  boxShadow: `0 0 0 1px ${cssVarV2.layer.insideBorder.primaryBorder}`,
});

export const browseCardEditHeader = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: 12,
  padding: '14px 16px 0',
});

export const browseCardEditHeaderMain = style({
  flex: 1,
  minWidth: 0,
});

export const browseCardEditBody = style({
  padding: '12px 16px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
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

export const subnav = style({
  display: 'flex',
  gap: 8,
  padding: '0 24px 8px',
  borderBottom: `1px solid ${cssVarV2.layer.insideBorder.border}`,
});

export const subnavTab = style({
  fontSize: 14,
  lineHeight: '22px',
  fontWeight: 500,
  padding: '8px 12px',
  borderRadius: 8,
  color: cssVarV2.text.secondary,
  textDecoration: 'none',
  selectors: {
    '&[data-active="true"]': {
      color: cssVarV2.text.primary,
      background: cssVarV2.layer.background.hoverOverlay,
    },
  },
});

export const libraryToolbar = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  alignItems: 'center',
});

export const searchHelp = style({
  fontSize: 13,
  lineHeight: '20px',
  color: cssVarV2.text.secondary,
});

export const searchHelpSummary = style({
  cursor: 'pointer',
  fontWeight: 500,
  color: cssVarV2.text.primary,
  selectors: {
    '&::marker': {
      color: cssVarV2.text.secondary,
    },
  },
});

export const searchHelpIntro = style({
  margin: '8px 0 6px',
});

export const searchHelpList = style({
  margin: 0,
  paddingLeft: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
});

export const searchHelpCode = style({
  fontSize: 12,
  fontFamily: 'var(--affine-font-family-mono, ui-monospace, monospace)',
  color: cssVarV2.text.primary,
});

export const searchHelpExample = style({
  margin: '8px 0 0',
  fontStyle: 'italic',
});

export const deckBadgeRow = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  marginTop: 6,
});

export const deckBadge = style({
  fontSize: 12,
  lineHeight: '18px',
  padding: '2px 8px',
  borderRadius: 999,
  background: cssVarV2.layer.background.secondary,
  color: cssVarV2.text.secondary,
  textDecoration: 'none',
  border: 'none',
  cursor: 'pointer',
});

export const pickerList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  maxHeight: 320,
  overflowY: 'auto',
});

export const pickerItem = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
  padding: '8px 0',
  borderBottom: `1px solid ${cssVarV2.layer.insideBorder.border}`,
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

export const todaySummaryRow = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(180px, 1fr) minmax(220px, 1.4fr)',
  gap: 16,
  '@container': {
    'study-body (width <= 720px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const streakCard = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 4,
  padding: '20px 16px',
  borderRadius: 10,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  background: cssVarV2.layer.background.primary,
  minHeight: '100%',
});

export const librarySummaryCard = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  padding: '16px',
  borderRadius: 10,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  background: cssVarV2.layer.background.primary,
});

export const libraryStatGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 8,
});

export const libraryStat = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  fontSize: 13,
  color: cssVarV2.text.secondary,
});

export const libraryStatValue = style({
  fontSize: 20,
  lineHeight: '28px',
  fontWeight: 700,
  color: cssVarV2.text.primary,
});

export const conceptChipRow = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
});

export const conceptChip = style({
  fontSize: 12,
  lineHeight: '18px',
  padding: '4px 8px',
  borderRadius: 999,
  background: cssVarV2.layer.background.hoverOverlay,
  color: cssVarV2.text.secondary,
});

export const workloadTimeline = style({
  display: 'flex',
  gap: 10,
  overflowX: 'auto',
  paddingBottom: 4,
});

export const workloadDay = style({
  flex: '1 0 120px',
  minWidth: 120,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: '12px 10px',
  borderRadius: 10,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  background: cssVarV2.layer.background.secondary,
  position: 'relative',
});

export const workloadDayToday = style({
  borderColor: cssVarV2.button.primary,
  boxShadow: `0 0 0 1px ${cssVarV2.button.primary}`,
});

export const workloadDayConnector = style({
  position: 'absolute',
  top: 18,
  right: -10,
  width: 10,
  height: 2,
  background: cssVarV2.layer.insideBorder.border,
});

export const workloadDueBar = style({
  height: 6,
  borderRadius: 999,
  background: cssVarV2.layer.insideBorder.border,
  overflow: 'hidden',
});

export const workloadDueFill = style({
  height: '100%',
  borderRadius: 999,
  background: cssVarV2.button.primary,
});

export const studyModeGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 12,
});

export const studyModeCard = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: '14px 16px',
  borderRadius: 10,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  background: cssVarV2.layer.background.secondary,
  textAlign: 'left',
  cursor: 'pointer',
  transition: 'border-color 0.15s ease, background 0.15s ease',
  selectors: {
    '&:hover': {
      borderColor: cssVarV2.button.primary,
      background: cssVarV2.layer.background.hoverOverlay,
    },
  },
});

export const studyModeTitle = style({
  fontSize: 14,
  fontWeight: 600,
  color: cssVarV2.text.primary,
});

export const studyModeDescription = style({
  fontSize: 13,
  lineHeight: '20px',
  color: cssVarV2.text.secondary,
});

export const selectedDocList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
});

export const selectedDocItem = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '10px 12px',
  borderRadius: 8,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  background: cssVarV2.layer.background.secondary,
});

export const streakValue = style({
  fontSize: 36,
  lineHeight: '40px',
  fontWeight: 700,
  color: cssVarV2.text.primary,
});

export const streakMeta = style({
  color: cssVarV2.text.secondary,
  fontSize: 14,
  lineHeight: '22px',
});

export const streakLongest = style({
  marginTop: 4,
  color: cssVarV2.text.tertiary,
  fontSize: 13,
  lineHeight: '20px',
});

export const streakActions = style({
  marginTop: 12,
});

export const activityChartsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 16,
  marginTop: 4,
});

export const activityChartBlock = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  minWidth: 0,
});

export const activityChartTitle = style({
  fontSize: 13,
  fontWeight: 600,
  color: cssVarV2.text.primary,
});

export const activityChartContainer = style({
  width: '100%',
  height: 200,
});

export const activityChartAxis = style({
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 12,
  color: cssVarV2.text.secondary,
});
