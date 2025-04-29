export type Status = 'todo' | 'in progress' | 'review' | 'done';

export type Task = {
  id: number;
  title: string;
  description: string;
  status: Status;
  user_id: string;
  project_id: number;
};

export type BoardSections = {
  [name: string]: Task[];
};
