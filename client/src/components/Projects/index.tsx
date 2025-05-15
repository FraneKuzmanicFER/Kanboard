import React, { useEffect, useState } from "react";
import "./styles.css";
import axiosInstance from "../../services/axios";
import { useAuth0 } from "@auth0/auth0-react";
import {
  ActionIcon,
  Button,
  Card,
  Menu,
  Modal,
  Text,
  TextInput,
} from "@mantine/core";
import { IconDotsVertical, IconTrash } from "@tabler/icons-react";

interface Project {
  id: number;
  name: string;
  isCreator: boolean;
}

interface ProjectsProps {
  setSelectedProject: (project: Project | null) => void;
  setActivePage: (page: string) => void;
}

const Projects: React.FC<ProjectsProps> = ({
  setSelectedProject,
  setActivePage,
}) => {
  const { user } = useAuth0();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  useEffect(() => {
    if (user)
      axiosInstance
        .get(`/projects/${user.sub}`)
        .then((response) => {
          setProjects(response.data);
        })
        .catch((error) => {
          console.error("There was an error fetching the projects!", error);
        });
  }, []);

  const handleCreateProject = () => {
    if (newProjectName.trim() !== "") {
      axiosInstance
        .post(`/projects/${user?.sub}`, { name: newProjectName })
        .then((response) => {
          setProjects([...projects, response.data]);
          setNewProjectName(""); // Clear the input field
          setIsModalOpen(false); // Close the modal after creating the project
        })
        .catch((error) => {
          console.error("Error creating project:", error);
        });
    } else {
      console.error("Project name cannot be empty!");
    }
  };

  const handleDelete = async (projectId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await axiosInstance.delete(`/projects/${projectId}`);
      setProjects((prevProjects) =>
        prevProjects.filter((project) => project.id !== projectId)
      );
      alert("Project deleted successfully!");
    } catch (error) {
      console.error("There was an error deleting the project!", error);
    }
  };

  const handleLeave = async (projectId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await axiosInstance.delete(`/projects/${projectId}/leave/${user?.sub}`);
      setProjects((prevProjects) =>
        prevProjects.filter((project) => project.id !== projectId)
      );
      alert("Project left successfully!");
    } catch (error) {
      console.error("There was an error leaving the project!", error);
    }
  };

  const handleCardClick = (project: Project) => {
    setSelectedProject(project);
    setActivePage("Board");
  };

  return (
    <div className="projects-container">
      <Card
        shadow="sm"
        padding="lg"
        radius="md"
        withBorder
        className="project-card create-card"
        onClick={() => setIsModalOpen(true)}
      >
        <Text ta="center" fw={700}>
          + Create New Project
        </Text>
      </Card>

      <Modal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Project"
        size="xs"
      >
        <div style={{ position: "relative" }}>
          <TextInput
            label="Project Name"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Enter project name"
            required
          />
          <Button
            onClick={handleCreateProject}
            fullWidth
            style={{ marginTop: "1rem" }}
            color="rgb(24, 33, 109)"
          >
            Create Project
          </Button>
        </div>
      </Modal>

      {projects.map((project) => (
        <Card
          key={project.id}
          shadow="sm"
          padding="lg"
          radius="md"
          withBorder
          className="project-card"
          onClick={() => handleCardClick(project)}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Text style={{ marginRight: 10 }} ta="center" fw={700}>
              {project.name}
            </Text>
            <Menu>
              <Menu.Target>
                <ActionIcon
                  color="rgb(24, 33, 109)"
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconDotsVertical />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                {project.isCreator ? (
                  <Menu.Item onClick={(e) => handleDelete(project.id, e)}>
                    <IconTrash style={{ marginRight: "0.5rem" }} />
                    Delete Project
                  </Menu.Item>
                ) : (
                  <Menu.Item onClick={(e) => handleLeave(project.id, e)}>
                    <IconTrash style={{ marginRight: "0.5rem" }} />
                    Leave Project
                  </Menu.Item>
                )}
              </Menu.Dropdown>
            </Menu>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default Projects;
