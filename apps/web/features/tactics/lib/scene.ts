import type { TacticTokenSize } from "@guild/shared/enums";
import {
  TACTIC_LIMITS,
  type TacticElement,
  type TacticScene,
  type TacticStage,
} from "@guild/shared/schemas";

/**
 * A fresh element or stage id.
 * `crypto.randomUUID` is available in every browser the app supports and in jsdom, so nothing here
 * needs a counter that would collide across two editors saving the same tactic.
 * @returns A unique id
 */
export function newId(): string {
  return crypto.randomUUID();
}

/**
 * Whether a stage still has room for one more element.
 * @param stage - The stage being drawn on
 * @returns True once it holds the contract's maximum
 */
export function isStageFull(stage: TacticStage): boolean {
  return stage.elements.length >= TACTIC_LIMITS.elementsPerStage;
}

/**
 * Put an element on a stage.
 * A full stage is returned unchanged: the API would refuse the save with the whole drawing
 * attached, so the ceiling is enforced here too and the editor says so on the spot.
 * @param stage - The stage to draw on
 * @param element - The element to add
 * @returns A new stage carrying the element last, so it draws on top; the same stage when full
 */
export function addElement(
  stage: TacticStage,
  element: TacticElement
): TacticStage {
  if (isStageFull(stage)) {
    return stage;
  }

  return { ...stage, elements: [...stage.elements, element] };
}

/**
 * Take an element off a stage. The eraser is this and nothing else: no background-coloured stroke.
 * @param stage - The stage to erase from
 * @param elementId - Id of the element to remove
 * @returns A new stage without that element; the same content when the id is not on it
 */
export function removeElement(
  stage: TacticStage,
  elementId: string
): TacticStage {
  return {
    ...stage,
    elements: stage.elements.filter((element) => element.id !== elementId),
  };
}

/**
 * Move a token to new map coordinates.
 * @param stage - The stage the token stands on
 * @param tokenId - Id of the token
 * @param x - New x, in virtual map units
 * @param y - New y, in virtual map units
 * @returns A new stage with the token moved
 */
export function moveToken(
  stage: TacticStage,
  tokenId: string,
  x: number,
  y: number
): TacticStage {
  return {
    ...stage,
    elements: stage.elements.map((element) =>
      element.id === tokenId && element.kind === "token"
        ? { ...element, x, y }
        : element
    ),
  };
}

/**
 * Resize a token to one of the three offered sizes.
 * @param stage - The stage the token stands on
 * @param tokenId - Id of the token
 * @param size - The size to apply
 * @returns A new stage with the token resized
 */
export function resizeToken(
  stage: TacticStage,
  tokenId: string,
  size: TacticTokenSize
): TacticStage {
  return {
    ...stage,
    elements: stage.elements.map((element) =>
      element.id === tokenId && element.kind === "token"
        ? { ...element, size }
        : element
    ),
  };
}

/**
 * Replace one stage of a scene.
 * @param scene - The scene holding the stage
 * @param stage - The stage in its new state
 * @returns A new scene carrying that stage
 */
export function replaceStage(
  scene: TacticScene,
  stage: TacticStage
): TacticScene {
  return {
    ...scene,
    stages: scene.stages.map((existing) =>
      existing.id === stage.id ? stage : existing
    ),
  };
}

/**
 * Append an empty stage, named after its position.
 * @param scene - The scene to grow
 * @returns A new scene with one more stage; the same scene once it holds twenty
 */
export function addStage(scene: TacticScene): TacticScene {
  if (scene.stages.length >= TACTIC_LIMITS.stagesPerTactic) {
    return scene;
  }

  return {
    ...scene,
    stages: [
      ...scene.stages,
      {
        id: newId(),
        name: `Giai đoạn ${scene.stages.length + 1}`,
        elements: [],
      },
    ],
  };
}

/**
 * Copy a stage, elements and all, straight after the original.
 *
 * A token keeps its id: that id is what pairs the same unit across two stages, which is how the
 * viewer animates a move instead of blinking the token from one place to the next. An id only has
 * to be unique inside one stage, and every edit (`moveToken`, `removeElement`, undo) already works
 * on one stage at a time.
 *
 * A drawing gets a fresh id instead. Nobody follows one arrow from stage to stage, so a shared id
 * would buy nothing and would let undo and the eraser act on both copies at once.
 * @param scene - The scene holding the stage
 * @param stageId - Id of the stage to copy
 * @returns A new scene with the copy; the same scene when it already holds twenty stages
 */
export function duplicateStage(
  scene: TacticScene,
  stageId: string
): TacticScene {
  const index = scene.stages.findIndex((stage) => stage.id === stageId);

  if (index === -1 || scene.stages.length >= TACTIC_LIMITS.stagesPerTactic) {
    return scene;
  }

  const source = scene.stages[index];
  const copy: TacticStage = {
    id: newId(),
    name: `${source.name} (bản sao)`.slice(0, TACTIC_LIMITS.stageNameLength),
    elements: source.elements.map((element) =>
      element.kind === "token" ? element : { ...element, id: newId() }
    ),
  };

  return {
    ...scene,
    stages: [
      ...scene.stages.slice(0, index + 1),
      copy,
      ...scene.stages.slice(index + 1),
    ],
  };
}

/**
 * Rename a stage.
 * @param scene - The scene holding the stage
 * @param stageId - Id of the stage
 * @param name - The new name
 * @returns A new scene with the stage renamed
 */
export function renameStage(
  scene: TacticScene,
  stageId: string,
  name: string
): TacticScene {
  return {
    ...scene,
    stages: scene.stages.map((stage) =>
      stage.id === stageId ? { ...stage, name } : stage
    ),
  };
}

/**
 * Drop a stage.
 * @param scene - The scene holding the stage
 * @param stageId - Id of the stage to drop
 * @returns A new scene without it; the same scene when it is the only stage left
 */
export function removeStage(scene: TacticScene, stageId: string): TacticScene {
  if (scene.stages.length <= 1) {
    return scene;
  }

  return {
    ...scene,
    stages: scene.stages.filter((stage) => stage.id !== stageId),
  };
}
