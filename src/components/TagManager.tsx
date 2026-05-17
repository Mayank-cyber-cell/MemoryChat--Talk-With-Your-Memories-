import { useState } from "react";
import { X, Plus, Tag as TagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface TagManagerProps {
  sessionId: string;
  currentTags: string[];
  onTagsUpdate?: (tags: string[]) => void;
}

export const TagManager = ({ sessionId, currentTags, onTagsUpdate }: TagManagerProps) => {
  const [tags, setTags] = useState<string[]>(currentTags || []);
  const [newTag, setNewTag] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  const handleAddTag = () => {
    if (!newTag.trim() || tags.includes(newTag.trim())) {
      setNewTag("");
      return;
    }

    const tagToAdd = newTag.trim();
    const updatedTags = [...tags, tagToAdd];
    setTags(updatedTags);
    setNewTag("");

    onTagsUpdate?.(updatedTags);
    toast({
      title: "Tag added",
      description: `"${tagToAdd}" has been added`,
    });
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = tags.filter(tag => tag !== tagToRemove);
    setTags(updatedTags);

    onTagsUpdate?.(updatedTags);
    toast({
      title: "Tag removed",
      description: `"${tagToRemove}" has been removed`,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TagIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Tags</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(!isEditing)}
          className="h-7 text-xs"
        >
          {isEditing ? "Done" : "Edit"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tags.length === 0 && !isEditing && (
          <span className="text-sm text-muted-foreground italic">No tags yet</span>
        )}
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="flex items-center gap-1 px-3 py-1"
          >
            {tag}
            {isEditing && (
              <button
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
      </div>

      {isEditing && (
        <div className="flex gap-2">
          <Input
            placeholder="Add new tag..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
            className="h-9 text-sm glass-effect border-border"
          />
          <Button
            onClick={handleAddTag}
            size="sm"
            className="h-9"
            disabled={!newTag.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
