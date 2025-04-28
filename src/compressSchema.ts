import { Project, SyntaxKind, Node, PropertyAssignment } from "ts-morph";
import fg from "fast-glob";
import clipboard from "clipboardy";
import fs from "fs";
import path from "path";

interface SchemaOpts {
  root?: string;
  only?: string; // comma‑sep list
  out?: string;
}

export function compressSchema(options: SchemaOpts) {
  const rootDir = options.root ?? "src";
  const allow = options.only ? new Set(options.only.split(",")) : null;
  const outFile = options.out ?? "output/compressed-schema.txt";

  const project = new Project();
  fg.sync([`${rootDir}/**/*.ts`], { cwd: process.cwd() }).forEach((f) =>
    project.addSourceFileAtPath(f)
  );

  const mapType = (type: string, len?: string): string => {
    const n = len?.replace(/\D/g, "");
    switch (type) {
      case "varchar":
        return `v${n || 255}`;
      case "text":
        return "txt";
      case "int":
        return "int";
      case "double":
        return "dbl";
      case "boolean":
        return "bool";
      case "timestamp":
        return "ts";
      case "json":
        return "json";
      default:
        return type;
    }
  };

  const isPrimaryKey = (callText: string) => /\.primaryKey\(/.test(callText);

  const outLines: string[] = [];

  project.getSourceFiles().forEach((sf) => {
    sf
      .getDescendantsOfKind(SyntaxKind.CallExpression)
      .filter((ce) => ce.getExpression().getText().startsWith("createTable"))
      .forEach((ce) => {
        const [nameNode, columnsFn, indexesFn] = ce.getArguments();
        const tblName = nameNode
          .asKindOrThrow(SyntaxKind.StringLiteral)
          .getLiteralText();
        if (allow && !allow.has(tblName)) return;

        const arrow = columnsFn.asKindOrThrow(SyntaxKind.ArrowFunction);
        let body = arrow.getBody();
        if (Node.isParenthesizedExpression(body)) body = body.getExpression();
        const obj = body.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);

        const colDefs: string[] = [];

        obj.getProperties().forEach((prop) => {
          if (!Node.isPropertyAssignment(prop)) return;
          const p = prop as PropertyAssignment;
          const colName = p.getName();
          const initText = p.getInitializer()?.getText() ?? "";
          const typeMatch = initText.match(/\.([a-zA-Z]+)\(/);
          const lenMatch = initText.match(/length:\s*(\d+)/);
          const mapped = mapType(typeMatch?.[1] ?? "unknown", lenMatch?.[1]);
          const pk = isPrimaryKey(initText) ? " PK" : "";
          colDefs.push(`${colName} ${mapped}${pk}`);
        });

        // Foreign‑key extraction (Drizzle style)
        if (indexesFn) {
          const arrFn = indexesFn.asKindOrThrow(SyntaxKind.ArrowFunction);
          let idxBody = arrFn.getBody();
          if (Node.isParenthesizedExpression(idxBody))
            idxBody = idxBody.getExpression();
          if (Node.isArrayLiteralExpression(idxBody)) {
            idxBody.getElements().forEach((el) => {
              if (!Node.isCallExpression(el)) return;
              if (!/foreignKey/.test(el.getExpression().getText())) return;
              const cfgObj = el
                .getArguments()[0]
                ?.asKind(SyntaxKind.ObjectLiteralExpression);
              if (!cfgObj) return;
              const colsArr = cfgObj
                .getProperty("columns")
                ?.getFirstDescendantByKind(SyntaxKind.ArrayLiteralExpression);
              const fcolsArr = cfgObj
                .getProperty("foreignColumns")
                ?.getFirstDescendantByKind(SyntaxKind.ArrayLiteralExpression);
              const colTxt = colsArr?.getElements()[0]?.getText().replace(/^.+\./, "");
              const fcolTxt = fcolsArr?.getElements()[0]?.getText().replace(/^.+\./, "");
              const ftabTxt = fcolsArr?.getElements()[0]?.getText().split(".")[0];
              if (colTxt && ftabTxt && fcolTxt)
                colDefs.push(`${colTxt} FK→${ftabTxt}.${fcolTxt}`);
            });
          }
        }

        outLines.push(`T ${tblName}: ${colDefs.join(", ")}`);
      });
  });

  const header =
    "// Compressed Drizzle Schema DSL\n// Legend: PK=primary key, FK→=foreign key, ts=TIMESTAMP, txt=TEXT, vXXX=VARCHAR(XXX)";
  const finalText = `${header}\n${outLines.join("\n")}`;

  // Write + clipboard
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, finalText);
  try {
    clipboard.writeSync(finalText);
    // eslint-disable-next-line no-console
    console.log("📋  Output copied to clipboard");
  } catch {
    /* clipboard unsupported (e.g. Linux headless) */
  }
  // eslint-disable-next-line no-console
  console.log("✅ Compressed schema saved to", outFile);
}