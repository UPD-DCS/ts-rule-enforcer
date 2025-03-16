import { Schema as S } from "effect"
import { Msg } from "./msg"
import { Cmd } from "./framework"

export const Model = S.Struct({
  code: S.String,
  rules: S.String,
  feedback: S.String,
})

export type Model = typeof Model.Type

export const initModel: [Model, Cmd<Msg>] = [
  Model.make({
    code: "",
    rules: `{
  "expectedFunctions": ["f"],
  "validDeclarations": ["const"],
  "allowedImports": ["*"],
  "disallow": [
    "reassignment",
    "loops",
    "if-statements",
    "console",
    "helper-functions"
  ]
}`,
    feedback: "",
  }),
  null,
]
