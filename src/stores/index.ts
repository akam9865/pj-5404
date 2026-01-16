import { PlayerStore } from "./PlayerStore";
import { ProgressStore } from "./ProgressStore";

export const progressStore = new ProgressStore();
export const playerStore = new PlayerStore(
  progressStore.handlePlayerStateChanged
);
