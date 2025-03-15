import { expect, test } from "vitest"
import { validateCode, RuleEnforcerParams } from "../src/rule-enforcer"
import { Either } from "effect"

test("expectedFunctions absent", () => {
  const source = `
    function f() {
    }
  `
  const params = RuleEnforcerParams.make({})
  expect(validateCode(source, params)).toStrictEqual(Either.right(null))
})

test("expectedFunctions empty", () => {
  const source = `
    function f() {
    }
  `
  const params = RuleEnforcerParams.make({
    expectedFunctions: [],
  })
  expect(validateCode(source, params)).toStrictEqual(Either.right(null))
})

test("expectedFunctions exact", () => {
  const source = `
    function f() {
    }
  `
  const params = RuleEnforcerParams.make({
    expectedFunctions: ["f"],
  })
  expect(validateCode(source, params)).toStrictEqual(Either.right(null))
})
