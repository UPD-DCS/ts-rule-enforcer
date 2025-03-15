import { Array, pipe, Schema as S, Data, Option, String, HashMap } from "effect"
import * as AstHelper from "./ast-helper"
import { Writer } from "./writer"
import { NonEmptyReadonlyArray } from "effect/Array"
import ts from "typescript"

export const Rules = S.Struct({
  expectedFunctions: S.optional(S.Array(S.String)),
  validDeclarations: S.optional(
    S.Array(S.Union(S.Literal("const"), S.Literal("let"), S.Literal("var"))),
  ),
  allowedImports: S.optional(S.Array(S.String)),
  disallow: S.optional(
    S.Array(
      S.Union(
        S.Literal("reassignment"),
        S.Literal("loops"),
        S.Literal("if-statements"),
        S.Literal("console"),
        S.Literal("helper-functions"),
      ),
    ),
  ),
})

export type RuleViolation = Data.TaggedEnum<{
  MissingExpectedFunction: { missing: NonEmptyReadonlyArray<string> }
  DisallowedDeclarations: { disallowed: string; code: string }
  DisallowedReassignment: { code: string }
  DisallowedLoops: { code: string }
  DisallowedIfStatements: { code: string }
  DisallowedImport: { name: string; code: string }
  DisallowedConsole: { code: string }
  DisallowedHelperFunctions: { code: string }
}>

export const RuleViolation = Data.taggedEnum<RuleViolation>()

export type Rules = typeof Rules.Type

export const validateCode = (
  code: string,
  rules: Rules,
): Writer<null, RuleViolation> =>
  pipe(
    validateExpectedFunctions(code, rules),
    Writer.flatMap(() => validateValidDeclarations(code, rules)),
    Writer.flatMap(() => validateDisallowReassignment(code, rules)),
    Writer.flatMap(() => validateDisallowLoops(code, rules)),
    Writer.flatMap(() => validateDisallowIfStatements(code, rules)),
    Writer.flatMap(() => validateAllowedImports(code, rules)),
    Writer.flatMap(() => validateDisallowConsole(code, rules)),
    Writer.flatMap(() => validateDisallowHelperFunctions(code, rules)),
  )

const validateExpectedFunctions = (
  code: string,
  rules: Rules,
): Writer<null, RuleViolation> =>
  (
    rules.expectedFunctions === undefined ||
    Array.isEmptyReadonlyArray(rules.expectedFunctions)
  ) ?
    Writer.success(null)
  : pipe(
      code,
      AstHelper.parseCode,
      AstHelper.getAllTopLevelFunctions,
      Array.map(AstHelper.getFunctionName),
      Array.filterMap((opt) => opt),
      (namesFound) =>
        pipe(
          rules.expectedFunctions as string[],
          Array.filter((required) => !Array.contains(namesFound, required)),
        ),
      (unmatchedRequired) =>
        Array.isNonEmptyArray(unmatchedRequired) ?
          Writer.error(null, [
            RuleViolation.MissingExpectedFunction({
              missing: unmatchedRequired,
            }),
          ])
        : Writer.error(null, []),
    )

const validateValidDeclarations = (
  code: string,
  rules: Rules,
): Writer<null, RuleViolation> =>
  rules.validDeclarations === undefined ?
    Writer.success(null)
  : pipe(
      code,
      AstHelper.parseCode,
      AstHelper.getAllNodes,
      Array.filter((node) =>
        Array.contains(
          [
            ts.SyntaxKind.LetKeyword,
            ts.SyntaxKind.ConstKeyword,
            ts.SyntaxKind.VarKeyword,
          ],
          node.kind,
        ),
      ),
      (nodes) =>
        pipe(
          Array.contains(rules.validDeclarations!, "const") ?
            Writer.success<null, RuleViolation>(null)
          : validateAbsentConst(nodes),
          Writer.flatMap(() =>
            Array.contains(rules.validDeclarations!, "let") ?
              Writer.success(null)
            : validateAbsentLet(nodes),
          ),
          Writer.flatMap(() =>
            Array.contains(rules.validDeclarations!, "var") ?
              Writer.success(null)
            : validateAbsentVar(nodes),
          ),
        ),
    )

const validateAbsentDeclaration = (
  nodes: ts.Node[],
  declaration: string,
  syntaxKind: ts.SyntaxKind,
): Writer<null, RuleViolation> =>
  pipe(
    nodes,
    Array.filterMap((node) =>
      node.kind === syntaxKind ?
        Option.some(
          RuleViolation.DisallowedDeclarations({
            disallowed: declaration,
            code: node.parent.getText(),
          }),
        )
      : Option.none(),
    ),
    (errors) => Writer.error(null, errors),
  )

const validateAbsentConst = (nodes: ts.Node[]): Writer<null, RuleViolation> =>
  validateAbsentDeclaration(nodes, "const", ts.SyntaxKind.ConstKeyword)

