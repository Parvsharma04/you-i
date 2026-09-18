const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// pnpm workspace: watch the whole monorepo so Metro picks up changes in
// sibling packages (e.g. packages/shared) that are symlinked into
// node_modules rather than copied.
config.watchFolders = [workspaceRoot];

// Resolve modules from this app's node_modules first, then fall back to
// the hoisted workspace root node_modules.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Hierarchical lookup would otherwise let Metro walk up past the paths
// above looking for modules; disabling it forces every resolution through
// nodeModulesPaths. This requires the workspace's pnpm-workspace.yaml to
// use `nodeLinker: hoisted` — pnpm's default isolated linker nests
// transitive deps in ways this can't see, causing "Unable to resolve
// module" errors for packages like react-native-reanimated's own deps.
config.resolver.disableHierarchicalLookup = true;

// pnpm links workspace packages (e.g. @youandi/shared) into node_modules
// via symlinks; Metro must follow them instead of treating them as
// opaque files outside the project.
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
