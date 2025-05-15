import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type SortableTaskItemProps = {
  children: React.ReactNode;
  id: number;
};

const SortableTaskItem = ({ children, id }: SortableTaskItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* Clone and inject dragHandleProps */}
      {children && typeof children === "object" && "props" in children
        ? {
            ...children,
            props: {
              ...(typeof children.props === "object" && children.props !== null
                ? children.props
                : {}),
              dragHandleProps: { ...attributes, ...listeners },
            },
          }
        : children}
    </div>
  );
};

export default SortableTaskItem;
