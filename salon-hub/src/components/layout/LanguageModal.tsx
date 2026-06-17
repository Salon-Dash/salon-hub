import { useState } from "react";
import * as React from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Language {
  code: string;
  name: string;
  flag: string; // Flag emoji or component
}

const languages: Language[] = [
  { code: "en-US", name: "English (United States)", flag: "🇺🇸" },
  { code: "en-GB", name: "English (Great Britain)", flag: "🇬🇧" },
  { code: "pl", name: "Polish", flag: "🇵🇱" },
  { code: "es-ES", name: "Spanish (Spain)", flag: "🇪🇸" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "pt-BR", name: "Portuguese (Brazil)", flag: "🇧🇷" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "vi", name: "Vietnamese", flag: "🇻🇳" },
  { code: "uk", name: "Ukrainian", flag: "🇺🇦" },
  { code: "zh-CN", name: "Simplified Chinese", flag: "🇨🇳" },
];

interface LanguageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLanguage: string;
  onLanguageChange: (code: string) => void;
}

export function LanguageModal({
  open,
  onOpenChange,
  selectedLanguage,
  onLanguageChange,
}: LanguageModalProps) {
  const [tempSelected, setTempSelected] = useState(selectedLanguage);

  const handleOk = () => {
    onLanguageChange(tempSelected);
    onOpenChange(false);
  };

  const handleClose = () => {
    setTempSelected(selectedLanguage); // Reset to original selection
    onOpenChange(false);
  };

  // Update temp selection when modal opens
  React.useEffect(() => {
    if (open) {
      setTempSelected(selectedLanguage);
    }
  }, [open, selectedLanguage]);

  // Split languages into two columns
  const leftColumn = languages.slice(0, Math.ceil(languages.length / 2));
  const rightColumn = languages.slice(Math.ceil(languages.length / 2));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] p-0 rounded-lg overflow-hidden bg-white">
        {/* Dark Gray Header */}
        <DialogHeader className="bg-[#2a2a2a] text-white px-6 py-4 m-0 rounded-t-lg">
          <div className="flex items-center justify-between">
            <button
              onClick={handleClose}
              className="text-white/70 hover:text-white transition-colors -ml-2"
            >
              <X className="h-5 w-5" />
            </button>
            <DialogTitle className="text-lg font-semibold text-white flex-1 text-center">
              Tongue
            </DialogTitle>
            <div className="w-9"></div> {/* Spacer for centering */}
          </div>
        </DialogHeader>

        {/* Language List */}
        <div className="p-6 bg-white">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {/* Left Column */}
            <div className="space-y-2">
              {leftColumn.map((language) => (
                <label
                  key={language.code}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded cursor-pointer transition-colors hover:bg-gray-100",
                    tempSelected === language.code && "bg-gray-100"
                  )}
                >
                  <input
                    type="radio"
                    name="language"
                    value={language.code}
                    checked={tempSelected === language.code}
                    onChange={() => setTempSelected(language.code)}
                    className="w-4 h-4 text-[#2a2a2a] border-gray-400 focus:ring-[#2a2a2a] cursor-pointer accent-[#2a2a2a]"
                  />
                  <span className="text-xl leading-none">{language.flag}</span>
                  <span className="text-sm font-normal text-gray-900 flex-1">
                    {language.name}
                  </span>
                </label>
              ))}
            </div>

            {/* Right Column */}
            <div className="space-y-2">
              {rightColumn.map((language) => (
                <label
                  key={language.code}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded cursor-pointer transition-colors hover:bg-gray-100",
                    tempSelected === language.code && "bg-gray-100"
                  )}
                >
                  <input
                    type="radio"
                    name="language"
                    value={language.code}
                    checked={tempSelected === language.code}
                    onChange={() => setTempSelected(language.code)}
                    className="w-4 h-4 text-[#2a2a2a] border-gray-400 focus:ring-[#2a2a2a] cursor-pointer accent-[#2a2a2a]"
                  />
                  <span className="text-xl leading-none">{language.flag}</span>
                  <span className="text-sm font-normal text-gray-900 flex-1">
                    {language.name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* OK Button */}
        <div className="px-6 pb-6">
          <Button
            onClick={handleOk}
            className="w-full bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white font-semibold py-2.5 transition-colors"
          >
            OK
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

