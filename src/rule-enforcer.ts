import { Array, pipe, Schema as S, Data, Option } from "effect"
import * as AstHelper from "./ast-helper"
import { Writer } from "./writer"
import { NonEmptyReadonlyArray } from "effect/Array"
import ts from "typescript"

export type RuleViolation = Data.TaggedEnum<{
  MissingExpectedFunction: { missing: NonEmptyReadonlyArray<string> }
  DisallowedDeclarations: { disallowed: string; code: string }
  DisallowedReassignment: { code: string }
}>

export const RuleViolation = Data.taggedEnum<RuleViolation>()

export const Rules = S.Struct({
  expectedFunctions: S.optional(S.Array(S.String)),
  validDeclarations: S.optional(
    S.Array(S.Union(S.Literal("const"), S.Literal("let"), S.Literal("var"))),
  ),
  disallow: S.optional(
    S.Array(
      S.Literal("reassignment"), //
    ),
  ),
})

export type Rules = typeof Rules.Type

export const validateCode = (
  code: string,
  rules: Rules,
): Writer<null, RuleViolation> =>
  pipe(
    validateExpectedFunctions(code, rules),
    Writer.flatMap(() => validateValidDeclarations(code, rules)),
    Writer.flatMap(() => validateDisallowReassignment(code, rules)),
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
  params: Rules,
): Writer<null, RuleViolation> =>
  params.validDeclarations === undefined ?
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
          Array.contains(params.validDeclarations!, "const") ?
            Writer.success<null, RuleViolation>(null)
          : validateAbsentConst(nodes),
          Writer.flatMap(() =>
            Array.contains(params.validDeclarations!, "let") ?
              Writer.success(null)
            : validateAbsentLet(nodes),
          ),
          Writer.flatMap(() =>
            Array.contains(params.validDeclarations!, "var") ?
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
            code: node.parent.getFullText(),
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
  params: Rules,
): Writer<null, RuleViolation> =>
  (
    params.disallow === undefined ||
    !Array.contains(params.disallow, "reassignment")
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
              code: token.parent.getFullText(),
            }),
          )
        : (
          token.kind === ts.SyntaxKind.EqualsToken &&
          token.parent.kind !== ts.SyntaxKind.VariableDeclaration
        ) ?
          Option.some(
            RuleViolation.DisallowedReassignment({
              code: token.parent.getFullText(),
            }),
          )
        : Option.none(),
      ),
      (errors) => Writer.error(null, errors),
    )
