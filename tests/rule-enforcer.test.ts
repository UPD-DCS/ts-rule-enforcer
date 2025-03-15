import { expect, test } from "vitest"
import {
  validateCode,
  RuleEnforcerParams,
  RuleViolation,
} from "../src/rule-enforcer"
import { Writer } from "../src/writer"
import { Array, pipe } from "effect"

test("expectedFunctions absent param", () => {
  const source = `
    function f() {
    }
  `
  const params = RuleEnforcerParams.make({})

  const [_, errors] = Writer.run(validateCode(source, params))
  expect(errors).toStrictEqual([])
})

test("expectedFunctions empty param", () => {
  const source = `
    function f() {
    }
  `
  const params = RuleEnforcerParams.make({
    expectedFunctions: [],
  })

  const [_, errors] = Writer.run(validateCode(source, params))
  expect(errors).toStrictEqual([])
})

test("expectedFunctions exact", () => {
  const source = `
    function f() {
    }
  `
  const params = RuleEnforcerParams.make({
    expectedFunctions: ["f"],
  })

  const [_, errors] = Writer.run(validateCode(source, params))
  expect(errors).toStrictEqual([])
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

  const [_, errors] = Writer.run(validateCode(source, params))
  expect(errors).toStrictEqual([])
})

test("expectedFunctions exact arrow", () => {
  const source = `
    const f = () => {
    }
  `
  const params = RuleEnforcerParams.make({
    expectedFunctions: ["f"],
  })

  const [_, errors] = Writer.run(validateCode(source, params))
  expect(errors).toStrictEqual([])
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

  const [_, errors] = Writer.run(validateCode(source, params))
  expect(errors).toStrictEqual([])
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

  const [_, errors] = Writer.run(validateCode(source, params))
  expect(errors).toStrictEqual([
    RuleViolation.MissingExpectedFunction({ missing: ["h"] }),
  ])
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

  const [_, errors] = Writer.run(validateCode(source, params))
  expect(errors).toStrictEqual([
    RuleViolation.MissingExpectedFunction({ missing: ["h"] }),
  ])
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

  const [_, errors] = Writer.run(validateCode(source, params))
  expect(errors).toStrictEqual([
    RuleViolation.MissingExpectedFunction({ missing: ["h"] }),
  ])
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

  const [_, errors] = Writer.run(validateCode(source, params))
  expect(errors).toStrictEqual([
    RuleViolation.MissingExpectedFunction({ missing: ["h"] }),
  ])
})

test("validDeclarations empty", () => {
  const source = `
  const f = () => {
    let h = () => {
      var x
      var y
    }

    const z
  }

  const g = () => {
  }
`
  const params = RuleEnforcerParams.make({
    validDeclarations: [],
  })

  const [_, errors] = Writer.run(validateCode(source, params))

  const declarationErrors = pipe(
    errors,
    Array.filter((error) => RuleViolation.$is("DisallowedDeclarations")(error)),
  )

  pipe(
    declarationErrors,
    Array.filter((error) => error.disallowed === "const"),
    Array.length,
    (actual) => expect(actual).toStrictEqual(3),
  )

  pipe(
    declarationErrors,
    Array.filter((error) => error.disallowed === "let"),
    Array.length,
    (actual) => expect(actual).toStrictEqual(1),
  )

  pipe(
    declarationErrors,
    Array.filter((error) => error.disallowed === "var"),
    Array.length,
    (actual) => expect(actual).toStrictEqual(2),
  )
})

test("validDeclarations const", () => {
  const source = `
  const f = () => {
    let h = () => {
      var x
      var y
    }

    const z
  }

  const g = () => {
  }
`
  const params = RuleEnforcerParams.make({
    validDeclarations: ["const"],
  })

  const [_, errors] = Writer.run(validateCode(source, params))

  const declarationErrors = pipe(
    errors,
    Array.filter((error) => RuleViolation.$is("DisallowedDeclarations")(error)),
  )

  pipe(
    declarationErrors,
    Array.filter((error) => error.disallowed === "const"),
    Array.length,
    (actual) => expect(actual).toStrictEqual(0),
  )

  pipe(
    declarationErrors,
    Array.filter((error) => error.disallowed === "let"),
    Array.length,
    (actual) => expect(actual).toStrictEqual(1),
  )

  pipe(
    declarationErrors,
    Array.filter((error) => error.disallowed === "var"),
    Array.length,
    (actual) => expect(actual).toStrictEqual(2),
  )
})

