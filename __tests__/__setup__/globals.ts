// React Native injects `__DEV__` as a global; in Node (jest test env) it
// would be undefined and our config.ts would treat that as a production
// build, throwing on missing env. Default to true so tests behave like a
// dev bundle unless a specific test toggles it.
(global as any).__DEV__ = true;
