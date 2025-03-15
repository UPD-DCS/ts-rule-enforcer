import { expect, test } from "vitest"
import { validateCode, RuleEnforcerParams } from "../src/rule-enforcer"
import { Either } from "effect"

test("expectedFunctions absent param", () => {
  const source = `
    function f() {
    }
  `
  const params = RuleEnforcerParams.make({})

  expect(validateCode(source, params)).toStrictEqual(Either.right(null))
})

test("expectedFunctions empty param", () => {
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

test("expectedFunctions with extra", () => {
  const source = `
    function f() {
    }

    function g() {
    }
  `
  const params = RuleEnforcerParams.make({
    expectedFunctions: ["g"],
  })

  expect(validateCode(source, params)).toStrictEqual(Either.right(null))
})

test("expectedFunctions exact arrow", () => {
  const source = `
    const f = () => {
    }
  `
  const params = RuleEnforcerParams.make({
    expectedFunctions: ["f"],
  })

  expect(validateCode(source, params)).toStrictEqual(Either.right(null))
})

test("expectedFunctions with extra arrow", () => {
  const source = `
    const f = () => {
    }

    const g = () => {
    }
  `
  const params = RuleEnforcerParams.make({
    expectedFunctions: ["g"],
  })

  expect(validateCode(source, params)).toStrictEqual(Either.right(null))
})

test("expectedFunctions missing", () => {
  const source = `
    function f() {
    }

    function g() {
    }
  `
  const params = RuleEnforcerParams.make({
    expectedFunctions: ["h"],
  })

  expect(validateCode(source, params)).toStrictEqual(
    Either.left("Did not find: h"),
  )
})

test("expectedFunctions missing arrow", () => {
  const source = `
    const f = () => {
    }

    const g = () => {
    }
  `
  const params = RuleEnforcerParams.make({
    expectedFunctions: ["h"],
  })

  expect(validateCode(source, params)).toStrictEqual(
    Either.left("Did not find: h"),
  )
})

test("expectedFunctions missing inside", () => {
  const source = `
  function f() {
    function h() {
    }
  }

  function g() {
  }
`
  const params = RuleEnforcerParams.make({
    expectedFunctions: ["h"],
  })

  expect(validateCode(source, params)).toStrictEqual(
    Either.left("Did not find: h"),
  )
})

test("expectedFunctions missing inside arrow", () => {
  const source = `
  const f = () => {
    const h = () => {
    }
  }

  const g = () => {
  }
`
  const params = RuleEnforcerParams.make({
    expectedFunctions: ["h"],
  })

  expect(validateCode(source, params)).toStrictEqual(
    Either.left("Did not find: h"),
  )
})
