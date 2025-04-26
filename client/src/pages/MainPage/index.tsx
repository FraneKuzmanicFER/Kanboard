import React, { useState } from "react";
import "./styles.css";
import { HeaderSimple } from "./Header";
import { NavbarSimpleColored } from "./Sidebar/NavbarSimpleColored";
import Projects from "../../components/Projects";
import Members from "../../components/Members";

const MainPage: React.FC = () => {
  const [activePage, setActivePage] = useState("Projects");

  const renderContent = () => {
    switch (activePage) {
      case "Projects":
        return <Projects />;
      case "Members":
        return <Members />;
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
