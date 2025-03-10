import { useRef, useState } from "react";
import MessageBubble from "./MessageBubble";
import { formatDateHeader } from "@/app/utils/formatMessageTime";
import Message from "@/models/Message";
import { motion } from "framer-motion";
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Circle,
  CircleX,
  LoaderCircle,
  MessageSquare,
} from "lucide-react";
import Log from "@/models/Log";

interface GroupedMessages {
  date: string;
  messages: Message[];
}

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  isGenerating?: boolean;
  isStreaming?: boolean;
  userId: string;
  receiverName: string;
  smartReplies?: string[];
  logs?: Log;
  onSmartReplyClick?: (reply: string) => void;
}

export function MessageList({
  messages,
  isLoading,
  isGenerating,
  isStreaming,
  userId,
  receiverName,
  logs,
  smartReplies = [],
  onSmartReplyClick,
}: MessageListProps) {
  const BOT_ID = "869edb54-d299-4821-bfd6-8a612f26acc3";
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [expandedStepIndex, setExpandedStepIndex] = useState<number | null>(
    null
  );

  const toggleStepExpansion = (index: number) => {
    setExpandedStepIndex(expandedStepIndex === index ? null : index);
  };

  const allMessages = [
    ...messages,
    ...smartReplies.map((reply, index) => ({
      id: `smart-reply-${index}`,
      content: reply,
      senderId: userId,
      receiverId: "",
      createdAt: new Date().toISOString(),
      isTemporary: true,
    })),
  ];

  if (
    isGenerating &&
    !isStreaming &&
    logs &&
    logs.steps.length === 0 &&
    logs.results.length === 0
  ) {
    allMessages.push({
      id: `bot-generating-${allMessages.length}`,
      content: "Generating...",
      senderId: BOT_ID,
      receiverId: userId,
      createdAt: new Date().toISOString(),
      isTemporary: true,
    });
  }

  const groupMessagesByDate = (messages: Message[]): GroupedMessages[] => {
    const groups: { [key: string]: Message[] } = {};

    messages.forEach((message) => {
      const date = new Date(message.createdAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });

    return Object.entries(groups)
      .map(([date, messages]) => ({
        date,
        messages,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const groupedMessages = groupMessagesByDate(allMessages);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <motion.div
          animate={{ scale: 2 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
          <MessageSquare className="w-8 h-8 text-blue-500" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {groupedMessages.length === 0 ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-center text-gray-500">
            Start chatting with {receiverName}!
          </p>
        </div>
      ) : (
        <>
          {groupedMessages.map((group) => (
            <div key={group.date}>
              <div className="flex justify-center mb-4">
                <span className="bg-gray-100 px-4 py-1 text-sm text-gray-600">
                  {formatDateHeader(group.date)}
                </span>
              </div>
              <div className="flex flex-col gap-4">
                {group.messages.map(
                  (message, index) =>
                    message.content && (
                      <MessageBubble
                        onClick={() => {
                          if (message.isTemporary) {
                            onSmartReplyClick?.(message.content);
                          }
                        }}
                        isTemporary={message.isTemporary}
                        key={message.id || index}
                        isSent={message.senderId === userId}
                        createdAt={message.createdAt}>
                        {message.content}
                      </MessageBubble>
                    )
                )}
                {logs && logs.steps.length !== 0 && !isStreaming && (
                  <MessageBubble
                    isSent={false}
                    createdAt={new Date().toISOString()}>
                    {logs.steps.map((step, index) => {
                      const stepKey = Object.keys(step)[0];
                      const stepValue = step[stepKey];

                      const resultExists = logs.results.some(
                        (result) => Object.keys(result)[0] === stepKey
                      );

                      const resultForStep = logs.results.find(
                        (result) => Object.keys(result)[0] === stepKey
                      );

                      const isCompleted = resultExists;
                      const isCurrentStep = index === logs.results.length;
                      const hasError = logs.error && isCurrentStep;

                      return (
                        <div
                          key={`step-${index}`}
                          className="border-l-2 pl-2 py-1 ml-1 relative">
                          <div className="absolute -left-1.5 top-3">
                            {hasError ? (
                              <CircleX className="w-3 h-3  text-red-500" />
                            ) : isCurrentStep ? (
                              <LoaderCircle className="w-3 h-3 animate-spin text-blue-500" />
                            ) : isCompleted ? (
                              <CheckCircle className="w-3 h-3 text-green-500" />
                            ) : (
                              <Circle className="w-3 h-3" />
                            )}
                          </div>
                          <div
                            className="cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              (resultExists || hasError) &&
                                toggleStepExpansion(index);
                            }}>
                            <div className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded-xl space-x-8">
                              <div
                                className={`font-medium ${
                                  isCurrentStep
                                    ? hasError
                                      ? "text-red-500"
                                      : "text-blue-500"
                                    : ""
                                }`}>
                                <p className="text-sm font-semibold">
                                  {stepValue}
                                </p>
                              </div>
                              {expandedStepIndex === index ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </div>
                          </div>

                          {expandedStepIndex === index && (
                            <div className="mt-2">
                              <div className="mt-1 text-xs bg-gray-50 px-4 py-2 rounded-xl">
                                {hasError && logs.error ? (
                                  <>
                                    <div className="font-medium text-red-600">
                                      Error:
                                    </div>
                                    {logs.error.message}
                                  </>
                                ) : resultForStep ? (
                                  <>
                                    <div className="font-medium text-green-600">
                                      Result:
                                    </div>
                                    {resultForStep[stepKey]}
                                  </>
                                ) : null}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </MessageBubble>
                )}
              </div>
            </div>
          ))}
        </>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