const validateAbsentLet = (nodes: ts.Node[]): Writer<null, RuleViolation> =>
  validateAbsentDeclaration(nodes, "let", ts.SyntaxKind.LetKeyword)

const validateAbsentVar = (nodes: ts.Node[]): Writer<null, RuleViolation> =>
  validateAbsentDeclaration(nodes, "var", ts.SyntaxKind.VarKeyword)

const validateDisallowReassignment = (
  code: string,
  rules: Rules,
): Writer<null, RuleViolation> =>
  (
    rules.disallow === undefined ||
    !Array.contains(rules.disallow, "reassignment")
  ) ?
    Writer.success(null)
  : pipe(
      code,
      AstHelper.parseCode,
      AstHelper.getAllNodes,
      Array.filterMap((token) =>
        (
          Array.contains(
            [
              ts.SyntaxKind.PlusPlusToken,
              ts.SyntaxKind.MinusMinusToken,
              ts.SyntaxKind.PlusEqualsToken,
              ts.SyntaxKind.MinusEqualsToken,
              ts.SyntaxKind.AsteriskEqualsToken,
              ts.SyntaxKind.SlashEqualsToken,
              ts.SyntaxKind.BarEqualsToken,
              ts.SyntaxKind.BarBarEqualsToken,
              ts.SyntaxKind.AmpersandEqualsToken,
              ts.SyntaxKind.AmpersandAmpersandEqualsToken,
              ts.SyntaxKind.CaretEqualsToken,
              ts.SyntaxKind.PercentEqualsToken,
              ts.SyntaxKind.QuestionQuestionEqualsToken,
              ts.SyntaxKind.LessThanLessThanEqualsToken,
              ts.SyntaxKind.GreaterThanGreaterThanEqualsToken,
              ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken,
            ],
            token.kind,
          )
        ) ?
          Option.some(
            RuleViolation.DisallowedReassignment({
              code: token.parent.getText(),
            }),
          )
        : (
          token.kind === ts.SyntaxKind.EqualsToken &&
          token.parent.kind !== ts.SyntaxKind.VariableDeclaration
        ) ?
          Option.some(
            RuleViolation.DisallowedReassignment({
              code: token.parent.getText(),
            }),
          )
        : Option.none(),
      ),
      (errors) => Writer.error(null, errors),
    )

const validateDisallowLoops = (
  code: string,
  rules: Rules,
): Writer<null, RuleViolation> =>
  rules.disallow === undefined || !Array.contains(rules.disallow, "loops") ?
    Writer.success(null)
  : pipe(
      code,
      AstHelper.parseCode,
      AstHelper.getAllNodes,
      Array.filterMap((token) =>
        (
          Array.contains(
            [
              ts.SyntaxKind.ForStatement,
              ts.SyntaxKind.WhileStatement,
              ts.SyntaxKind.DoStatement,
              ts.SyntaxKind.ForOfStatement,
            ],
            token.kind,
          )
        ) ?
          Option.some(
            RuleViolation.DisallowedLoops({
              code: token.parent.getText(),
            }),
          )
        : Option.none(),
      ),
      (errors) => Writer.error(null, errors),
    )

const validateDisallowIfStatements = (
  code: string,
  rules: Rules,
): Writer<null, RuleViolation> =>
  (
    rules.disallow === undefined ||
    !Array.contains(rules.disallow, "if-statements")
  ) ?
    Writer.success(null)
  : pipe(
      code,
      AstHelper.parseCode,
      AstHelper.getAllNodes,
      Array.filterMap((token) =>
        token.kind === ts.SyntaxKind.IfStatement ?
          Option.some(
            RuleViolation.DisallowedIfStatements({
              code: token.parent.getText(),
            }),
          )
        : Option.none(),
      ),
      (errors) => Writer.error(null, errors),
    )

type ModulePartPattern = Data.TaggedEnum<{
  AllowAll: {}
  Regular: { parts: string[] }
}>

const ModulePartPattern = Data.taggedEnum<ModulePartPattern>()

type AllowedImportPattern = Data.TaggedEnum<{
  AllowAll: {}
  Regular: { mapping: HashMap.HashMap<string, ModulePartPattern> }
}>

const AllowedImportPattern = Data.taggedEnum<AllowedImportPattern>()

