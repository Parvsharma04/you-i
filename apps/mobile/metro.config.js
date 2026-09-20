const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// pnpm workspace: Metro must watch sibling workspace packages (e.g.
// @youandi/shared) so edits there trigger a reload. We add only the
// packages the app depends on instead of the whole workspace root —
// watching node_modules across the monorepo makes the file map huge and
// can exhaust worker memory/timeouts during initial bundling.
config.watchFolders = Array.from(
  new Set([
    ...(config.watchFolders ?? []),
    path.resolve(workspaceRoot, 'packages/shared'),
  ]),
);

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

// Must wrap last: withNativeWind reads `input` to compile global.css into
// the atomic style registry NativeWind's Babel/JSX transform references.
module.exports = withNativeWind(config, { input: './global.css' });
