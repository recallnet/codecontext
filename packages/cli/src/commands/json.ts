import { resolve } from "node:path";
import { buildFileContext } from "@codecontext/parser";
import { formatFileContextJson } from "../formatters/json.js";

export function runJson(filePath: string): void {
  const absPath = resolve(filePath);
  const ctx = buildFileContext(absPath);
  console.log(formatFileContextJson(ctx));
}
