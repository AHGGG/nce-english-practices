import React, { lazy } from 'react';

// Lazy load components to keep bundle size small
const FlashCardStack = lazy(() => import('./FlashCardStack'));
const VocabGrid = lazy(() => import('./VocabGrid'));
const StoryReader = lazy(() => import('../Learn/StoryReader')); 
const MarkdownMessage = lazy(() => import('./MarkdownMessage'));
const DiffCard = lazy(() => import('./DiffCard'));
const TenseTimeline = lazy(() => import('./TenseTimeline'));
const TaskDashboard = lazy(() => import('./TaskDashboard'));
const InteractiveDemo = lazy(() => import('./interactive/InteractiveDemo'));
const ContextCard = lazy(() => import('./ContextCard'));
const ContextList = lazy(() => import('./ContextList'));


const COMPONENT_MAP = {
  'FlashCardStack': FlashCardStack,
  'VocabGrid': VocabGrid,
  'StoryReader': StoryReader,
  'MarkdownMessage': MarkdownMessage,
  'DiffCard': DiffCard,
  'TenseTimeline': TenseTimeline,
  'TaskDashboard': TaskDashboard,
  'InteractiveDemo': InteractiveDemo,
  'ContextCard': ContextCard,
  'ContextList': ContextList,
};

export const getComponent = (key) => {
  return COMPONENT_MAP[key] || null;
};
