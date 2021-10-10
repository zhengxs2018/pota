import { join, resolve } from "path";

import { PACKAGE_JSON_FILE } from "./config.js";
import { promises as fs, realpathSync } from "fs";

const { access, readdir, readFile, writeFile } = fs;

export const getCWD = () => realpathSync(process.cwd());

export const resolveUser: typeof resolve = (...pathSegments) =>
  resolve(getCWD(), ...pathSegments);

export async function isDirectoryAvailable(dir: string) {
  try {
    await access(dir);
  } catch (error) {
    return true;
  }

  return false;
}

export function normalizePackagePath(path: string, postfix: string = PACKAGE_JSON_FILE) {
  // append "package.json" if the path doesn't include it
  if (!path.endsWith(postfix)) {
    return join(path, postfix);
  }

  return path;
}


export interface ProjectPotaConfig {
  default?: string;
}


export interface SkeletonPotaConfig {
  extends?: string;
  excludedFiles?: ReadonlyArray<string>;
  "package.json"?: Omit<PackageJsonShape, "pota">
}

export type PotaConfig = ProjectPotaConfig | SkeletonPotaConfig;

export interface PackageJsonShape {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  pota?: PotaConfig;
}

const READ_CACHE = new Map<string, PackageJsonShape>();

export async function readPackageJson(path: string) {
  path = normalizePackagePath(path);

  if (!READ_CACHE.has(path)) {
    const json: PackageJsonShape = JSON.parse(await readFile(path, { encoding: "utf8" }));

    READ_CACHE.set(path, json);
  }

  return READ_CACHE.get(path)!;
}

export async function writePackageJson(object: PackageJsonShape, path: string) {
  path = normalizePackagePath(path);

  await writeFile(path, JSON.stringify(object, null, 2), { encoding: "utf8" })
}

export class Recursive {

  static async readdir(dir: string, omit: ReadonlyArray<string> = []) {
    const files = await readdir(dir, { withFileTypes: true });
    const finalFiles: Array<string> = [];

    for (const file of files) {
      if (omit.includes(file.name)) continue;
      else if (file.isFile()) finalFiles.push(file.name);
      else if (file.isDirectory()) {
        // sub files come in relative to `file.name`
        const subFiles = await Recursive.readdir(join(dir, file.name));
        // we have to prepend the `file.name` so the path is always relative to `dir`
        finalFiles.push(...subFiles.map(filename => join(file.name, filename)));
      }
    }

    return finalFiles;
  }

}

