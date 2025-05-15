import { Modal, Text, Group, Button, Box } from "@mantine/core";
import { Task } from "./types";

interface TaskDetailsViewProps {
  task: Task | null;
  opened: boolean;
  onClose: () => void;
  onEdit: () => void;
}

const TaskDetailsView: React.FC<TaskDetailsViewProps> = ({
  task,
  opened,
  onClose,
  onEdit,
}) => {
  if (!task) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Task Details"
      color="rgb(24, 33, 109)"
      size="md"
    >
      <Group align="center">
        <Text size="xl" fw={700} color="rgb(24, 33, 109)">
          {task.title}
        </Text>
        <Text size="sm" color="dimmed">
          Status: {task.status}
        </Text>
      </Group>

      <Text color="rgb(24, 33, 109)" size="md" mt="lg">
        <strong>Description:</strong>
      </Text>
      <Text size="md" mb="xl">
        {task.description || "No description provided"}
      </Text>

      {task.assigned_user_name && (
        <Box mt="lg" mb="xl">
          <Text color="rgb(24, 33, 109)" size="md">
            <strong>Assigned to:</strong>
          </Text>
          <span>{task.assigned_user_name}</span>
        </Box>
      )}

      <Group justify="flex-end" mt="md">
        <Button variant="outline" color="rgb(24, 33, 109)" onClick={onEdit}>
          Edit Task
        </Button>
        <Button color="rgb(24, 33, 109)" onClick={onClose}>
          Close
        </Button>
      </Group>
    </Modal>
  );
};

export default TaskDetailsView;
