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
  alignItems: 'flex-end',
});

export const aiIslandHoverZone = style({
  position: 'relative',
  width: 44,
  height: 44,
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

export const generateDeckBtnVisible = style({});

const generateDeckBtnVisibleStyles = {
  transform: 'scaleY(1)',
  opacity: 1,
  pointerEvents: 'auto',
  transition:
    'transform 0.2s ease, opacity 0.2s ease, pointer-events 0s linear 0s',
} as const;

export const generateDeckBtn = style({
  position: 'absolute',
  right: 0,
  bottom: 'calc(100% + 8px)',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 12px',
  borderRadius: 20,
  border: `0.5px solid ${cssVar('borderColor')}`,
  boxShadow: '0px 2px 8px rgba(0,0,0,0.08)',
  background: cssVar('backgroundOverlayPanelColor'),
  color: cssVarV2('text/primary'),
  fontSize: 13,
  fontWeight: 500,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  transformOrigin: 'bottom center',
  transform: 'scaleY(0)',
  opacity: 0,
  pointerEvents: 'none',
  transition:
    'transform 0.2s ease, opacity 0.2s ease, pointer-events 0s linear 0.2s',

  selectors: {
    [`&.${generateDeckBtnVisible}`]: generateDeckBtnVisibleStyles,
    [`${aiIslandHoverZone}:focus-within &`]: generateDeckBtnVisibleStyles,
    '&:hover': {
      background: cssVar('hoverColor'),
    },
  },
});
