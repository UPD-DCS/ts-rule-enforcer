import { Effect } from "effect"
import {
  h,
  init,
  classModule,
  propsModule,
  styleModule,
  eventListenersModule,
  attributesModule,
  VNode,
} from "snabbdom"

const patch = init([
  classModule,
  propsModule,
  styleModule,
  eventListenersModule,
  attributesModule,
])

type Cmd<Msg> = {
  sub: (dispatch: (msg: Msg) => void) => Effect.Effect<void, any, never>
} | null

namespace Cmd {
  export const ofSub = <Msg>(
    sub: (dispatch: (msg: Msg) => void) => Effect.Effect<void, any, never>,
  ): Cmd<Msg> => ({
    sub,
  })
}

type ModelCmd<Model, Msg> = {
  model: Model
  cmd: Cmd<Msg>
}

const start = <Model, Msg>(
  root: HTMLElement,
  initModel: [Model, Cmd<Msg>],
  update: (msg: Msg, model: Model) => ModelCmd<Model, Msg>,
  view: (model: Model, dispatch: (msg: Msg) => void) => VNode,
) => {
  const main = Effect.gen(function* () {
    const messageQueue: Msg[] = []

    const updateModel = () => {
      while (messageQueue.length > 0) {
        const msg = messageQueue.splice(0, 1)[0]

        let { model: newModel, cmd } = update(msg, model)

        model = newModel

        if (cmd !== null) {
          Effect.runFork(
            cmd.sub(dispatch).pipe(Effect.tap(() => updateModel())),
          )
        }
      }

      container = patch(container, view(model, dispatch))
    }

    const dispatch = (msg: Msg) => {
      messageQueue.push(msg)
      setTimeout(updateModel, 0)
    }

    let [model, initCmd] = initModel
    if (initCmd) {
      Effect.runFork(
        initCmd.sub(dispatch).pipe(Effect.tap(() => updateModel())),
      )
    }

    let container = patch(root, view(model, dispatch))
  })

  Effect.runPromise(main)
}

export { start, h, Cmd, ModelCmd }
