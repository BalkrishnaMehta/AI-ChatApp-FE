import Image from "next/image";
import { formatTime, formatMessageTime } from "@/app/utils/formatMessageTime";
import User from "@/models/User";

interface ChatHeaderProps {
  receiver: User;
  onMenuClick?: () => void;
  activeUsers: string[];
  userLastActive?: string | null;
}

export function ChatHeader({
  receiver,
  onMenuClick,
  activeUsers,
  userLastActive,
}: ChatHeaderProps) {
  const getUserStatus = () => {
    if (activeUsers.includes(receiver?.id || "")) return "online";

    const lastActive = userLastActive || receiver?.lastActive;
    if (!lastActive) return "offline";

    const lastActiveDate = new Date(lastActive);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (lastActiveDate.toDateString() === now.toDateString()) {
      return `last seen at ${formatTime(lastActive)}`;
    }

    if (lastActiveDate.toDateString() === yesterday.toDateString()) {
      return "last seen Yesterday";
    }

    return `last seen at ${formatMessageTime(lastActive)}`;
  };

  return (
    <div className="flex items-center pb-4 space-x-6 border-b-2 border-gray-300">
      {onMenuClick && (
        <button
          onClick={onMenuClick}
          className="p-2 hover:bg-gray-100 rounded-lg">
          ←
        </button>
      )}
      <Image
        className="w-10 h-10 rounded-md"
        src={
          receiver.profilePic ||
          "https://res.cloudinary.com/dt3japg4o/image/upload/v1733470742/samples/man-portrait.jpg"
        }
        height={40}
        width={40}
        alt="avatar"
      />
      <div>
        <h1 className="font-bold text-lg">{receiver?.name}</h1>
        {userLastActive && (
          <p className="text-sm text-gray-500">{getUserStatus()}</p>
        )}
      </div>
    </div>
  );
}
