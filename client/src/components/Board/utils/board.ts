import { BoardSections, Status, Task } from "../types";
import { BOARD_SECTIONS } from "../constants";
import { getTasksByStatus } from './tasks';

export const initializeBoard = (tasks: Task[]) => {
  const boardSections: BoardSections = {};

  Object.keys(BOARD_SECTIONS).forEach((boardSectionKey) => {
    boardSections[boardSectionKey] = getTasksByStatus(
      tasks,
      boardSectionKey as Status
    );
  });

  return boardSections;
};
