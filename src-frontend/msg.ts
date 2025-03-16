import { Schema as S } from "effect"

export const Msg = S.Union(
  S.TaggedStruct("MsgCodeChanged", { text: S.String, key: S.String }),
  S.TaggedStruct("MsgRulesChanged", { text: S.String, key: S.String }),
)

export type Msg = typeof Msg.Type
export const MsgCodeChanged = Msg.members[0]
export const MsgRulesChanged = Msg.members[1]
