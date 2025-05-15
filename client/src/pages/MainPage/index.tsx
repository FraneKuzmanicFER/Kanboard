import React, { useEffect, useState } from "react";
import "./styles.css";
import { HeaderSimple } from "./Header";
import { NavbarSimpleColored } from "./Sidebar/NavbarSimpleColored";
import Projects from "../../components/Projects";
import Friends from "../../components/Friends";
import BoardSectionList from "../../components/Board/BoardSectionList";
import { useAuth0 } from "@auth0/auth0-react";
import axiosInstance from "../../services/axios";

const MainPage: React.FC = () => {
  const [activePage, setActivePage] = useState("Projects");
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const { user, isAuthenticated } = useAuth0();

  useEffect(() => {
    if (isAuthenticated && user) {
      const saveUserToDatabase = async () => {
        try {
          await axiosInstance.post("/users", {
            id: user.sub,
            name: user.name,
            email: user.email,
          });
        } catch (error) {
          console.error("Error saving user to database:", error);
        }
      };

      saveUserToDatabase();
    }
  }, [isAuthenticated, user]);

  const renderContent = () => {
    switch (activePage) {
      case "Projects":
        return (
          <Projects
            setActivePage={setActivePage}
            setSelectedProject={setSelectedProject}
          />
        );
      case "Friends":
        return <Friends />;
      case "Board":
        return (
          <BoardSectionList
            selectedProject={selectedProject}
            currentUser={{ id: user?.sub ? user?.sub : "" }}
          />
        );
      default:
        return <div>Page not found</div>;
    }
  };

  return (
    <div>
      <HeaderSimple />
      <div className="main-layout">
        <NavbarSimpleColored
          setActivePage={setActivePage}
          activePage={activePage}
        />
        <div className="main-content">{renderContent()}</div>
      </div>
    </div>
  );
};

export default MainPage;
