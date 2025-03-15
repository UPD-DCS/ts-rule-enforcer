import { pipe, Array, Option } from "effect"
import ts from "typescript"

export const parseCode = (code: string) =>
  ts
    .createSourceFile("submission.ts", code, ts.ScriptTarget.Latest, true)
    .getChildren()[0]

export const getAllTopLevelFunctions = (node: ts.Node): ts.Node[] =>
  pipe(
    node.getChildren(),
    Array.filterMap((child) =>
      ts.isFunctionDeclaration(child) ? Option.some(child)
      : ts.isArrowFunction(child) ? Option.some(child.parent)
      : Option.none(),
    ),
  )

export const getFunctionName = (node: ts.Node): Option.Option<string> =>
  ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) ?
    Option.fromNullable(node.name?.getText())
  : Option.none()
