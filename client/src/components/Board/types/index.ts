export type Status = 'todo' | 'in progress' | 'review' | 'done';

export type Task = {
  id: number;
  title: string;
  description: string;
  status: Status;
  user_id: string;
  project_id: number;
  assigned_to?: string | null;
  assigned_user_name?: string | null;
};

export type BoardSections = {
  [name: string]: Task[];
};
