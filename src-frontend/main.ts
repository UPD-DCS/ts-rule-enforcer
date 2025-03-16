import { start } from "./framework"
import { view } from "./view"
import { update } from "./update"
import { initModel } from "./model"

const root = document.querySelector("#app")! as HTMLElement
start(root, initModel, update, view)
