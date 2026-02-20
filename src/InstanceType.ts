export {
	type LifetimeMode,
	INSTANCE_SINGLE,
	INSTANCE_PER_CONTAINER,
	INSTANCE_PER_DEPENDENCY
} from './LifetimeMode';

// Back-compat type name for older consumers.
export type InstanceType = import('./LifetimeMode').LifetimeMode;
