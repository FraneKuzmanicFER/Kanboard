import { useState, useEffect } from "react";
import {
  Modal,
  Button,
  Checkbox,
  Group,
  Text,
  Stack,
  Loader,
} from "@mantine/core";
import axiosInstance from "../../services/axios";

interface Friend {
  id: string;
  name: string;
  email: string;
}

interface InviteFriendsModalProps {
  opened: boolean;
  onClose: () => void;
  projectId: number;
  userId: string; // Current user ID
}

const InviteFriendsModal = ({
  opened,
  onClose,
  projectId,
  userId,
}: InviteFriendsModalProps) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch friends list when modal opens
  useEffect(() => {
    const fetchFriends = async () => {
      if (!opened) return;

      setLoading(true);
      setError(null);
      try {
        const response = await axiosInstance.get(`/users/${userId}/friends`);
        setFriends(response.data);
      } catch (err) {
        console.error("Failed to fetch friends:", err);
        setError("Failed to load friends list. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, [opened, userId]);

  const handleToggleFriend = (friendId: string) => {
    setSelectedFriends((prev) => {
      if (prev.includes(friendId)) {
        return prev.filter((id) => id !== friendId);
      } else {
        return [...prev, friendId];
      }
    });
  };

  const handleInviteFriends = async () => {
    if (selectedFriends.length === 0) {
      setError("Please select at least one friend to invite.");
      return;
    }

    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      // Send collaboration requests for each selected friend
      const requests = selectedFriends.map((friendId) =>
        axiosInstance.post(`/users/${userId}/send-request`, {
          email: friends.find((friend) => friend.id === friendId)?.email,
          type: "collab",
          project_id: projectId,
        })
      );

      await Promise.all(requests);
      setSuccess("Invitation(s) sent successfully!");
      setSelectedFriends([]);

      // Close modal after a delay
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 2000);
    } catch (err: any) {
      console.error("Failed to send invitations:", err);
      setError(
        err.response?.data?.error ||
          "Failed to send invitations. Please try again."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Invite Friends to Collaborate"
      size="md"
      centered
    >
      {loading ? (
        <div
          style={{ display: "flex", justifyContent: "center", padding: "20px" }}
        >
          <Loader />
        </div>
      ) : friends.length === 0 ? (
        <Text>
          You don't have any friends yet. Add friends to invite them to your
          project.
        </Text>
      ) : (
        <Stack>
          {error && <Text color="red">{error}</Text>}
          {success && <Text color="green">{success}</Text>}

          <Text size="sm" color="dimmed">
            Select friends to invite to this project:
          </Text>

          {friends.map((friend) => (
            <Checkbox
              key={friend.id}
              label={`${friend.name} (${friend.email})`}
              checked={selectedFriends.includes(friend.id)}
              onChange={() => handleToggleFriend(friend.id)}
              color="rgb(24, 33, 109)"
            />
          ))}

          <Group mt="md">
            <Button
              variant="outline"
              color="rgb(24, 33, 109)"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInviteFriends}
              loading={sending}
              disabled={selectedFriends.length === 0}
              color="rgb(24, 33, 109)"
            >
              Invite Selected
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
};

export default InviteFriendsModal;
