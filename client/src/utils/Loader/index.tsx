import { Loader } from "@mantine/core";

const Loading: React.FC = () => {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Loader color="blue" size="xl" />
    </div>
  );
};

export default Loading;
