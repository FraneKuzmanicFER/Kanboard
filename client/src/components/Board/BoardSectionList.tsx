import { Avatar, Button, Modal } from "@mantine/core";
import {
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
  DndContext,
  closestCorners,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
  DropAnimation,
  defaultDropAnimation,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import { BoardSections as BoardSectionsType, Status, Task } from "./types";
import { getTaskById } from "./utils/tasks";
import { initializeBoard } from "./utils/board";
import BoardSection from "./BoardSection";
import TaskItem from "./TaskItem";
import InviteFriendsModal from "./InviteFriendsModal";
import { useEffect, useState } from "react";
import "./styles.css";
import axiosInstance from "../../services/axios";
import { io, Socket } from "socket.io-client";

interface Project {
  id: number;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface BoardSectionListProps {
  selectedProject: Project;
  currentUser: { id: string }; // Added current user prop
}

const BoardSectionList: React.FC<BoardSectionListProps> = ({
  selectedProject,
  currentUser,
}) => {
  const [boardSections, setBoardSections] = useState<BoardSectionsType>({});
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<null | number>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  // Add state for invite friends modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [collaboratorsModalOpen, setCollaboratorsModalOpen] = useState(false);
  const [collaborators, setCollaborators] = useState<User[]>([]);

  const fetchTasks = async (projectId: number): Promise<Task[]> => {
    const response = await axiosInstance.get(`/tasks/${projectId}`);
    return response.data;
  };

  const fetchCollaborators = async () => {
    try {
      const response = await axiosInstance.get(
        `/projects/${selectedProject.id}/collaborators`
      );
      setCollaborators(response.data);
    } catch (error) {
      console.error("Failed to fetch collaborators:", error);
    }
  };

  useEffect(() => {
    // Create socket connection (ensure this matches your backend URL)
    const newSocket = io("https://kanboard-server.onrender.com");
    setSocket(newSocket);

    fetchCollaborators();

    // Clean up on unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket || !selectedProject?.id) return;

    // Join the room for this project
    socket.emit("join_project", selectedProject.id);

    // Listen for real-time task updates
    socket.on("task_created", (newTask: Task) => {
      console.log("Socket: Task created", newTask);

      // Only update if it's for our current project
      if (newTask.project_id === selectedProject.id) {
        setTasks((prevTasks) => [...prevTasks, newTask]);
        setBoardSections((prevSections) => ({
          ...prevSections,
          [newTask.status]: [...prevSections[newTask.status], newTask],
        }));
      }
    });

    socket.on("task_updated", (updatedTask: Task) => {
      console.log("Socket: Task updated", updatedTask);

      // Only update if it's for our current project
      if (updatedTask.project_id === selectedProject.id) {
        // Update tasks array
        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task.id === updatedTask.id ? updatedTask : task
          )
        );

        // Update board sections
        setBoardSections((prevSections) => {
          const newSections = { ...prevSections };

          // Remove the task from all sections
          Object.keys(newSections).forEach((section) => {
            newSections[section] = newSections[section].filter(
              (task) => task.id !== updatedTask.id
            );
          });

          // Add the task to its updated section
          newSections[updatedTask.status] = [
            ...newSections[updatedTask.status],
            updatedTask,
          ];

          return newSections;
        });
      }
    });

    socket.on(
      "task_deleted",
      (deletedInfo: { id: number; project_id: number }) => {
        console.log("Socket: Task deleted", deletedInfo);

        // Only update if it's for our current project
        if (deletedInfo.project_id === selectedProject.id) {
          // Remove from tasks array
          setTasks((prevTasks) =>
            prevTasks.filter((task) => task.id !== deletedInfo.id)
          );

          // Remove from board sections
          setBoardSections((prevSections) => {
            const newSections = { ...prevSections };

            // Remove the task from all sections
            Object.keys(newSections).forEach((section) => {
              newSections[section] = newSections[section].filter(
                (task) => task.id !== deletedInfo.id
              );
            });

            return newSections;
          });
        }
      }
    );

    // Fetch tasks when project changes
    const loadTasks = async () => {
      try {
        const fetchedTasks = await fetchTasks(selectedProject.id);
        setBoardSections(initializeBoard(fetchedTasks));
        setTasks(fetchedTasks);
      } catch (error) {
        console.error("Failed to fetch tasks:", error);
      }
    };

    loadTasks();

    // Leave the room when component unmounts or project changes
    return () => {
      socket.emit("leave_project", selectedProject.id);
      socket.off("task_created");
      socket.off("task_updated");
      socket.off("task_deleted");
    };
  }, [selectedProject.id, socket]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveTaskId(active.id as number);
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;

    // Find which container has the active task
    const activeContainerKey = Object.keys(boardSections).find((key) =>
      boardSections[key].some((task) => task.id === active.id)
    );

    // Determine target container - either the section itself or the section containing the task
    let overContainerKey;

    // If over.id is a string and matches a section name
    if (
      typeof over.id === "string" &&
      Object.keys(boardSections).includes(over.id)
    ) {
      overContainerKey = over.id;
    } else {
      // Find which section contains the task we're hovering over
      overContainerKey = Object.keys(boardSections).find((key) =>
        boardSections[key].some((task) => task.id === over.id)
      );
    }

    if (
      !activeContainerKey ||
      !overContainerKey ||
      activeContainerKey === overContainerKey
    ) {
      return;
    }

    setBoardSections((boardSection) => {
      const activeItems = boardSection[activeContainerKey];
      const overItems = boardSection[overContainerKey];

      const activeIndex = activeItems.findIndex(
        (item) => item.id === active.id
      );

      // Instead of findIndex with item.id !== over?.id, which might not work as expected
      // Set a default insert position at the beginning of the list
      let overIndex = 0;

      // If we're over a task, insert after that task
      if (typeof over.id === "number") {
        const overTaskIndex = overItems.findIndex(
          (item) => item.id === over.id
        );
        if (overTaskIndex !== -1) {
          overIndex = overTaskIndex + 1; // Insert after the task we're hovering over
        }
      }

      // Make sure we have the task to move
      if (activeIndex === -1) {
        return boardSection;
      }

      // Get the task we're moving
      const taskToMove = activeItems[activeIndex];

      return {
        ...boardSection,
        [activeContainerKey]: [
          ...boardSection[activeContainerKey].filter(
            (item) => item.id !== active.id
          ),
        ],
        [overContainerKey]: [
          ...boardSection[overContainerKey].slice(0, overIndex),
          taskToMove,
          ...boardSection[overContainerKey].slice(
            overIndex,
            boardSection[overContainerKey].length
          ),
        ],
      };
    });
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over) return;

    // Log the contents of each section for debugging
    Object.keys(boardSections).forEach((section) =>
      boardSections[section].map(
        (task) => `ID: ${task.id}, Title: ${task.title}`
      )
    );

    // IMPORTANT: Fix for drag and drop between containers
    // Instead of relying on IDs, use a simpler approach - check what the current container is after drag

    // This will be calculated below
    let originalContainer = null;
    let targetContainer = null;

    // First, find the task being moved
    const movedTask = tasks.find((task) => task.id === active.id);
    if (!movedTask) {
      console.error("Could not find the task being moved");
      return;
    }

    // The original container should match the task's current status
    originalContainer = movedTask.status;

    // Find target container based on where the task was dropped
    if (
      typeof over.id === "string" &&
      Object.keys(boardSections).includes(over.id)
    ) {
      // Dropped directly on a section
      targetContainer = over.id;
    } else {
      // Dropped on another task, find which section that task belongs to
      for (const [section, sectionTasks] of Object.entries(boardSections)) {
        // Check if the destination task exists in this section after handleDragOver modified the state
        if (sectionTasks.some((task) => task.id === active.id)) {
          // After drag, the active task is now in this section
          targetContainer = section;
          break;
        }
      }

      // If we still couldn't determine the target container (unlikely but possible)
      if (!targetContainer) {
        console.error("Could not determine target container");
        return;
      }
    }

    console.log(
      "Final determination - Moving from:",
      originalContainer,
      "to:",
      targetContainer
    );

    if (!originalContainer || !targetContainer) {
      console.error("Couldn't determine source or target container");
      return;
    }

    // Handle reordering within the same container
    if (originalContainer === targetContainer) {
      const activeIndex = boardSections[originalContainer].findIndex(
        (task) => task.id === active.id
      );
      const overIndex = boardSections[targetContainer].findIndex(
        (task) => task.id === over.id
      );

      if (activeIndex !== overIndex) {
        setBoardSections((boardSection) => ({
          ...boardSection,
          [targetContainer]: arrayMove(
            boardSection[targetContainer],
            activeIndex,
            overIndex
          ),
        }));
      }
    }
    // Handle moving between containers (update status in DB)
    else {
      // Find the task that was moved
      const task = tasks.find((t) => t.id === active.id);

      if (task) {
        const status = targetContainer as Status;
        // Create updated task with new status
        const updatedTask = {
          ...task,
          status: status, // The container name becomes the new status
        };

        // Update task in the database
        try {
          await handleUpdateTask(updatedTask);

          // Also update the tasks array to keep it in sync
          setTasks((prevTasks) =>
            prevTasks.map((t) =>
              t.id === task.id ? { ...t, status: status } : t
            )
          );
        } catch (error) {
          console.error("Failed to update task status in database:", error);

          // Revert the UI change if the DB update fails
          setBoardSections((prevSections) => {
            // Create deep copy to avoid mutation
            const newSections = JSON.parse(JSON.stringify(prevSections));

            // Remove the task from the target container
            newSections[targetContainer] = newSections[targetContainer].filter(
              (t: Task) => t.id !== task.id
            );

            // Add it back to the original container
            newSections[originalContainer] = [
              ...newSections[originalContainer],
              task,
            ];

            return newSections;
          });
        }
      }
    }

    setActiveTaskId(null);
  };

  const handleAddTask = async (
    _sectionId: string,
    newTask: Omit<Task, "id">
  ) => {
    try {
      const response = await axiosInstance.post("/tasks", newTask);
      const createdTask: Task = response.data;

      // No need to update state here as the socket will broadcast the change
      console.log("Task created:", createdTask);
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    try {
      const response = await axiosInstance.put(
        `/tasks/${updatedTask.id}`,
        updatedTask
      );
      const updatedTaskFromBackend: Task = response.data;

      // No need to update state here as the socket will broadcast the change
      console.log("Task updated:", updatedTaskFromBackend);

      return updatedTaskFromBackend;
    } catch (error) {
      console.error("Failed to update task:", error);
      throw error;
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await axiosInstance.delete(`/tasks/${taskId}`);
      console.log("Task deleted:", taskId);

      // No need to update state here as the socket will broadcast the change
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  const dropAnimation: DropAnimation = {
    ...defaultDropAnimation,
  };

  const task = activeTaskId ? getTaskById(tasks, activeTaskId) : null;

  // Handler for opening the invite modal
  const handleOpenInviteModal = () => {
    setInviteModalOpen(true);
  };

  return (
    <div>
      <div className="board-section-header">
        <h2>{selectedProject.name}</h2>
        <div style={{ display: "flex", gap: "20px" }}>
          <Button
            variant="filled"
            color="rgb(24, 33, 109)"
            size="md"
            onClick={() => setCollaboratorsModalOpen(true)}
          >
            Show Collaborators
          </Button>
          <Button
            variant="filled"
            color="rgb(24, 33, 109)"
            size="md"
            onClick={handleOpenInviteModal}
          >
            Invite friends
          </Button>
        </div>
      </div>
      <div className="board-section-container">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {Object.keys(boardSections).map((boardSectionKey) => (
            <BoardSection
              key={boardSectionKey}
              id={boardSectionKey}
              title={boardSectionKey}
              tasks={boardSections[boardSectionKey]}
              project_id={selectedProject.id}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onAddTask={handleAddTask}
              collaborators={collaborators}
            />
          ))}
          <DragOverlay dropAnimation={dropAnimation}>
            {task ? (
              <TaskItem
                onUpdate={handleUpdateTask}
                onDelete={handleDeleteTask}
                task={task}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <Modal
        opened={collaboratorsModalOpen}
        onClose={() => setCollaboratorsModalOpen(false)}
        title="Project Collaborators"
      >
        {collaborators.length === 0 ? (
          <span>No collaborators found.</span>
        ) : (
          collaborators.map((collaborator) => (
            <span
              key={collaborator.id}
              style={{ display: "flex", alignItems: "center" }}
            >
              <Avatar
                src="https://www.flaticon.com/free-icon/user_149071?term=avatar&page=1&position=1&origin=tag&related_id=149071"
                radius="xl"
                style={{ marginRight: "10px" }}
              />
              {collaborator.name}
              {collaborator.id === currentUser.id && " (you)"}
            </span>
          ))
        )}
      </Modal>

      {/* Render the InviteFriendsModal */}
      <InviteFriendsModal
        opened={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        projectId={selectedProject.id}
        userId={currentUser.id}
      />
    </div>
  );
};

export default BoardSectionList;
