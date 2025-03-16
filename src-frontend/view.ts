import { Model } from "./model"
import { MsgCodeChanged, MsgRulesChanged, Msg } from "./msg"
import { h } from "./framework"

export const view = (model: Model, dispatch: (msg: Msg) => void) =>
  h("div", [
    h("h2", "TypeScript Rule Enforcer"),
    h("textarea", {
      on: {
        keyup: (ev) =>
          setTimeout(
            () =>
              dispatch(
                MsgCodeChanged.make({
                  key: ev.key,
                  text: (ev.target as HTMLTextAreaElement).value,
                }),
              ),
            0,
          ),
      },
      props: { value: model.code, rows: 30, cols: 60 },
    }),
    h("textarea", {
      on: {
        keyup: (ev) =>
          setTimeout(
            () =>
              dispatch(
                MsgRulesChanged.make({
                  key: ev.key,
                  text: (ev.target as HTMLTextAreaElement).value,
                }),
              ),
            0,
          ),
      },
      props: { value: model.rules, rows: 30, cols: 60 },
    }),
    h("textarea", { props: { value: model.feedback, rows: 10, cols: 120 } }),
  ])
