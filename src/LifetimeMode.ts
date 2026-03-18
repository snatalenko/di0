export type LifetimeMode = 'per-container' | 'per-dependency' | 'single';

export const INSTANCE_SINGLE: LifetimeMode = 'single';
export const INSTANCE_PER_DEPENDENCY: LifetimeMode = 'per-dependency';
export const INSTANCE_PER_CONTAINER: LifetimeMode = 'per-container';
