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
  width: 44,
  height: 44,
  position: 'relative',
  transform: 'translateY(0)',
  transition: 'transform 0.2s ease',

  selectors: {
    '&[data-hide="true"]': {
      transform: 'translateY(120px)',
      transitionDelay: '0.2s',
    },
  },
});

export const aiIslandBtn = style({
  width: 'inherit',
  height: 'inherit',
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
  position: 'absolute',
  right: 0,
  bottom: '100%',
  marginBottom: 8,
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
  opacity: 0,
  transform: 'translateY(8px)',
  pointerEvents: 'none',
  transition:
    'opacity 0.2s ease, transform 0.2s ease, pointer-events 0s linear 0.2s',

  selectors: {
    '&[data-visible="true"]': {
      opacity: 1,
      transform: 'translateY(0)',
      pointerEvents: 'auto',
      transition:
        'opacity 0.2s ease, transform 0.2s ease, pointer-events 0s linear 0s',
    },
    '&:hover': {
      background: cssVar('hoverColor'),
    },
  },
});
