import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ChatHeaderProps {
  name: string;
  status: string;
  onBack: () => void;
}

const ChatHeader = ({ name, status, onBack }: ChatHeaderProps) => {
  return (
    <div className="glass-effect border-b border-border p-4 flex items-center gap-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="hover:bg-background/50"
      >
        <ArrowLeft className="w-5 h-5" />
      </Button>

      <Avatar className="w-12 h-12">
        <AvatarImage src="" />
        <AvatarFallback className="bg-primary text-primary-foreground font-heading">
          {name.charAt(0)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1">
        <h3 className="font-heading font-semibold text-foreground">{name}</h3>
        <p className="text-sm text-muted-foreground">{status}</p>
      </div>
    </div>
  );
};

export default ChatHeader;
