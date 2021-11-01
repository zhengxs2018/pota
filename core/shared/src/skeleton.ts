import { join } from 'path';
import type { PotaConfig } from './config.js';
import { EXCLUDED_FILES, POTA_DIR, POTA_CONFIG_FILE } from './config.js';
import { Recursive } from './fs.js';

interface GetNestedSkeletonsOptions {
  dir?: string;
}

interface SkeletonEntry {
  config: PotaConfig;
  skeleton: string;
  path: string;
  files: ReadonlyArray<string>;
}

export async function getNestedSkeletons(
  cwd: string,
  skeleton: string,
  options: GetNestedSkeletonsOptions = {},
): Promise<ReadonlyArray<SkeletonEntry>> {
  const { dir = '' } = options;

  const skeletons: Array<SkeletonEntry> = [];
  const modulesPath = join(cwd, 'node_modules');

  let currentSkeleton: string | undefined = skeleton;
  let currentPath: string;

  do {
    currentPath = join(modulesPath, currentSkeleton);
    const config = (await import(join(currentPath, POTA_DIR, POTA_CONFIG_FILE))).default;

    if (config) {
      // recursively read all of the files in the skeleton
      let files: ReadonlyArray<string> = [];

      try {
        files = await Recursive.readdir(join(currentPath, dir), { omit: EXCLUDED_FILES });
      } catch {
        // TODO: add debug logging
      }

      // store the skeletons in reverse order
      skeletons.unshift({
        config,
        files,
        path: currentPath,
        skeleton: currentSkeleton,
      });
    }

    currentSkeleton = config?.extends;
  } while (currentSkeleton);

  return skeletons;
}
