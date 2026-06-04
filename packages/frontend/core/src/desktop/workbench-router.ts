import type { RouteObject } from 'react-router-dom';

export const workbenchRoutes = [
  {
    path: '/chat',
    lazy: () => import('./pages/workspace/chat/index'),
  },
  {
    path: '/all',
    lazy: () => import('./pages/workspace/all-page/all-page'),
  },
  {
    path: '/collection',
    lazy: () => import('./pages/workspace/all-collection'),
  },
  {
    path: '/collection/:collectionId',
    lazy: () => import('./pages/workspace/collection/index'),
  },
  {
    path: '/tag',
    lazy: () => import('./pages/workspace/all-tag'),
  },
  {
    path: '/tag/:tagId',
    lazy: () => import('./pages/workspace/tag'),
  },
  {
    path: '/trash',
    lazy: () => import('./pages/workspace/trash-page'),
  },
  {
    path: '/graph',
    lazy: () => import('./pages/workspace/link-graph/index'),
  },
  {
    path: '/:pageId',
    lazy: () => import('./pages/workspace/detail-page/detail-page'),
  },
  {
    path: '/:pageId/attachments/:attachmentId',
    lazy: () => import('./pages/workspace/attachment/index'),
  },
  {
    path: '/journals',
    lazy: () => import('./pages/workspace/journals'),
  },
  {
    path: '/study',
    lazy: () => import('./pages/workspace/study/index'),
  },
  {
    path: '/study/decks',
    lazy: () => import('./pages/workspace/study/decks'),
  },
  {
    path: '/study/cards',
    lazy: () => import('./pages/workspace/study/cards'),
  },
  {
    path: '/study/cards/:cardId',
    lazy: () => import('./pages/workspace/study/card-detail'),
  },
  {
    path: '/study/generate',
    lazy: () => import('./pages/workspace/study/generate'),
  },
  {
    path: '/study/review',
    lazy: () => import('./pages/workspace/study/review'),
  },
  {
    path: '/study/review/:deckId',
    lazy: () => import('./pages/workspace/study/review'),
  },
  {
    path: '/study/flashcards',
    lazy: () => import('./pages/workspace/study/flashcards'),
  },
  {
    path: '/study/learn',
    lazy: () => import('./pages/workspace/study/learn'),
  },
  {
    path: '/study/test',
    lazy: () => import('./pages/workspace/study/test'),
  },
  {
    path: '/study/graph',
    lazy: () => import('./pages/workspace/study/graph'),
  },
  {
    path: '/study/tutor',
    lazy: () => import('./pages/workspace/study/tutor'),
  },
  {
    path: '/study/dashboard',
    lazy: () => import('./pages/workspace/study/dashboard'),
  },
  {
    path: '/study/decks/:deckId',
    lazy: () => import('./pages/workspace/study/deck-detail'),
  },
  {
    path: '/settings',
    lazy: () => import('./pages/workspace/settings'),
  },
  {
    path: '*',
    lazy: () => import('./pages/404'),
  },
] satisfies RouteObject[];
