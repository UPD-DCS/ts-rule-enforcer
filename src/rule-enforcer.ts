import {
  Array,
  Match,
  pipe,
  Schema as S,
  Option,
  String,
  HashMap,
} from "effect"
import * as AstHelper from "./ast-helper"
import { Writer } from "./writer"
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

export const RuleViolation = S.Union(
  S.TaggedStruct("MissingExpectedFunction", {
    missing: S.NonEmptyArray(S.String),
  }),
  S.TaggedStruct("DisallowedDeclarations", {
    disallowed: S.String,
    code: S.String,
  }),
  S.TaggedStruct("DisallowedReassignment", { code: S.String }),
  S.TaggedStruct("DisallowedLoops", { code: S.String }),
  S.TaggedStruct("DisallowedIfStatements", { code: S.String }),
  S.TaggedStruct("DisallowedImport", { name: S.String, code: S.String }),
  S.TaggedStruct("DisallowedConsole", { code: S.String }),
  S.TaggedStruct("DisallowedHelperFunctions", { code: S.String }),
)

export type RuleViolation = typeof RuleViolation.Type
export const MissingExpectedFunction = RuleViolation.members[0]
export const DisallowedDeclarations = RuleViolation.members[1]
export const DisallowedReassignment = RuleViolation.members[2]
export const DisallowedLoops = RuleViolation.members[3]
export const DisallowedIfStatements = RuleViolation.members[4]
export const DisallowedImport = RuleViolation.members[5]
export const DisallowedConsole = RuleViolation.members[6]
export const DisallowedHelperFunctions = RuleViolation.members[7]

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
            MissingExpectedFunction.make({
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
          DisallowedDeclarations.make({
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
            DisallowedReassignment.make({
              code: token.parent.getText(),
            }),
          )
        : (
          token.kind === ts.SyntaxKind.EqualsToken &&
          token.parent.kind !== ts.SyntaxKind.VariableDeclaration
        ) ?
          Option.some(
            DisallowedReassignment.make({
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
            DisallowedLoops.make({
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
            DisallowedIfStatements.make({
              code: token.parent.getText(),
            }),
          )
        : Option.none(),
      ),
      (errors) => Writer.error(null, errors),
    )

const ModulePartPattern = S.Union(
  S.TaggedStruct("AllowAllParts", {}),
  S.TaggedStruct("RegularParts", { parts: S.Array(S.String) }),
)
const AllowAllParts = ModulePartPattern.members[0]
const RegularParts = ModulePartPattern.members[1]

const AllowedImportPattern = S.Union(
  S.TaggedStruct("AllowAllModules", {}),
  S.TaggedStruct("RegularModules", {
    mapping: S.HashMap({ key: S.String, value: ModulePartPattern }),
  }),
)
const AllowAllModules = AllowedImportPattern.members[0]
const RegularModules = AllowedImportPattern.members[1]
type AllowedImportPattern = typeof AllowedImportPattern.Type

const importPatternToRichType = (
  allowedImportPattern: AllowedImportPattern,
  patternStr: string,
) =>
  pipe(
    Match.value(allowedImportPattern),
    Match.tag("AllowAllModules", () => allowedImportPattern),
    Match.tag("RegularModules", ({ mapping }) =>
      patternStr === "*" ? AllowAllModules.make()
      : !String.includes(".")(patternStr) ?
        pipe(
          HashMap.set(mapping, patternStr, AllowAllParts.make()),
          (mapping) => RegularModules.make({ mapping }),
        )
      : pipe(String.replace(/\..+$/, "")(patternStr), (key) =>
          pipe(
            Match.value(HashMap.get(mapping, key)),
            Match.tag("Some", (modulePartPattern) =>
              pipe(
                Match.value(modulePartPattern.value),
                Match.tag("AllowAllParts", () => allowedImportPattern),
                Match.tag("RegularParts", ({ parts }) =>
                  pipe(
                    HashMap.set(
                      mapping,
                      key,
                      RegularParts.make({
                        parts: Array.append(
                          parts,
                          String.replace(/^.+\./, "")(patternStr),
                        ),
                      }),
                    ),
                    (mapping) => RegularModules.make({ mapping }),
                  ),
                ),
                Match.exhaustive,
              ),
            ),
            Match.tag("None", () =>
              pipe(
                HashMap.set(
                  mapping,
                  key,
                  RegularParts.make({
                    parts: [String.replace(/^.+\./, "")(patternStr)],
                  }),
                ),
                (mapping) => RegularModules.make({ mapping }),
              ),
            ),
            Match.exhaustive,
          ),
        ),
    ),
    Match.exhaustive,
  )

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
              RegularModules.make({ mapping: HashMap.empty() }),
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
  pipe(
    Match.value(pattern),
    Match.tag("AllowAllModules", () => Option.none()),
    Match.tag("RegularModules", ({ mapping }) =>
      pipe(
        Match.value(HashMap.get(mapping, module)),
        Match.tag("Some", (modulePartPattern) =>
          pipe(
            Match.value(modulePartPattern.value),
            Match.tag("AllowAllParts", () => Option.none()),
            Match.tag("RegularParts", ({ parts }) =>
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
                      DisallowedImport.make({
                        name: module,
                        code: node.getText(),
                      }),
                    )
                  : Option.none(),
              ),
            ),
            Match.exhaustive,
          ),
        ),
        Match.tag("None", () =>
          Option.some(
            DisallowedImport.make({
              name: module,
              code: node.getText(),
            }),
          ),
        ),
        Match.exhaustive,
      ),
    ),
    Match.exhaustive,
  )

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
            DisallowedConsole.make({
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
          Match.value,
          Match.tag("Some", (someFunctionName) =>
            (
              (ts.isFunctionDeclaration(n) || ts.isVariableDeclaration(n)) &&
              !pipe(
                rules.expectedFunctions!,
                Array.contains(someFunctionName.value),
              )
            ) ?
              Option.some(
                DisallowedHelperFunctions.make({
                  code: n.getText(),
                }),
              )
            : Option.none(),
          ),
          Match.tag("None", () => Option.none()),
          Match.exhaustive,
        ),
      ),
      (errors) => Writer.error(null, errors),
    )
