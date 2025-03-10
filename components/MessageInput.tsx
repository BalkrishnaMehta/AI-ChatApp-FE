import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { EmojiPicker } from "./EmojiPicker";
import { SendHorizonal } from "lucide-react";

interface MessageInputProps {
  message: string;
  onMessageChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onEmojiSelect: (native: string) => void;
  onSkinToneSelect: (shortcode: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}

export function MessageInput({
  message,
  onMessageChange,
  onEmojiSelect,
  onSkinToneSelect,
  onSubmit,
}: MessageInputProps) {
  const [showPicker, setShowPicker] = useState(false);

  const handleEmojiSelect = (native: string) => {
    onEmojiSelect(native);
    setShowPicker(false);
  };

  const handleSkinToneSelect = (shortcode: string) => {
    onSkinToneSelect(shortcode);
    setShowPicker(false);
  };

  useEffect(() => {
    const lastWord = message.split(" ").pop() || "";
    if (
      (lastWord.startsWith(":") && lastWord.length > 1) ||
      (lastWord && /^\p{Emoji}/u.test(lastWord))
    ) {
      setShowPicker(true);
    } else {
      setShowPicker(false);
    }
  }, [message]);

  return (
    <form className="flex space-x-4 mt-4" onSubmit={onSubmit}>
      <div className="relative w-full">
        <input
          className={`w-full p-4 rounded-2xl transition-all border-2 focus:outline-none focus:ring-2 border-[#EBEBE6] focus:border-[#294B29] focus:ring-[#DBE7C9] ${
            showPicker ? "rounded-tl-none rounded-tr-none" : ""
          }`}
          placeholder="Type your message here"
          name="content"
          onChange={onMessageChange}
          value={message}
        />
        {showPicker && (
          <EmojiPicker
            inputValue={message}
            onEmojiSelect={handleEmojiSelect}
            onSkinToneSelect={handleSkinToneSelect}
            onClose={() => setShowPicker(false)}
          />
        )}
      </div>
      <button className="absolute right-[2.1rem] bottom-[2.1rem] text-2xl text-green-700 px-3 py-2 rounded-lg hover:text-green-900">
        <SendHorizonal />
        {/* ➤ */}
      </button>
    </form>
  );
}
