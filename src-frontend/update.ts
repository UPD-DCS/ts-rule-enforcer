import { Model } from "./model"
import { Msg } from "./msg"
import { ModelCmd } from "./framework"
import { Match, Schema as S, Effect, pipe, Either } from "effect"
import { Rules, validateCode } from "../src/rule-enforcer"

const generateFeedback = (code: string, rulesStr: string) =>
  pipe(
    Either.try({
      try: () => JSON.parse(rulesStr) as object,
      catch: () => "Cannot parse rules",
    }),
    Match.value,
    Match.tag("Right", (either) =>
      pipe(
        either.right,
        S.decodeUnknownOption(Rules),
        Match.value,
        Match.tag("Some", (some) =>
          pipe(
            validateCode(code, some.value), //
            Effect.runSync,
            ([_, errors]) => JSON.stringify(errors, null, 2),
          ),
        ),
        Match.tag("None", () => "test"),
        Match.exhaustive,
      ),
    ),
    Match.tag("Left", (left) => left.left),
    Match.exhaustive,
  )

export const update = (msg: Msg, model: Model): ModelCmd<Model, Msg> =>
  pipe(
    msg,
    Match.value,
    Match.tag("MsgCodeChanged", ({ text }) =>
      model.code === text ?
        { model, cmd: null }
      : {
          model: Model.make({
            ...model,
            code: text,
            feedback: generateFeedback(text, model.rules),
          }),
          cmd: null,
        },
    ),
    Match.tag("MsgRulesChanged", ({ text }) =>
      model.rules === text ?
        { model, cmd: null }
      : {
          model: Model.make({
            ...model,
            rules: text,
            feedback: generateFeedback(model.code, text),
          }),
          cmd: null,
        },
    ),
    Match.exhaustive,
  )
