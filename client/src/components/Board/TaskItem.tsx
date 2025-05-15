import {
  Card,
  Text,
  Modal,
  TextInput,
  Textarea,
  Button,
  Group,
  ActionIcon,
  Select,
} from "@mantine/core";
import { useState } from "react";
import { Task } from "./types";
import "./styles.css";
import { IconEdit, IconEye } from "@tabler/icons-react";
import TaskDetailsView from "./TaskDetailsView";

interface User {
  id: string;
  name: string;
  email: string;
}

type TaskItemProps = {
  task: Task;
  onUpdate: (updatedTask: Task) => void;
  onDelete: (taskId: number) => void;
  dragHandleProps?: React.HTMLAttributes<any>; // passed from SortableTaskItem
  collaborators?: User[];
};

const TaskItem = ({
  task,
  onUpdate,
  onDelete,
  dragHandleProps,
  collaborators,
}: TaskItemProps) => {
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [viewModalOpened, setViewModalOpened] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [assignedTo, setAssignedTo] = useState<string | null>(
    task.assigned_to || ""
  );

  const handleSave = () => {
    onUpdate({ ...task, title, description, assigned_to: assignedTo });
    setEditModalOpened(false);
  };

  const handleDelete = () => {
    onDelete(task.id);
    setEditModalOpened(false);
  };

  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewModalOpened(true);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditModalOpened(true);
  };

  const handleOpenEditFromView = () => {
    setViewModalOpened(false);
    setEditModalOpened(true);
  };

  return (
    <>
      <Card className="task-item">
        {/* Clickable content */}
        <div
          {...dragHandleProps}
          onClick={handleViewClick}
          style={{ flexGrow: 1, cursor: "pointer", padding: "1rem" }}
        >
          <Text fw={500}>{task.title}</Text>
        </div>

        {/* Action icons */}
        <Group gap="xs" mr={5}>
          <ActionIcon
            variant="subtle"
            color="blue"
            onClick={handleViewClick}
            title="View details"
          >
            <IconEye size={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={handleEditClick}
            title="Edit task"
          >
            <IconEdit size={16} />
          </ActionIcon>
        </Group>
      </Card>

      {/* Edit Modal */}
      <Modal
        opened={editModalOpened}
        onClose={() => setEditModalOpened(false)}
        title="Edit Task"
        size="sm"
      >
        <TextInput
          label="Title"
          value={title}
          onChange={(event) => setTitle(event.currentTarget.value)}
          mb="sm"
        />
        <Textarea
          label="Description"
          value={description}
          onChange={(event) => setDescription(event.currentTarget.value)}
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
          value={assignedTo}
          onChange={(value) => setAssignedTo(value || null)}
          clearable
          searchable
          mb="xl"
        />
        <Group justify="space-between" mt="md">
          <Button color="red" onClick={handleDelete}>
            Delete
          </Button>
          <Button color="rgb(24, 33, 109)" onClick={handleSave}>
            Save
          </Button>
        </Group>
      </Modal>

      {/* View Modal */}
      <TaskDetailsView
        task={task}
        opened={viewModalOpened}
        onClose={() => setViewModalOpened(false)}
        onEdit={handleOpenEditFromView}
      />
    </>
  );
};

export default TaskItem;
