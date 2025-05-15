import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Status, Task } from "./types";
import TaskItem from "./TaskItem";
import SortableTaskItem from "./SortableTaskItem";
import {
  Button,
  Card,
  Group,
  Modal,
  Select,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";

interface User {
  id: string;
  name: string;
  email: string;
}

type BoardSectionProps = {
  id: string;
  title: string;
  tasks: Task[];
  project_id: number;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: number) => void;
  onAddTask: (sectionId: string, newTask: Omit<Task, "id">) => void;
  collaborators?: User[];
};

const BoardSection = ({
  id,
  title,
  tasks,
  project_id,
  onUpdateTask,
  onDeleteTask,
  onAddTask,
  collaborators,
}: BoardSectionProps) => {
  const { setNodeRef } = useDroppable({
    id,
  });

  const [addOpened, setAddOpened] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newAssignedTo, setNewAssignedTo] = useState<string | null>("");
  const { user } = useAuth0();

  const handleAdd = () => {
    onAddTask(id, {
      title: newTitle,
      description: newDescription,
      status: id as Status,
      user_id: user?.sub ? user.sub : "0",
      project_id: project_id,
      assigned_to: newAssignedTo ? newAssignedTo : null,
    });
    setAddOpened(false);
    setNewTitle("");
    setNewDescription("");
    setNewAssignedTo(null);
  };

  return (
    <div className="board-column-container">
      <h4 className="board-column-title">{title}</h4>
      <SortableContext
        id={id}
        items={tasks}
        strategy={verticalListSortingStrategy}
      >
        <div ref={setNodeRef} className="task-list">
          {tasks.map((task) => (
            <SortableTaskItem key={task.id} id={task.id}>
              <TaskItem
                onUpdate={onUpdateTask}
                onDelete={onDeleteTask}
                task={task}
                collaborators={collaborators}
              />
            </SortableTaskItem>
          ))}
        </div>
      </SortableContext>
      <Card
        onClick={() => setAddOpened(true)}
        style={{
          marginTop: "1rem",
          padding: "0.5rem 1rem",
          backgroundColor: "#e0e0e0",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        + Add Task
      </Card>
      <Modal
        opened={addOpened}
        onClose={() => setAddOpened(false)}
        title="Add New Task"
        size="sm"
      >
        <TextInput
          label="Title"
          value={newTitle}
          onChange={(e) => setNewTitle(e.currentTarget.value)}
          mb="sm"
        />
        <Textarea
          label="Description"
          value={newDescription}
          onChange={(e) => setNewDescription(e.currentTarget.value)}
          mb="md"
        />
        <Select
          label="Assign to"
          placeholder="Select a collaborator"
          data={
            collaborators?.map((user) => ({
              value: user.id,
              label: user.name,
            })) || []
          }
          value={newAssignedTo}
          onChange={(value) => setNewAssignedTo(value || null)}
          clearable
          searchable
          mb="xl"
        />
        <Group justify="flex-end">
          <Button color="rgb(24, 33, 109)" onClick={handleAdd}>
            Add
          </Button>
        </Group>
      </Modal>
    </div>
  );
};

export default BoardSection;
