import { describe, expect, test } from "vitest"
import {
  validateCode,
  Rules,
  MissingExpectedFunction,
  DisallowedDeclarations,
  DisallowedReassignment,
  DisallowedLoops,
  DisallowedIfStatements,
  DisallowedImport,
  DisallowedConsole,
  DisallowedHelperFunctions,
} from "../src/rule-enforcer"
import { Writer } from "../src/writer"
import { Array, Schema as S, pipe } from "effect"

describe("expectedFunctions", () => {
  test("absent rule", () => {
    const source = `
    function f() {
    }
  `
    const rules = Rules.make({})

    const [_, errors] = Writer.run(validateCode(source, rules))
    expect(errors).toStrictEqual([])
  })

  test("empty rule", () => {
    const source = `
    function f() {
    }
  `
    const rules = Rules.make({
      expectedFunctions: [],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))
    expect(errors).toStrictEqual([])
  })

  test("exact", () => {
    const source = `
    function f() {
    }
  `
    const rules = Rules.make({
      expectedFunctions: ["f"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))
    expect(errors).toStrictEqual([])
  })

  test("with extra", () => {
    const source = `
    function f() {
    }

    function g() {
    }
  `
    const rules = Rules.make({
      expectedFunctions: ["g"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))
    expect(errors).toStrictEqual([])
  })

  test("exact arrow", () => {
    const source = `
    const f = () => {
    }
  `
    const rules = Rules.make({
      expectedFunctions: ["f"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))
    expect(errors).toStrictEqual([])
  })

  test("with extra arrow", () => {
    const source = `
    const f = () => {
    }

    const g = () => {
    }
  `
    const rules = Rules.make({
      expectedFunctions: ["g"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))
    expect(errors).toStrictEqual([])
  })

  test("exact anon function", () => {
    const source = `
    const f = function() {
    }
  `
    const rules = Rules.make({
      expectedFunctions: ["f"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))
    expect(errors).toStrictEqual([])
  })

  test("with extra anon function", () => {
    const source = `
    const f = function() {
    }

    const g = function() {
    }
  `
    const rules = Rules.make({
      expectedFunctions: ["g"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))
    expect(errors).toStrictEqual([])
  })

  test("missing", () => {
    const source = `
    function f() {
    }

    function g() {
    }
  `
    const rules = Rules.make({
      expectedFunctions: ["h"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))
    expect(errors).toStrictEqual([
      MissingExpectedFunction.make({ missing: ["h"] }),
    ])
  })

  test("missing arrow", () => {
    const source = `
    const f = () => {
    }

    const g = () => {
    }
  `
    const rules = Rules.make({
      expectedFunctions: ["h"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))
    expect(errors).toStrictEqual([
      MissingExpectedFunction.make({ missing: ["h"] }),
    ])
  })

  test("missing anon function", () => {
    const source = `
    const f = function() {
    }

    const g = function() {
    }
  `
    const rules = Rules.make({
      expectedFunctions: ["h"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))
    expect(errors).toStrictEqual([
      MissingExpectedFunction.make({ missing: ["h"] }),
    ])
  })

  test("missing inside", () => {
    const source = `
  function f() {
    function h() {
    }
  }

  function g() {
  }
`
    const rules = Rules.make({
      expectedFunctions: ["h"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))
    expect(errors).toStrictEqual([
      MissingExpectedFunction.make({ missing: ["h"] }),
    ])
  })

  test("missing inside arrow", () => {
    const source = `
  const f = () => {
    const h = () => {
    }
  }

  const g = () => {
  }
`
    const rules = Rules.make({
      expectedFunctions: ["h"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))
    expect(errors).toStrictEqual([
      MissingExpectedFunction.make({ missing: ["h"] }),
    ])
  })

  test("missing inside anon function", () => {
    const source = `
  const f = function() {
    const h = function() {
    }
  }

  const g = function() {
  }
`
    const rules = Rules.make({
      expectedFunctions: ["h"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))
    expect(errors).toStrictEqual([
      MissingExpectedFunction.make({ missing: ["h"] }),
    ])
  })

  test("multiple required good", () => {
    const source = `
  function f() {
  }

  function g() {
  }

  function h() {
  }
`
    const rules = Rules.make({
      expectedFunctions: ["h", "g"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))
    expect(errors).toStrictEqual([])
  })

  test("multiple required bad", () => {
    const source = `
  function f() {
  }

  function h() {
  }
`
    const rules = Rules.make({
      expectedFunctions: ["h", "g"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))
    expect(errors).toStrictEqual([
      MissingExpectedFunction.make({ missing: ["g"] }),
    ])
  })
})

describe("validDeclarations", () => {
  test("empty", () => {
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
    const rules = Rules.make({
      validDeclarations: [],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))

    const declarationErrors = pipe(
      errors,
      Array.filter(S.is(DisallowedDeclarations)),
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

  test("const", () => {
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
    const rules = Rules.make({
      validDeclarations: ["const"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))

    const declarationErrors = pipe(
      errors,
      Array.filter(S.is(DisallowedDeclarations)),
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

  test("let", () => {
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
    const rules = Rules.make({
      validDeclarations: ["let"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))

    const declarationErrors = pipe(
      errors,
      Array.filter(S.is(DisallowedDeclarations)),
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

  test("var", () => {
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
    const rules = Rules.make({
      validDeclarations: ["var"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))

    const declarationErrors = pipe(
      errors,
      Array.filter(S.is(DisallowedDeclarations)),
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

  test("const let", () => {
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
    const rules = Rules.make({
      validDeclarations: ["const", "let"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))

    const declarationErrors = pipe(
      errors,
      Array.filter(S.is(DisallowedDeclarations)),
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
})

describe("disallow: reassignment", () => {
  test("simple", () => {
    const source = `
  let y = 1
  y = 2
`
    const rules = Rules.make({
      disallow: ["reassignment"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))

    const relevantErrors = pipe(
      errors,
      Array.filter(S.is(DisallowedReassignment)),
    )

    expect(Array.length(relevantErrors)).toStrictEqual(1)
  })

  test("none", () => {
    const source = `
  var x = 0
  let y = 1
  const z = 2
`
    const rules = Rules.make({
      disallow: ["reassignment"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))

    const relevantErrors = pipe(
      errors,
      Array.filter(S.is(DisallowedReassignment)),
    )

    expect(Array.length(relevantErrors)).toStrictEqual(0)
  })

  test("prop reassignment", () => {
    const source = `
  let w = {a: 1}
  w.a = 2
`
    const rules = Rules.make({
      disallow: ["reassignment"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))

    const relevantErrors = pipe(
      errors,
      Array.filter(S.is(DisallowedReassignment)),
    )

    expect(Array.length(relevantErrors)).toStrictEqual(1)
  })

  test("compound", () => {
    const source = `
  let x = 1, y = 2
  y = 3
  let z = 4

  let w = {a: 1}
  w.a = 2

  const c = x === y
  const d = x === y
`
    const rules = Rules.make({
      disallow: ["reassignment"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))

    const relevantErrors = pipe(
      errors,
      Array.filter(S.is(DisallowedReassignment)),
    )

    expect(Array.length(relevantErrors)).toStrictEqual(2)
  })

  test("increment prefix", () => {
    const source = `
  let y = 1
  ++y
`
    const rules = Rules.make({
      disallow: ["reassignment"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))

    const relevantErrors = pipe(
      errors,
      Array.filter(S.is(DisallowedReassignment)),
    )

    expect(Array.length(relevantErrors)).toStrictEqual(1)
  })

  test("increment postfix", () => {
    const source = `
  let y = 1
  y++
`
    const rules = Rules.make({
      disallow: ["reassignment"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))

    const relevantErrors = pipe(
      errors,
      Array.filter(S.is(DisallowedReassignment)),
    )

    expect(Array.length(relevantErrors)).toStrictEqual(1)
  })

  test("decrement prefix", () => {
    const source = `
  let y = 1
  --y
`
    const rules = Rules.make({
      disallow: ["reassignment"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))

    const relevantErrors = pipe(
      errors,
      Array.filter(S.is(DisallowedReassignment)),
    )

    expect(Array.length(relevantErrors)).toStrictEqual(1)
  })

  test("decrement postfix", () => {
    const source = `
  let y = 1
  y--
`
    const rules = Rules.make({
      disallow: ["reassignment"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))

    const relevantErrors = pipe(
      errors,
      Array.filter(S.is(DisallowedReassignment)),
    )

    expect(Array.length(relevantErrors)).toStrictEqual(1)
  })

  test("all assignment shorthand", () => {
    const source = `
  let y = 1
  y += 2
  y -= 2
  y *= 2
  y /= 2
  y |= 2
  y ||= 2
  y &= 2
  y &&= 2
  y ^= 2
  y %= 2
  y ??= 2
  y <<= 2
  y >>= 2
  y >>>= 2
`
    const rules = Rules.make({
      disallow: ["reassignment"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))

    const relevantErrors = pipe(
      errors,
      Array.filter(S.is(DisallowedReassignment)),
    )

    expect(Array.length(relevantErrors)).toStrictEqual(14)
  })
})

describe("disallow: loops", () => {
  test("all kinds", () => {
    const source = `
for (let i = 0; i < 10; i++) {
  while (x !== 0) {
    do {
      do {
for (const y of [1, 2, 3]) {

}

for (const y of [1, 2, 3]) {

}

for (const y of [1, 2, 3]) {

}
      } while (x <= 2);
    } while (x <= 2);
  }
}

while (x !== 0) {
}

do {

} while (x <= 2);


for (const y of [1, 2, 3]) {

}
`
    const rules = Rules.make({
      disallow: ["loops"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))

    const relevantErrors = pipe(errors, Array.filter(S.is(DisallowedLoops)))

    expect(Array.length(relevantErrors)).toStrictEqual(10)
  })
})

describe("disallow: if-statements", () => {
  test("all kinds", () => {
    const source = `
if (x === 1) console.log('test')

if (x === 1) console.log('test')
else console.log('test')

if (x === 1) {
  console.log('test')
} else {
  console.log('test')
}

if (x === 1) {
  console.log('test')
} else if (x === 2) {
  console.log('test')
}

if (x === 1) {
  console.log('test')
} else if (x === 2) {
  console.log('test')
} else if (x === 3) {
  console.log('test')
}

if (x === 1) {
  console.log('test')
} else if (x === 2) {
  console.log('test')
} else
  console.log('test')
}

if (x === 1) {
  console.log('test')
} else if (x === 2) {
  console.log('test')
} else if (x === 3) {
  console.log('test')
} else {
  console.log('test')
}

if (x === 1) {
} else if (x === 2) {
} else if (x === 3) {
} else {
  if (x === 1) {
    if (x === 1) {
    } else if (x === 2) {
    } else if (x === 3) {
      if (x === 1) {
      } else if (x === 2) {
        if (x === 1) {
        } else if (x === 2) {
        } else if (x === 3) {
        } else {
        }
      } else if (x === 3) {
      } else {
      }
    } else {
    }
  } else if (x === 2) {
  } else if (x === 3) {
  } else {
  }
}
`
    const rules = Rules.make({
      disallow: ["if-statements"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))

    const relevantErrors = pipe(
      errors,
      Array.filter(S.is(DisallowedIfStatements)),
    )

    expect(Array.length(relevantErrors)).toStrictEqual(28)
  })
})

describe("allowedImport", () => {
  test("disallow all", () => {
    const source = `
import { describe, expect, test } from "vitest"
import { validateCode, Rules, RuleViolation } from "../src/rule-enforcer"
import { Writer } from "../src/writer"
import { Array, pipe } from "effect"
import { Array, pipe, Schema as S, Data, Option } from "effect"
import * as AstHelper from "./ast-helper"
import { Writer } from "./writer"
import { NonEmptyReadonlyArray } from "effect/Array"
import ts from "typescript"
`
    const rules = Rules.make({
      allowedImports: [],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))

    const relevantErrors = pipe(errors, Array.filter(S.is(DisallowedImport)))

    expect(Array.length(relevantErrors)).toStrictEqual(9)
  })

  test("allow only effect", () => {
    const source = `
import { describe, expect, test } from "vitest"
import { validateCode, Rules, RuleViolation } from "../src/rule-enforcer"
import { Writer } from "../src/writer"
import { Array, pipe } from "effect"
import { Array, pipe, Schema as S, Data, Option } from "effect"
import * as AstHelper from "./ast-helper"
import { Writer } from "./writer"
import { NonEmptyReadonlyArray } from "effect/Array"
import ts from "typescript"
`
    const rules = Rules.make({
      allowedImports: ["effect"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))

    const relevantErrors = pipe(errors, Array.filter(S.is(DisallowedImport)))

    expect(Array.length(relevantErrors)).toStrictEqual(7)
  })

  test("allow only effect.pipe and effect.Array", () => {
    const source = `
import { describe, expect, test } from "vitest"
import { validateCode, Rules, RuleViolation } from "../src/rule-enforcer"
import { Writer } from "../src/writer"
import { Array, pipe } from "effect"
import { Array as abc, pipe as def } from "effect"
import { Array, pipe, Schema as S, Data, Option } from "effect"
import * as AstHelper from "./ast-helper"
import { Writer } from "./writer"
import { NonEmptyReadonlyArray } from "effect/Array"
import ts from "typescript"
`
    const rules = Rules.make({
      allowedImports: ["effect.pipe", "effect.Array"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))

    const relevantErrors = pipe(errors, Array.filter(S.is(DisallowedImport)))

    expect(Array.length(relevantErrors)).toStrictEqual(8)
  })

  test("allow only effect.pipe and effect.Array with aliases", () => {
    const source = `
import { Array as abc, pipe as def } from "effect"
`
    const rules = Rules.make({
      allowedImports: ["effect.pipe", "effect.Array"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))

    const relevantErrors = pipe(errors, Array.filter(S.is(DisallowedImport)))

    expect(Array.length(relevantErrors)).toStrictEqual(0)
  })

  test("allow all", () => {
    const source = `
import { describe, expect, test } from "vitest"
import { validateCode, Rules, RuleViolation } from "../src/rule-enforcer"
import { Writer } from "../src/writer"
import { Array, pipe } from "effect"
import { Array as abc, pipe as def } from "effect"
import { Array, pipe, Schema as S, Data, Option } from "effect"
import * as AstHelper from "./ast-helper"
import { Writer } from "./writer"
import { NonEmptyReadonlyArray } from "effect/Array"
import ts from "typescript"
`
    const rules = Rules.make({
      allowedImports: ["*", "effect.pipe", "effect.Array"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))

    const relevantErrors = pipe(errors, Array.filter(S.is(DisallowedImport)))

    expect(Array.length(relevantErrors)).toStrictEqual(0)
  })

  test("allow ", () => {
    const source = `
import ts from "typescript"
`
    const rules = Rules.make({
      allowedImports: ["typescript"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))

    const relevantErrors = pipe(errors, Array.filter(S.is(DisallowedImport)))

    expect(Array.length(relevantErrors)).toStrictEqual(0)
  })
})

describe("disallow: console", () => {
  test("all kinds", () => {
    const source = `
console.log("1")
const c = console
c.log("2")
`
    const rules = Rules.make({
      disallow: ["console"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))

    const relevantErrors = pipe(errors, Array.filter(S.is(DisallowedConsole)))

    expect(Array.length(relevantErrors)).toStrictEqual(2)
  })
})

describe("disallow: helper-functions", () => {
  test("all kinds", () => {
    const source = `
const f = () => {
}

const g1 = () => {
  function g2() {
  }
}

function g3() {
  const g4 = () => {}
}
`
    const rules = Rules.make({
      expectedFunctions: ["f"],
      disallow: ["helper-functions"],
    })

    const [_, errors] = Writer.run(validateCode(source, rules))

    const relevantErrors = pipe(
      errors,
      Array.filter(S.is(DisallowedHelperFunctions)),
    )

    expect(Array.length(relevantErrors)).toStrictEqual(4)
  })
})
