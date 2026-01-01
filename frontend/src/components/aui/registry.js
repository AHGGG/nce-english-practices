import React, { lazy } from 'react';

// Lazy load components to keep bundle size small
const FlashCardStack = lazy(() => import('./FlashCardStack'));
const VocabGrid = lazy(() => import('./VocabGrid'));
const MarkdownMessage = lazy(() => import('./MarkdownMessage'));
const DiffCard = lazy(() => import('./DiffCard'));
const TenseTimeline = lazy(() => import('./TenseTimeline'));
const TaskDashboard = lazy(() => import('./TaskDashboard'));
const InteractiveDemo = lazy(() => import('./interactive/InteractiveDemo'));
const ContextCard = lazy(() => import('./ContextCard'));
const ContextList = lazy(() => import('./ContextList'));
const DictionaryResults = lazy(() => import('./DictionaryResults'));


const COMPONENT_MAP = {
  'FlashCardStack': FlashCardStack,
  'VocabGrid': VocabGrid,
  'MarkdownMessage': MarkdownMessage,
  'DiffCard': DiffCard,
  'TenseTimeline': TenseTimeline,
  'TaskDashboard': TaskDashboard,
  'InteractiveDemo': InteractiveDemo,
  'ContextCard': ContextCard,
  'ContextList': ContextList,
  'DictionaryResults': DictionaryResults,
};

export const getComponent = (key) => {
  return COMPONENT_MAP[key] || null;
};

