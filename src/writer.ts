import { Effect, Array, pipe } from "effect"

export type Writer<A, L> = Effect.Effect<[A, L[]], never, never>

export namespace Writer {
  export const flatMap =
    <A, B, L>(f: (x: A) => Writer<B, L>) =>
    (mx: Writer<A, L>): Writer<B, L> =>
      pipe(
        mx,
        Effect.flatMap(([x, log1]) =>
          pipe(
            f(x), //
            Effect.map(([y, log2]) => [y, Array.appendAll(log1, log2)]),
          ),
        ),
      )

  export const success = <A, L>(a: A): Writer<A, L> => Effect.succeed([a, []])

  export const error = <A, L>(a: A, log: L[]): Writer<A, L> =>
    Effect.succeed([a, log])

  export const run = <A, L>(writer: Writer<A, L>) => Effect.runSync(writer)
}