test("validDeclarations let", () => {
  const source = `
  const f = () => {
    let h = () => {
      var x
      var y
    }

    const z
  }

  const g = () => {
  }
`
  const params = RuleEnforcerParams.make({
    validDeclarations: ["let"],
  })

  const [_, errors] = Writer.run(validateCode(source, params))

  const declarationErrors = pipe(
    errors,
    Array.filter((error) => RuleViolation.$is("DisallowedDeclarations")(error)),
  )

  pipe(
    declarationErrors,
    Array.filter((error) => error.disallowed === "const"),
    Array.length,
    (actual) => expect(actual).toStrictEqual(3),
  )

  pipe(
    declarationErrors,
    Array.filter((error) => error.disallowed === "let"),
    Array.length,
    (actual) => expect(actual).toStrictEqual(0),
  )

  pipe(
    declarationErrors,
    Array.filter((error) => error.disallowed === "var"),
    Array.length,
    (actual) => expect(actual).toStrictEqual(2),
  )
})

test("validDeclarations var", () => {
  const source = `
  const f = () => {
    let h = () => {
      var x
      var y
    }

    const z
  }

  const g = () => {
  }
`
  const params = RuleEnforcerParams.make({
    validDeclarations: ["var"],
  })

  const [_, errors] = Writer.run(validateCode(source, params))

  const declarationErrors = pipe(
    errors,
    Array.filter((error) => RuleViolation.$is("DisallowedDeclarations")(error)),
  )

  pipe(
    declarationErrors,
    Array.filter((error) => error.disallowed === "const"),
    Array.length,
    (actual) => expect(actual).toStrictEqual(3),
  )

  pipe(
    declarationErrors,
    Array.filter((error) => error.disallowed === "let"),
    Array.length,
    (actual) => expect(actual).toStrictEqual(1),
  )

  pipe(
    declarationErrors,
    Array.filter((error) => error.disallowed === "var"),
    Array.length,
    (actual) => expect(actual).toStrictEqual(0),
  )
})

test("validDeclarations const let", () => {
  const source = `
  const f = () => {
    let h = () => {
      var x
      var y
    }

    const z
  }

  const g = () => {
  }
`
  const params = RuleEnforcerParams.make({
    validDeclarations: ["const", "let"],
  })

  const [_, errors] = Writer.run(validateCode(source, params))

  const declarationErrors = pipe(
    errors,
    Array.filter((error) => RuleViolation.$is("DisallowedDeclarations")(error)),
  )

  pipe(
    declarationErrors,
    Array.filter((error) => error.disallowed === "const"),
    Array.length,
    (actual) => expect(actual).toStrictEqual(0),
  )

  pipe(
    declarationErrors,
    Array.filter((error) => error.disallowed === "let"),
    Array.length,
    (actual) => expect(actual).toStrictEqual(0),
  )

  pipe(
    declarationErrors,
    Array.filter((error) => error.disallowed === "var"),
    Array.length,
    (actual) => expect(actual).toStrictEqual(2),
  )
})

test("disallow-reassignment simple", () => {
  const source = `
  let y = 1
  y = 2
`
  const params = RuleEnforcerParams.make({
    disallow: ["reassignment"],
  })

  const [_, errors] = Writer.run(validateCode(source, params))

  const relevantErrors = pipe(
    errors,
    Array.filter((error) => RuleViolation.$is("DisallowedReassignment")(error)),
  )

  expect(Array.length(relevantErrors)).toStrictEqual(1)
})

test("disallow-reassignment none", () => {
  const source = `
  var x = 0
  let y = 1
  const z = 2
`
  const params = RuleEnforcerParams.make({
    disallow: ["reassignment"],
  })

  const [_, errors] = Writer.run(validateCode(source, params))

  const relevantErrors = pipe(
    errors,
    Array.filter((error) => RuleViolation.$is("DisallowedReassignment")(error)),
  )

  expect(Array.length(relevantErrors)).toStrictEqual(0)
})

test("disallow-reassignment prop reassignment", () => {
  const source = `
  let w = {a: 1}
  w.a = 2
`
  const params = RuleEnforcerParams.make({
    disallow: ["reassignment"],
  })

  const [_, errors] = Writer.run(validateCode(source, params))

  const relevantErrors = pipe(
    errors,
    Array.filter((error) => RuleViolation.$is("DisallowedReassignment")(error)),
  )

  expect(Array.length(relevantErrors)).toStrictEqual(1)
})

test("disallow-reassignment compound", () => {
  const source = `
  let x = 1, y = 2
  y = 3
  let z = 4

  let w = {a: 1}
  w.a = 2

  const c = x === y
  const d = x === y
`
  const params = RuleEnforcerParams.make({
    disallow: ["reassignment"],
  })

  const [_, errors] = Writer.run(validateCode(source, params))

  const relevantErrors = pipe(
    errors,
    Array.filter((error) => RuleViolation.$is("DisallowedReassignment")(error)),
  )

  expect(Array.length(relevantErrors)).toStrictEqual(2)
})
