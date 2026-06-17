import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

export const toolStyle = style({
  selectors: {
    '&.hide': {
      pointerEvents: 'none',
    },
  },
});

export const aiIslandWrapper = style({
  position: 'relative',
  overflow: 'visible',
  transform: 'translateY(0)',
  transition: 'transform 0.2s ease',

  selectors: {
    '&[data-hide="true"]': {
      transform: 'translateY(120px)',
      transitionDelay: '0.2s',
    },
  },
});

export const aiIslandStack = style({
  display: 'flex',
  flexDirection: 'column-reverse',
  alignItems: 'flex-end',
});

export const aiIslandHoverZone = style({
  display: 'flex',
  flexDirection: 'column-reverse',
  alignItems: 'flex-end',
  gap: 8,
  width: 'fit-content',
});

export const aiIslandBtn = style({
  width: 44,
  height: 44,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  color: cssVar('iconColor'),
  border: `0.5px solid ${cssVar('borderColor')}`,
  boxShadow: '0px 2px 2px rgba(0,0,0,0.05)',
  background: cssVar('backgroundOverlayPanelColor'),
  position: 'relative',
  cursor: 'pointer',

  selectors: {
    '&:hover::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      borderRadius: '50%',
      background: cssVar('hoverColor'),
    },
  },
});

export const generateDeckBtn = style({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  borderRadius: 20,
  border: `0.5px solid ${cssVar('borderColor')}`,
  boxShadow: '0px 2px 8px rgba(0,0,0,0.08)',
  background: cssVar('backgroundOverlayPanelColor'),
  color: cssVarV2('text/primary'),
  fontSize: 13,
  fontWeight: 500,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  overflow: 'hidden',
  maxHeight: 0,
  maxWidth: 0,
  padding: 0,
  opacity: 0,
  transform: 'translateY(6px)',
  pointerEvents: 'none',
  transition:
    'max-height 0.2s ease, max-width 0.2s ease, opacity 0.2s ease, transform 0.2s ease, padding 0.2s ease, pointer-events 0s linear 0.2s',

  selectors: {
    [`${aiIslandHoverZone}:hover &`]: {
      maxWidth: 300,
      maxHeight: 40,
      padding: '8px 12px',
      opacity: 1,
      transform: 'translateY(0)',
      pointerEvents: 'auto',
      transition:
        'max-height 0.2s ease, opacity 0.2s ease, transform 0.2s ease, padding 0.2s ease, pointer-events 0s linear 0s',
    },
    [`${aiIslandHoverZone}:focus-within &`]: {
      maxWidth: 300,
      maxHeight: 40,
      padding: '8px 12px',
      opacity: 1,
      transform: 'translateY(0)',
      pointerEvents: 'auto',
      transition:
        'max-height 0.2s ease, opacity 0.2s ease, transform 0.2s ease, padding 0.2s ease, pointer-events 0s linear 0s',
    },
    '&:hover': {
      background: cssVar('hoverColor'),
    },
  },
});
