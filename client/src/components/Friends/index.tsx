import { useEffect, useState } from "react";
import {
  Table,
  Group,
  Text,
  Stack,
  Title,
  Menu,
  ActionIcon,
  Avatar,
  Button,
  Loader,
  Divider,
  Modal,
  TextInput,
  Badge,
} from "@mantine/core";
import { IconBell, IconCheck, IconX } from "@tabler/icons-react";
import axiosInstance from "../../services/axios";
import { useAuth0 } from "@auth0/auth0-react";
import "./styles.css";

interface User {
  id: string;
  name: string;
  email: string;
}

interface FriendRequest {
  id: number;
  from_User_id: string;
  type: "friend" | "collab";
  status: string;
  from_user_name: string;
  from_user_email: string;
  project_id?: number;
  project_name?: string;
}

const Friends = () => {
  const [friends, setFriends] = useState<User[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false); // Track the modal visibility
  const [email, setEmail] = useState(""); // Track email input
  const { user } = useAuth0();
  const currentUserId = user?.sub; // Assuming user.sub is the ID of the current user

  useEffect(() => {
    const loadData = async () => {
      try {
        const [friendsRes, requestsRes] = await Promise.all([
          axiosInstance.get(`/users/${currentUserId}/friends`),
          axiosInstance.get(`/users/${currentUserId}/requests`),
        ]);
        setFriends(friendsRes.data);
        setRequests(requestsRes.data);
      } catch (err) {
        console.error("Error loading friends or requests:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const removeFriend = async (friendId: string) => {
    try {
      await axiosInstance.delete(`/users/${currentUserId}/friends/${friendId}`);
      setFriends(friends.filter((f) => f.id !== friendId));
    } catch (err) {
      console.error("Error removing friend:", err);
    }
  };

  const sendrequest = async (email: string) => {
    try {
      await axiosInstance.post(`/users/${currentUserId}/send-request`, {
        email,
        type: "friend",
      });
      setShowAddFriendModal(false); // Close modal after sending request
      setEmail(""); // Reset email input
    } catch (err) {
      console.error("Error sending request:", err);
    }
  };

  const handleRequest = async (requestId: number, accept: boolean) => {
    try {
      await axiosInstance.post(`/users/${currentUserId}/handle-request`, {
        requestId,
        accept,
      });
      const accepted = requests.find((r) => r.id === requestId);
      setRequests(requests.filter((r) => r.id !== requestId));
      if (accept && accepted && accepted.type === "friend") {
        setFriends((prev) => [
          ...prev,
          {
            id: accepted.from_User_id,
            name: accepted.from_user_name,
            email: accepted.from_user_email,
          },
        ]);
      }
    } catch (err) {
      console.error("Error handling request:", err);
    }
  };

  if (loading) return <Loader />;

  return (
    <Stack>
      <Group className="friends-section-header">
        <Title order={2}>Friends</Title>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <Menu withArrow position="bottom-end">
            <Menu.Target>
              <div style={{ position: "relative" }}>
                <ActionIcon color="rgb(24, 33, 109)">
                  <IconBell />
                </ActionIcon>
                <Badge
                  color="red"
                  variant="filled"
                  size="xs"
                  style={{
                    position: "absolute",
                    bottom: -2,
                    left: -2,
                    borderRadius: "45%",
                    padding: "0 5px",
                    lineHeight: 1.2,
                  }}
                >
                  {requests.length}
                </Badge>
              </div>
            </Menu.Target>
            <Menu.Dropdown>
              {requests.length === 0 ? (
                <Text size="sm" color="dimmed" p="sm">
                  No pending requests
                </Text>
              ) : (
                requests.map((req) => (
                  <Menu.Item key={req.id}>
                    <Group>
                      <Text size="sm">
                        {req.from_user_name} ({req.type}){" "}
                        {req.type === "collab" && ` - ${req.project_name}`}
                      </Text>
                      <Group>
                        <ActionIcon
                          onClick={() => handleRequest(req.id, true)}
                          color="green"
                        >
                          <IconCheck size={16} />
                        </ActionIcon>
                        <ActionIcon
                          onClick={() => handleRequest(req.id, false)}
                          color="red"
                        >
                          <IconX size={16} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  </Menu.Item>
                ))
              )}
            </Menu.Dropdown>
          </Menu>
          <Button
            onClick={() => setShowAddFriendModal(true)}
            color="rgb(24, 33, 109)"
          >
            Add Friend
          </Button>
        </div>
      </Group>

      <Divider size={"md"} label="Your Friends" />

      {friends.length === 0 ? (
        <Text className="no-friends-text">No friends yet.</Text>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Avatar</th>
              <th>Name</th>
              <th>Email</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {friends.map((friend) => (
              <tr key={friend.id}>
                <td style={{ display: "flex", justifyContent: "center" }}>
                  <Avatar
                    src="https://www.flaticon.com/free-icon/user_149071?term=avatar&page=1&position=1&origin=tag&related_id=149071"
                    radius="xl"
                  />
                </td>
                <td>{friend.name}</td>
                <td>{friend.email}</td>
                <td>
                  <Button
                    color="red"
                    size="xs"
                    variant="outline"
                    onClick={() => removeFriend(friend.id)}
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Modal for adding a friend */}
      <Modal
        opened={showAddFriendModal}
        onClose={() => setShowAddFriendModal(false)}
        title="Add a Friend"
      >
        <TextInput
          label="Friend's Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter email address"
        />
        <Button
          onClick={() => sendrequest(email)}
          color="rgb(24, 33, 109)"
          fullWidth
          mt="sm"
        >
          Send Request
        </Button>
      </Modal>
    </Stack>
  );
};

export default Friends;
