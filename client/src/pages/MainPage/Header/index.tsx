import {
  Burger,
  Container,
  Group,
  Avatar,
  Text,
  UnstyledButton,
  Menu,
} from "@mantine/core";
import { IconChevronRight, IconLogout } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import headerClasses from "./HeaderSimple.module.css";
import userClasses from "./UserButton.module.css";
import logo from "../../../assets/img/kanboard-high-resolution-logo-transparent.png";
import { useAuth0 } from "@auth0/auth0-react";
import "./styles.css";

export function HeaderSimple() {
  const [opened, { toggle }] = useDisclosure(false);
  const { user, logout } = useAuth0();

  return (
    <header className={headerClasses.header}>
      <Container
        style={{ width: "100%", margin: 0, maxWidth: "100%" }}
        className={headerClasses.inner}
      >
        <Group gap={0}>
          <img className="logo" src={logo} />
          <span className="logo-title">anboard</span>
        </Group>

        <Menu width={200}>
          <Menu.Target>
            <UnstyledButton className={userClasses.user}>
              <Group>
                <Avatar
                  src="https://www.flaticon.com/free-icon/user_149071?term=avatar&page=1&position=1&origin=tag&related_id=149071"
                  radius="xl"
                />

                <div style={{ flex: 1 }}>
                  <Text size="sm" fw={500}>
                    {user?.name}
                  </Text>

                  <Text c="dimmed" size="xs">
                    {user?.email}
                  </Text>
                </div>

                <IconChevronRight size={14} stroke={1.5} />
              </Group>
            </UnstyledButton>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Label>Account</Menu.Label>
            <Menu.Divider />
            <Menu.Item
              onClick={() =>
                logout({
                  logoutParams: { returnTo: window.location.origin },
                })
              }
              color="red"
              leftSection={<IconLogout size={14} />}
            >
              Logout
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
        <Burger opened={opened} onClick={toggle} hiddenFrom="xs" size="sm" />
      </Container>
    </header>
  );
}
