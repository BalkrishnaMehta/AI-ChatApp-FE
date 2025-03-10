import { useEffect, useRef, useState } from "react";
import { init, SearchIndex } from "emoji-mart";
import data from "@emoji-mart/data";
import Emoji from "@/models/Emoji";

const skinTones: Emoji[] = [
  { shortcodes: ":skin-tone-2:", native: "🏻" },
  { shortcodes: ":skin-tone-3:", native: "🏼" },
  { shortcodes: ":skin-tone-4:", native: "🏽" },
  { shortcodes: ":skin-tone-5:", native: "🏾" },
  { shortcodes: ":skin-tone-6:", native: "🏿" },
];

interface EmojiPickerProps {
  onEmojiSelect: (native: string) => void;
  onSkinToneSelect: (shortcode: string) => void;
  onClose: () => void;
  inputValue: string;
}

export function EmojiPicker({
  onEmojiSelect,
  onSkinToneSelect,
  onClose,
  inputValue,
}: EmojiPickerProps) {
  const [fuzzyEmojis, setFuzzyEmojis] = useState<Emoji[]>([]);
  const [selectedEmojiIndex, setSelectedEmojiIndex] = useState(-1);
  const emojiListRef = useRef<HTMLUListElement>(null);

  async function search(value: string, skin: number = 0): Promise<Emoji[]> {
    const emojis = await SearchIndex.search(value);
    const results = emojis.map((emoji: { skins: Emoji[] }) => ({
      native: emoji.skins[skin].native,
      shortcodes: emoji.skins[skin].shortcodes,
    }));
    return results;
  }

  useEffect(() => {
    init({ data });
  }, []);

  useEffect(() => {
    const handleEmojiSearch = async () => {
      const lastWord = inputValue.split(" ").pop() || "";

      if (lastWord.startsWith(":") && lastWord.length > 1) {
        const emojiSuggestions = await search(lastWord.slice(1));
        setFuzzyEmojis(emojiSuggestions);
      } else if (lastWord && /^\p{Emoji}/u.test(lastWord)) {
        const colonIndex = lastWord.indexOf(":");
        if (colonIndex > 0) {
          const emojiSuggestions = await search(lastWord.slice(colonIndex + 1));
          setFuzzyEmojis([...skinTones, ...emojiSuggestions]);
        }
      } else {
        setFuzzyEmojis([]);
      }
    };

    handleEmojiSearch();
  }, [inputValue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiListRef.current &&
        !emojiListRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  useEffect(() => {
    if (selectedEmojiIndex !== -1 && emojiListRef.current) {
      const selectedItem = emojiListRef.current.children[
        selectedEmojiIndex
      ] as HTMLElement;
      if (selectedItem) {
        const container = emojiListRef.current;
        const itemTop = selectedItem.offsetTop;
        const itemBottom = itemTop + selectedItem.offsetHeight;
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.offsetHeight;

        if (itemTop < containerTop) {
          container.scrollTop = itemTop;
        } else if (itemBottom > containerBottom) {
          container.scrollTop = itemBottom - container.offsetHeight;
        }
      }
    }
  }, [selectedEmojiIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (fuzzyEmojis.length === 0) return;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setSelectedEmojiIndex((prevIndex) =>
            prevIndex < fuzzyEmojis.length - 1 ? prevIndex + 1 : 0
          );
          break;
        case "ArrowUp":
          event.preventDefault();
          setSelectedEmojiIndex((prevIndex) =>
            prevIndex > 0 ? prevIndex - 1 : fuzzyEmojis.length - 1
          );
          break;
        case "Enter":
          if (selectedEmojiIndex !== -1) {
            event.preventDefault();
            const selectedEmoji = fuzzyEmojis[selectedEmojiIndex];
            if (selectedEmoji.shortcodes.includes("skin-tone")) {
              onSkinToneSelect(selectedEmoji.shortcodes);
            } else {
              onEmojiSelect(selectedEmoji.native);
            }
          }
          break;
        case "Escape":
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    fuzzyEmojis,
    selectedEmojiIndex,
    onEmojiSelect,
    onSkinToneSelect,
    onClose,
  ]);

  if (fuzzyEmojis.length === 0) {
    return null;
  }

  return (
    <ul
      ref={emojiListRef}
      className="absolute bottom-full left-0 w-full bg-white rounded-t-lg border-2 border-gray-200 shadow-lg max-h-52 overflow-y-auto scrollbar-hide">
      {fuzzyEmojis.map((emoji, index) => (
        <li
          key={emoji.shortcodes}
          className={`px-4 py-2 cursor-pointer flex items-center space-x-2 hover:bg-gray-100 ${
            index === selectedEmojiIndex ? "bg-gray-200" : ""
          }`}
          onClick={() => {
            if (emoji.shortcodes.includes("skin-tone")) {
              onSkinToneSelect(emoji.shortcodes);
            } else {
              onEmojiSelect(emoji.native);
            }
          }}>
          <span className="text-xl">{emoji.native}</span>
          <span className="text-gray-600">{emoji.shortcodes}</span>
        </li>
      ))}
    </ul>
  );
}
