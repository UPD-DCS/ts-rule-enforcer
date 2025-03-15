import { Array, pipe, Schema as S, Either } from "effect"
import * as AstHelper from "./ast-helper"

export const RuleEnforcerParams = S.Struct({
  expectedFunctions: S.optional(S.Array(S.String)),
})

export type RuleEnforcerParams = typeof RuleEnforcerParams.Type

export const validateCode = (
  code: string,
  params: RuleEnforcerParams,
): Either.Either<null, string> =>
  Either.Do.pipe(
    Either.flatMap(() => validateExpectedFunctions(code, params)), //
    Either.map(() => null),
  )

const validateExpectedFunctions = (
  code: string,
  params: RuleEnforcerParams,
): Either.Either<null, string> =>
  (
    params.expectedFunctions === undefined ||
    Array.isEmptyReadonlyArray(params.expectedFunctions)
  ) ?
    Either.right(null)
  : pipe(
      code,
      AstHelper.parseCode,
      AstHelper.getAllTopLevelFunctions,
      Array.map(AstHelper.getFunctionName),
      Array.filterMap((opt) => opt),
      (namesFound) =>
        pipe(
          params.expectedFunctions as string[],
          Array.filter((required) => !Array.contains(namesFound, required)),
        ),
      (unmatchedRequired) =>
        Array.isNonEmptyReadonlyArray(unmatchedRequired) ?
          Either.left(`Did not find: ${unmatchedRequired}`)
        : Either.right(null),
    )
