import { formatTime } from "@/app/utils/formatMessageTime";
import { Bot, Globe, Sparkles, Terminal } from "lucide-react";
import React, { JSX } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MessageBubbleProps {
  isSent: boolean;
  isTemporary?: boolean;
  createdAt: string;
  onClick?: () => void;
  children: React.ReactNode | string;
}

export default function MessageBubble({
  isSent,
  isTemporary,
  createdAt,
  onClick,
  children,
}: MessageBubbleProps) {
  const isShortMessage = React.isValidElement(children)
    ? false
    : typeof children === "string" && children.length < 30;

  const icons: { [key: string]: JSX.Element } = {
    search: <Globe className="w-6 h-6" />,
    execute: <Terminal className="w-6 h-6" />,
    llm: <Bot className="w-6 h-6" />,
  };

  return (
    <div
      className={`flex ${isSent ? "justify-end" : "justify-start"}`}
      onClick={onClick}>
      <div className={`max-w-[65%] min-w-[60px] ${isSent ? "pr-3" : "pl-3"}`}>
        <div
          className={`p-3 rounded-xl relative ${
            isSent
              ? `${
                  isTemporary
                    ? "bg-gradient-to-r from-purple-500 to-blue-500 cursor-pointer hover:shadow-lg"
                    : "bg-blue-500"
                } text-white`
              : "bg-gray-100 text-gray-800"
          }`}>
          <div
            className={`${
              isSent
                ? "-right-2 border-b-blue-500"
                : "-left-2 border-b-gray-100"
            } top-0 absolute w-0 h-0 border-l-[10px] border-r-[10px] border-b-[10px] border-transparent rotate-180`}
          />
          <div
            className={`${
              isShortMessage ? "flex items-center gap-4" : "pb-6"
            }`}>
            {isTemporary ? (
              <span className="break-words flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                {children}
              </span>
            ) : (
              <div className="break-words flex flex-col">
                {typeof children === "string" ? (
                  icons[children.split(" ")[0]] ? (
                    <span className="flex align-top space-x-2">
                      {icons[children.split(" ")[0]]}{" "}
                      <p>{children.split(" ").slice(1).join(" ")}</p>
                    </span>
                  ) : (
                    <Markdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ children }) => (
                          <h1 className="text-2xl font-bold my-4">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-xl font-bold my-3">{children}</h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-lg font-bold my-2">{children}</h3>
                        ),
                        h4: ({ children }) => (
                          <h4 className="text-base font-bold my-2">
                            {children}
                          </h4>
                        ),
                        h5: ({ children }) => (
                          <h5 className="text-sm font-bold my-1">{children}</h5>
                        ),
                        h6: ({ children }) => (
                          <h6 className="text-xs font-bold my-1">{children}</h6>
                        ),
                        pre: ({ children }) => (
                          <pre className="overflow-x-auto break-words whitespace-pre-wrap bg-[#09090b] text-white p-3 rounded-md border border-[#27272a]">
                            {children}
                          </pre>
                        ),
                        code: ({ children }) => (
                          <code className="px-1 py-0.5 rounded text-sm font-mono">
                            {children}
                          </code>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc pl-5 space-y-1">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal pl-5 space-y-1">
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li className="text-black">{children}</li>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-blue-500 pl-3 italic text-gray-600">
                            {children}
                          </blockquote>
                        ),
                        table: ({ children }) => (
                          <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse border border-gray-300">
                              {children}
                            </table>
                          </div>
                        ),
                        thead: ({ children }) => (
                          <thead className="bg-gray-200">{children}</thead>
                        ),
                        th: ({ children }) => (
                          <th className="border border-gray-300 px-4 py-2 text-left font-semibold">
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="border border-gray-300 px-4 py-2">
                            {children}
                          </td>
                        ),
                        tr: ({ children }) => (
                          <tr className="even:bg-gray-100">{children}</tr>
                        ),
                      }}>
                      {children}
                    </Markdown>
                  )
                ) : (
                  <>{children}</>
                )}
              </div>
            )}

            <span
              className={`text-xs self-end ${
                isSent ? "text-slate-200" : "text-gray-500"
              } ${
                isShortMessage
                  ? "whitespace-nowrap"
                  : "absolute bottom-2 right-3"
              }`}>
              {formatTime(createdAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
