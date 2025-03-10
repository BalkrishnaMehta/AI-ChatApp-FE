import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import Message from "@/models/Message";
import { useAuth } from "@/context/AuthContext";
import User from "@/models/User";
import { useSocket } from "@/context/SocketContext";
import Neuron from "./Neuron";
import { SearchIndex, getEmojiDataFromNative } from "emoji-mart";
import { ChatHeader } from "./ChatHeader";
import { MessageInput } from "./MessageInput";
import { MessageList } from "./MessageList";
import Emoji from "@/models/Emoji";

interface MessagesProps {
  conversationId: string | undefined;
  receiver?: User;
  onMenuClick: () => void;
  updateConversationLastMessage: (message: Message) => void;
  onNewConversation: () => Promise<void>;
}

interface SmartRepliesMap {
  [conversationId: string]: string[];
}

export default function Messages({
  conversationId,
  receiver,
  onMenuClick,
  updateConversationLastMessage,
  onNewConversation,
}: MessagesProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [smartRepliesMap, setSmartRepliesMap] = useState<SmartRepliesMap>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { activeUsers, socket } = useSocket();
  const [userLastActive, setUserLastActive] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const { authState } = useAuth();

  useEffect(() => {
    setMessages([]);
    setUserLastActive(receiver?.lastActive || null);
  }, [conversationId, receiver?.lastActive]);

  const fetchMessages = async () => {
    if (!conversationId || !receiver?.id) {
      setMessages([]);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/conversations/${conversationId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${authState.accessToken}`,
          },
        }
      );
      const data: Message[] = await res.json();
      setMessages(data);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAIReplies = async () => {
    setSmartRepliesMap((prev) => ({
      ...prev,
      [conversationId!]: [],
    }));
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/smart-replies`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authState.accessToken}`,
          },
          method: "POST",
          body: JSON.stringify({ conversationId }),
        }
      );
      const data: string[] = await res.json();
      console.log(data);
      setSmartRepliesMap((prev) => ({
        ...prev,
        [conversationId!]: data,
      }));
    } catch (error) {
      console.error("Failed to fetch AI replies:", error);
      setSmartRepliesMap((prev) => ({
        ...prev,
        [conversationId!]: [],
      }));
    }
  };

  const handleSmartReplyClick = (reply: string) => {
    setMessage(reply);
    setSmartRepliesMap((prev) => ({
      ...prev,
      [conversationId!]: [],
    }));
  };

  useEffect(() => {
    fetchMessages();
  }, [conversationId, receiver?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages]);

  useEffect(() => {
    const handleSocketMessage = (incomingMessage: Message) => {
      if (!receiver) return;
      if (
        conversationId &&
        (incomingMessage.senderId === receiver.id ||
          incomingMessage.receiverId === receiver.id)
      ) {
        setMessages((prev) => [...prev, incomingMessage]);
        updateConversationLastMessage(incomingMessage);
        fetchAIReplies();
      }
    };

    socket?.on("message", handleSocketMessage);
    return () => {
      socket?.off("message", handleSocketMessage);
    };
  }, [socket, conversationId, receiver, updateConversationLastMessage]);

  const handleMessageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const wordsArray = inputValue.split(" ");
    const lastWord = wordsArray[wordsArray.length - 1];

    const emojiMatch = lastWord.match(/^:([a-zA-Z0-9-_]+):$/);
    if (emojiMatch) {
      try {
        const emojiResult = await search(emojiMatch[1]);
        if (emojiResult.length > 0) {
          wordsArray[wordsArray.length - 1] = emojiResult[0].native;
          setMessage(wordsArray.join(" "));
          return;
        }
      } catch (error) {
        console.error("Error fetching emoji:", error);
      }
    }

    if (lastWord && /^\p{Emoji}/u.test(lastWord)) {
      const colonIndex = lastWord.indexOf(":");
      const data = lastWord.slice(colonIndex + 1);

      if (colonIndex > 0 && data.includes(":")) {
        if (data.includes("skin-tone")) {
          try {
            const baseEmoji = Array.from(lastWord)[0];
            const emojiData = await getEmojiDataFromNative(baseEmoji);
            const skinToneLevel = parseInt(data.charAt(data.length - 2)) || 1;
            const emojiResult = await search(emojiData.name, skinToneLevel);

            if (emojiResult.length > 0) {
              const messageWithoutLastEmoji = message.slice(
                0,
                -lastWord.length
              );
              setMessage(messageWithoutLastEmoji + emojiResult[0].native);
            }
          } catch (error) {
            console.error("Error applying skin tone:", error);
            setMessage(e.target.value);
          }
          return;
        } else {
          const emojiResult = await search(data.slice(0, data.length - 1));
          setMessage(message.replace(/:(\S*)$/, "") + emojiResult[0].native);
          return;
        }
      }
    }

    setMessage(e.target.value);
  };

  const handleEmojiSelect = (native: string) => {
    setMessage(message.replace(/:(\S*)$/, "") + native);
  };

  const handleSkinToneSelect = async (skinToneCode: string) => {
    const wordsArray = message.split(" ");
    const lastWord = wordsArray[wordsArray.length - 1];

    try {
      const emojiData = await getEmojiDataFromNative(Array.from(lastWord)[0]);
      const skinToneIndex = parseInt(skinToneCode.slice(-2)) - 1;

      const updatedEmoji = await search(emojiData.name, skinToneIndex);
      wordsArray[wordsArray.length - 1] = updatedEmoji[0]?.native || lastWord;
    } catch (error) {
      wordsArray[wordsArray.length - 1] = Array.from(lastWord)[0];
      console.error("Error fetching emoji with skin tone:", error);
    }

    setMessage(wordsArray.join(" "));
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setSmartRepliesMap((prev) => ({
      ...prev,
      [conversationId!]: [],
    }));

    if (!receiver?.id) return;

    const formData = new FormData(event.target as HTMLFormElement);
    const content = formData.get("content") as string;

    if (!content.trim()) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authState.accessToken}`,
          },
          body: JSON.stringify({
            content,
            receiverId: receiver.id,
          }),
        }
      );

      if (response.ok) {
        const newMessage = await response.json();
        setMessages((prev) => [...prev, newMessage]);
        updateConversationLastMessage(newMessage);
        if (!conversationId) {
          await onNewConversation();
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  async function search(value: string, skin: number = 0): Promise<Emoji[]> {
    const emojis = await SearchIndex.search(value);
    const results = emojis.map((emoji: { skins: Emoji[] }) => ({
      native: emoji.skins[skin].native,
      shortcodes: emoji.skins[skin].shortcodes,
    }));
    return results;
  }

  if (!receiver?.id) {
    return <Neuron setIsSidebarOpen={onMenuClick} />;
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-6">
      <ChatHeader
        receiver={receiver}
        onMenuClick={onMenuClick}
        activeUsers={activeUsers}
        userLastActive={userLastActive}
      />
      <div className="flex-1 overflow-y-auto py-8 scrollbar-hide">
        <MessageList
          messages={messages}
          isLoading={isLoading}
          userId={authState.user?.id || ""}
          receiverName={receiver.name}
          smartReplies={smartRepliesMap[conversationId!] || []}
          onSmartReplyClick={handleSmartReplyClick}
        />
        <div ref={messagesEndRef} />
      </div>
      <MessageInput
        message={message}
        onMessageChange={handleMessageChange}
        onEmojiSelect={handleEmojiSelect}
        onSkinToneSelect={handleSkinToneSelect}
        onSubmit={sendMessage}
      />
    </div>
  );
}
