import { FormEvent, useEffect, useRef, useState, useCallback } from "react";
import {
  AlignJustify,
  Globe,
  LoaderCircle,
  SendHorizonal,
  Terminal,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import suggestedTasks from "@/app/utils/suggestedTasks";
import Log from "@/models/Log";
import User from "@/models/User";
import InputWithBlanks from "./InputWithBlanks";
import SuggestionCarousel from "./SuggestionCarousel";
import Message from "@/models/Message";

const neuron: User = {
  id: "869edb54-d299-4821-bfd6-8a612f26acc3",
  email: "neuron123@gmail.com",
  name: "Neuron",
  profilePic:
    "https://res.cloudinary.com/dt3japg4o/image/upload/v1740372567/wmremove-transformed-removebg-preview_qcxlkt.png",
  lastActive: "",
};

interface NeuronChatProps {
  setIsSidebarOpen: (isOpen: boolean) => void;
}

const NeuronChat = ({ setIsSidebarOpen }: NeuronChatProps) => {
  const { authState } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef(new AbortController());

  const [executionSteps, setExecutionSteps] = useState<Log>({
    steps: [],
    results: [],
    error: null,
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [method, setMethod] = useState<"llm" | "search" | "execute">("llm");
  const [input, setInput] = useState({
    content: "",
    blanks: {} as Record<string, string>,
  });
  const [showTemplate, setShowTemplate] = useState(false);

  const buildQuery = useCallback(() => {
    return showTemplate
      ? input.content.replace(/{(\w+)}/g, (_, key) => input.blanks[key] || "")
      : input.content;
  }, [input, showTemplate]);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/conversations/bot/messages`,
        { headers: { Authorization: `Bearer ${authState.accessToken}` } }
      );
      setMessages(await res.json());
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  }, [authState.accessToken]);

  const handleStreamResponse = useCallback(
    async (response: Response) => {
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const botMessageId = Date.now().toString();
      setMessages((prev) => [
        ...prev,
        {
          id: botMessageId,
          content: "",
          senderId: neuron.id,
          receiverId: authState.user?.id || "",
          createdAt: new Date().toISOString(),
        },
      ]);

      const decoder = new TextDecoder();
      let currentContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\u001D");

        for (const line of lines) {
          if (line.startsWith("log: ")) {
            const parsedLog = JSON.parse(line.slice(5));
            console.log("log: ", parsedLog);
            if (parsedLog.plan) {
              setExecutionSteps(() => {
                return {
                  steps: [
                    ...parsedLog.plan.steps.map((step: string[]) => ({
                      [step[1]]: step[0],
                    })),
                    { format: "Refining raw data into a user friendly format" },
                  ],

                  results: [],
                  error: null,
                };
              });
            } else if (parsedLog.tool) {
              setExecutionSteps((prev) => {
                return {
                  steps: prev?.steps ? [...prev?.steps] : [],
                  results: Object.entries(parsedLog.tool.results).map((val) => {
                    return {
                      [val[0]]: val[1] as string,
                    };
                  }),
                  error: null,
                };
              });
            } else if (parsedLog.solve) {
              setExecutionSteps((prev) => {
                return {
                  steps: [...prev.steps],
                  results: [
                    ...prev.results,
                    { format: parsedLog.solve.result },
                  ],
                  error: null,
                };
              });
            }
          } else if (line.startsWith("data: ")) {
            const data = line.slice(6);
            console.log("data: ", data);

            if (!isStreaming) {
              setIsStreaming(true);
            }

            if (data === "[DONE]") {
              console.log(currentContent);
              setIsStreaming(false);
              setExecutionSteps({ steps: [], results: [], error: null });
              break;
            }

            currentContent += data;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMessageId
                  ? { ...msg, content: currentContent }
                  : msg
              )
            );
          } else if (line.startsWith("error: ")) {
            setExecutionSteps((prev) => ({
              ...prev,
              error: JSON.parse(line.slice(7)),
            }));
          }
        }
      }
    },
    [authState.user?.id]
  );

  const handleSubmit = async (e?: FormEvent) => {
    e && e.preventDefault();
    const query = buildQuery();
    if (!query.trim()) return;
    setShowTemplate(false);
    setInput({ content: "", blanks: {} });
    setMethod("llm");

    controllerRef.current.abort();
    controllerRef.current = new AbortController();

    const userMessage: Message = {
      id: Date.now().toString(),
      content: `${method} ${query}`,
      senderId: authState.user?.id || "",
      receiverId: neuron.id,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsGenerating(true);
    setExecutionSteps({ steps: [], results: [], error: null });

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/neuron`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authState.accessToken}`,
          },
          body: JSON.stringify({ query, method }),
          signal: controllerRef.current.signal,
        }
      );

      if (!response.ok) throw new Error("Network response was not ok");
      await handleStreamResponse(response);
    } catch (error) {
      console.error("Streaming error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    return () => controllerRef.current.abort();
  }, [fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleEnter = (e: KeyboardEvent) =>
      e.key === "Enter" && handleSubmit();
    document.addEventListener("keydown", handleEnter);
    return () => document.removeEventListener("keydown", handleEnter);
  }, [handleSubmit]);

  return (
    <div className="flex flex-col h-full w-full max-h-screen">
      <div className="absolute top-4 left-4 md:hidden">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 hover:bg-gray-100 rounded-lg">
          {/* ☰ */}
          <AlignJustify />
        </button>
      </div>

      <div className="flex flex-col h-full p-4 md:p-6">
        <ChatHeader receiver={neuron} activeUsers={[]} />

        <div className="flex-1 overflow-y-auto px-4 py-2 h-full scrollbar-hide">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <p className="text-xl font-bold">Chat with Neuron 👋</p>
                <p className="text-lg font-semibold">
                  Start a conversation and get instant answers
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col py-4 overflow-y-auto">
              <MessageList
                logs={executionSteps}
                messages={messages}
                isLoading={false}
                isGenerating={isGenerating}
                isStreaming={isStreaming}
                userId={authState.user?.id || ""}
                receiverName={neuron.name}
              />
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="w-full bg-white sticky bottom-0 p-4 border-2 rounded-2xl">
          {method === "execute" && (
            <SuggestionCarousel
              suggestedTasks={suggestedTasks}
              handleSuggestionClick={(content) => {
                setInput((p) => ({ ...p, content }));
                setShowTemplate(true);
              }}
            />
          )}

          <form onSubmit={handleSubmit}>
            <div
              className={`flex flex-col gap-3 ${
                method === "execute" ? "pt-4" : ""
              }`}>
              <div className="relative w-full">
                {showTemplate ? (
                  <InputWithBlanks
                    template={input.content}
                    onValuesChange={(blanks) =>
                      setInput((p) => ({ ...p, blanks }))
                    }
                    onClose={() => {
                      setInput({ content: "", blanks: {} });
                      setShowTemplate(false);
                    }}
                  />
                ) : (
                  <input
                    value={input.content}
                    onChange={(e) =>
                      setInput((p) => ({ ...p, content: e.target.value }))
                    }
                    placeholder="Ask anything"
                    className="w-full p-4 rounded-2xl transition-all border-2 focus:outline-none focus:ring-2 border-[#EBEBE6] focus:border-[#294B29] focus:ring-[#DBE7C9]"
                  />
                )}
              </div>

              <div className="flex justify-between items-center">
                <div className="flex gap-3">
                  <MethodButton
                    active={method === "search"}
                    onClick={() => {
                      if (method === "execute") {
                        setShowTemplate(false);
                        setInput({ content: "", blanks: {} });
                      }
                      setMethod((m) => (m === "search" ? "llm" : "search"));
                    }}
                    icon={<Globe size={16} />}
                    label="Search"
                  />
                  <MethodButton
                    active={method === "execute"}
                    onClick={() => {
                      if (method === "execute") {
                        setShowTemplate(false);
                        setInput({ content: "", blanks: {} });
                      }
                      setMethod((m) => (m === "execute" ? "llm" : "execute"));
                    }}
                    icon={<Terminal size={16} />}
                    label="Execute"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isGenerating}
                  className="text-green-700 hover:text-green-900 p-2">
                  {isGenerating ? (
                    <LoaderCircle className="animate-spin" size={24} />
                  ) : (
                    <SendHorizonal size={24} />
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const MethodButton = ({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`p-3 border rounded-2xl flex items-center gap-2 transition-colors ${
      active
        ? "text-green-700 border-green-500 bg-green-50"
        : "hover:bg-gray-50"
    }`}>
    {icon}
    <span className="text-sm">{label}</span>
  </button>
);

export default NeuronChat;
