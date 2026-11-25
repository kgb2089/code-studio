import { ALGORITHM_TOPICS } from './algorithms';
import { DATA_STRUCTURE_TOPICS } from './dataStructures';
import type { LearningTopic } from '../types/learning';

export { DATA_STRUCTURE_TOPICS } from './dataStructures';
export { ALGORITHM_TOPICS } from './algorithms';
export { generateLearningSteps } from './generators';

export const ALL_LEARNING_TOPICS: LearningTopic[] = [
  ...DATA_STRUCTURE_TOPICS,
  ...ALGORITHM_TOPICS,
];

export function getLearningTopicById(id: string): LearningTopic | undefined {
  return ALL_LEARNING_TOPICS.find((t) => t.id === id);
}
