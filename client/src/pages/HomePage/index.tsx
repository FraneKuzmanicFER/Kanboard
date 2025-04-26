import { Button } from "@mantine/core";
import image from "../../assets/developer.svg";
import { useAuth0 } from "@auth0/auth0-react";
import "./styles.css";

const HomePage: React.FC = () => {
  const { loginWithRedirect, logout, isAuthenticated, user } = useAuth0();

  return (
    <div className="home-page">
      <header className="home-page-header">
        <h1>Kanboard</h1>
        <nav className="nav-bar">
          <ul className="nav-list">
            <li style={{ listStyle: "none" }}>
              {isAuthenticated ? (
                <>
                  <span style={{ marginRight: 10 }}>Hello {user?.name} </span>
                  <Button
                    onClick={() =>
                      logout({
                        logoutParams: { returnTo: window.location.origin },
                      })
                    }
                    variant="filled"
                    color="rgb(24, 33, 109)"
                    size="lg"
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => loginWithRedirect()}
                  variant="filled"
                  color="rgb(24, 33, 109)"
                  size="lg"
                >
                  Login
                </Button>
              )}
            </li>
          </ul>
        </nav>
      </header>
      <main className="home-page-main">
        <div className="home-page-hero">
          <h2>Your journey from to-do to done starts with Kanboard</h2>
          <p>
            Kanboard is a project management software that helps you visualize
            your tasks and projects and makes your collaboration with colleagues
            easier.
          </p>
        </div>
        <div className="home-page-image-container">
          <img src={image} alt="Kanboard" className="home-page-image" />
        </div>
      </main>
    </div>
  );
};

export default HomePage;
