import { Button } from "@mantine/core";
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
import { useEffect, useState } from "react";
import "./styles.css";
import axiosInstance from "../../services/axios";

interface Project {
  id: number;
  name: string;
}

interface BoardSectionListProps {
  selectedProject: Project;
}

const BoardSectionList: React.FC<BoardSectionListProps> = ({
  selectedProject,
}) => {
  const [boardSections, setBoardSections] = useState<BoardSectionsType>({});
  const [tasks, setTasks] = useState<Task[]>([]);

  const [activeTaskId, setActiveTaskId] = useState<null | number>(null);

  const fetchTasks = async (projectId: number): Promise<Task[]> => {
    const response = await axiosInstance.get(`/tasks/${projectId}`);
    return response.data;
  };

  useEffect(() => {
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
  }, [selectedProject.id]);

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
    sectionId: string,
    newTask: Omit<Task, "id">
  ) => {
    try {
      const response = await axiosInstance.post("/tasks", newTask);
      const createdTask: Task = response.data;

      setBoardSections((prevSections) => ({
        ...prevSections,
        [sectionId]: [...prevSections[sectionId], createdTask],
      }));

      setTasks((prevTasks) => [...prevTasks, createdTask]);
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

      setBoardSections((prevSections) => {
        const newSections = { ...prevSections };
        for (const section in newSections) {
          const idx = newSections[section].findIndex(
            (t) => t.id === updatedTaskFromBackend.id
          );
          if (idx !== -1) {
            newSections[section][idx] = updatedTaskFromBackend;
            break;
          }
        }
        return newSections;
      });

      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.id === updatedTaskFromBackend.id ? updatedTaskFromBackend : t
        )
      );
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      // Delete task on backend
      await axiosInstance.delete(`/tasks/${taskId}`);

      // Update local state (remove from board sections and task list)
      setBoardSections((prevSections) => {
        const newSections = { ...prevSections };
        for (const section in newSections) {
          newSections[section] = newSections[section].filter(
            (task) => task.id !== taskId
          );
        }
        return newSections;
      });

      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  const dropAnimation: DropAnimation = {
    ...defaultDropAnimation,
  };

  const task = activeTaskId ? getTaskById(tasks, activeTaskId) : null;

  return (
    <>
      <div className="board-section-header">
        <h2>{selectedProject.name}</h2>
        <Button variant="filled" color="rgb(24, 33, 109)" size="md">
          Invite member
        </Button>
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
    </>
  );
};

export default BoardSectionList;
