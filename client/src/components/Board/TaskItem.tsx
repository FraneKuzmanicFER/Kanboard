import {
  Card,
  Text,
  Modal,
  TextInput,
  Textarea,
  Button,
  Group,
  ActionIcon,
} from "@mantine/core";
import { useState } from "react";
import { Task } from "./types";
import "./styles.css";
import { IconEdit } from "@tabler/icons-react";

type TaskItemProps = {
  task: Task;
  onUpdate: (updatedTask: Task) => void;
  onDelete: (taskId: number) => void;
  dragHandleProps?: React.HTMLAttributes<any>; // passed from SortableTaskItem
};

const TaskItem = ({
  task,
  onUpdate,
  onDelete,
  dragHandleProps,
}: TaskItemProps) => {
  const [opened, setOpened] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);

  const handleSave = () => {
    onUpdate({ ...task, title, description });
    setOpened(false);
  };

  const handleDelete = () => {
    onDelete(task.id);
    setOpened(false);
  };

  return (
    <>
      <Card className="task-item" style={{ cursor: "pointer" }}>
        {/* Clickable content */}
        <div
          {...dragHandleProps}
          onClick={(e) => e.stopPropagation()} // Don't trigger modal
          style={{ flexGrow: 1, cursor: "pointer", padding: "1rem" }}
        >
          <Text fw={500}>{task.title}</Text>
        </div>

        {/* Drag handle */}
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={() => setOpened(true)}
        >
          <IconEdit />
        </ActionIcon>
      </Card>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
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
        <Group justify="space-between" mt="md">
          <Button color="red" onClick={handleDelete}>
            Delete
          </Button>
          <Button color="rgb(24, 33, 109)" onClick={handleSave}>
            Save
          </Button>
        </Group>
      </Modal>
    </>
  );
};

export default TaskItem;
