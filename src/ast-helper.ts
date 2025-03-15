import { pipe, Array, Option } from "effect"
import ts from "typescript"

export const parseCode = (code: string) =>
  ts
    .createSourceFile("submission.ts", code, ts.ScriptTarget.Latest, true)
    .getChildren()[0]

export const getAllTopLevelFunctions = (node: ts.Node): ts.Node[] =>
  pipe(
    node.getChildren(),
    Array.flatMap((child) =>
      ts.isFunctionDeclaration(child) ? [child]
      : ts.isVariableStatement(child) ?
        pipe(
          Option.Do.pipe(
            Option.flatMap(() =>
              Array.findFirst(
                child.getChildren(),
                (c) => c.kind === ts.SyntaxKind.VariableDeclarationList,
              ),
            ),
            Option.flatMap((list) =>
              Array.findFirst(
                list.getChildren(),
                (c) => c.kind === ts.SyntaxKind.SyntaxList,
              ),
            ),
            Option.map((syntaxList) =>
              pipe(
                syntaxList.getChildren(),
                Array.filter(ts.isVariableDeclaration),
              ),
            ),
          ),
          Option.getOrElse(() => []),
        )
      : [],
    ),
  )

export const getFunctionName = (node: ts.Node): Option.Option<string> =>
  ts.isFunctionDeclaration(node) ? Option.fromNullable(node.name?.getText())
  : ts.isArrowFunction(node) ?
    Option.fromNullable(
      ts.isVariableDeclaration(node.parent) ? node.parent.name.getText() : null,
    )
  : (
    ts.isVariableDeclaration(node) &&
    Array.length(Array.filter(node.getChildren(), ts.isArrowFunction)) > 0
  ) ?
    Option.some(node.name.getText())
  : Option.none()