const importPatternToRichType = (
  allowedImportPattern: AllowedImportPattern,
  patternStr: string,
) =>
  AllowedImportPattern.$match(allowedImportPattern, {
    AllowAll: () => allowedImportPattern,
    Regular: ({ mapping }) =>
      patternStr === "*" ? AllowedImportPattern.AllowAll()
      : !String.includes(".")(patternStr) ?
        pipe(
          HashMap.set(mapping, patternStr, ModulePartPattern.AllowAll()),
          (mapping) => AllowedImportPattern.Regular({ mapping }),
        )
      : pipe(String.replace(/\..+$/, "")(patternStr), (key) =>
          Option.match(HashMap.get(mapping, key), {
            onSome: (modulePartPattern) =>
              ModulePartPattern.$match(modulePartPattern, {
                AllowAll: () => allowedImportPattern,
                Regular: ({ parts }) =>
                  pipe(
                    HashMap.set(
                      mapping,
                      key,
                      ModulePartPattern.Regular({
                        parts: Array.append(
                          parts,
                          String.replace(/^.+\./, "")(patternStr),
                        ),
                      }),
                    ),
                    (mapping) => AllowedImportPattern.Regular({ mapping }),
                  ),
              }),
            onNone: () =>
              pipe(
                HashMap.set(
                  mapping,
                  key,
                  ModulePartPattern.Regular({
                    parts: [String.replace(/^.+\./, "")(patternStr)],
                  }),
                ),
                (mapping) => AllowedImportPattern.Regular({ mapping }),
              ),
          }),
        ),
  })

const validateAllowedImports = (
  code: string,
  rules: Rules,
): Writer<null, RuleViolation> =>
  rules.allowedImports === undefined ?
    Writer.success(null)
  : pipe(
      code,
      AstHelper.parseCode,
      AstHelper.getAllNodes,
      Array.filterMap((node) =>
        ts.isImportDeclaration(node) ?
          validateSingleModuleImport(
            node,
            pipe(node.moduleSpecifier.getText(), String.replaceAll('"', "")),
            Array.reduce(
              rules.allowedImports!,
              AllowedImportPattern.Regular({ mapping: HashMap.empty() }),
              importPatternToRichType,
            ),
          )
        : Option.none(),
      ),
      (errors) => Writer.error(null, errors),
    )

const validateSingleModuleImport = (
  node: ts.ImportDeclaration,
  module: string,
  pattern: AllowedImportPattern,
): Option.Option<RuleViolation> =>
  AllowedImportPattern.$match(pattern, {
    AllowAll: () => Option.none(),
    Regular: ({ mapping }) =>
      pipe(
        HashMap.get(mapping, module),
        Option.match({
          onSome: (modulePartPattern) =>
            pipe(
              modulePartPattern,
              ModulePartPattern.$match({
                AllowAll: () => Option.none(),
                Regular: ({ parts }) =>
                  pipe(
                    node,
                    AstHelper.getAllNodes,
                    Array.filterMap((n) =>
                      ts.isIdentifier(n) ?
                        ts.isImportSpecifier(n.parent) ?
                          n !== n.parent.getChildAt(0) ?
                            Option.none() // Ignore import aliases
                          : !Array.contains(parts, n.getText()) ?
                            Option.some(n.getText())
                          : Option.none()
                        : !Array.contains(parts, n.getText()) ?
                          Option.some(n.getText())
                        : Option.none()
                      : Option.none(),
                    ),
                    (unmatched) =>
                      Array.isNonEmptyArray(unmatched) ?
                        Option.some(
                          RuleViolation.DisallowedImport({
                            name: module,
                            code: node.getText(),
                          }),
                        )
                      : Option.none(),
                  ),
              }),
            ),
          onNone: () =>
            Option.some(
              RuleViolation.DisallowedImport({
                name: module,
                code: node.getText(),
              }),
            ),
        }),
      ),
  })

const validateDisallowConsole = (
  code: string,
  rules: Rules,
): Writer<null, RuleViolation> =>
  rules.disallow === undefined || !Array.contains(rules.disallow, "console") ?
    Writer.success(null)
  : pipe(
      code,
      AstHelper.parseCode,
      AstHelper.getAllNodes,
      Array.filterMap((n) =>
        ts.isIdentifier(n) && n.getText() === "console" ?
          Option.some(
            RuleViolation.DisallowedConsole({
              code: n.parent.getText(),
            }),
          )
        : Option.none(),
      ),
      (errors) => Writer.error(null, errors),
    )

const validateDisallowHelperFunctions = (
  code: string,
  rules: Rules,
): Writer<null, RuleViolation> =>
  (
    rules.expectedFunctions === undefined ||
    rules.disallow === undefined ||
    !Array.contains(rules.disallow, "helper-functions")
  ) ?
    Writer.success(null)
  : pipe(
      code,
      AstHelper.parseCode,
      AstHelper.getAllNodes,
      Array.filterMap((n) =>
        pipe(
          AstHelper.getFunctionName(n),
          Option.match({
            onSome: (functionName) =>
              (
                (ts.isFunctionDeclaration(n) || ts.isVariableDeclaration(n)) &&
                !pipe(rules.expectedFunctions!, Array.contains(functionName))
              ) ?
                Option.some(
                  RuleViolation.DisallowedHelperFunctions({
                    code: n.getText(),
                  }),
                )
              : Option.none(),
            onNone: () => Option.none(),
          }),
        ),
      ),
      (errors) => Writer.error(null, errors),
    )
