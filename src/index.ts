import { Command } from "commander";
import { compressSchema } from "./compressSchema.js";
import { compressStructure } from "./compressStructure.js";

interface Opts {
  root?: string;
  only?: string;
  out?: string;
  ignore?: string;
}

const program = new Command();
program
  .name("cursor-compress")
  .description("Token‑efficient compression utilities for LLM workflows")
  .version("0.1.0");

// Schema command
program
  .command("schema")
  .description("Generate a compressed Drizzle DSL schema summary")
  .option("-r, --root <dir>", "directory to scan", "src")
  .option("-o, --only <tables>", "comma‑separated allow‑list of tables")
  .option("-f, --out <file>", "output file", "output/compressed-schema.txt")
  .action((opts: Opts) => void compressSchema(opts));

// Structure command
program
  .command("structure")
  .description("Generate a compressed file‑structure summary")
  .option("-r, --root <dir>", "project root", ".")
  .option("-i, --ignore <patterns>", "comma‑separated glob patterns to ignore")
  .option("-f, --out <file>", "output file", "output/compressed-structure.txt")
  .action((opts: Opts) => void compressStructure(opts));

program.parse();