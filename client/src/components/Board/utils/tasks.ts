import { Task, Status } from "../types";

export const getTasksByStatus = (tasks: Task[], status: Status) => {
  return tasks.filter((task) => task.status === status);
};

export const getTaskById = (tasks: Task[], id: number) => {
  return tasks.find((task) => task.id === id);
};
