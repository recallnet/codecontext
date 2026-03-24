import { resolve } from "node:path";
import { buildFileContext } from "@recallnet/codecontext-parser";
import { formatFileContext } from "../formatters/human.js";

export function runDefault(filePath: string): void {
  const absPath = resolve(filePath);
  const ctx = buildFileContext(absPath);
  console.log(formatFileContext(ctx));
}
