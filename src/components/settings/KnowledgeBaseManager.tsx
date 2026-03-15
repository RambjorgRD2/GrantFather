import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ExternalLink,
  Tag,
  FileText,
  Book,
  Copy,
  Link,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useActiveOrganization } from '@/contexts/OrganizationContext';
import {
  KnowledgeService,
  KnowledgeBaseItem,
} from '@/services/knowledgeService';

const documentTypeIcons = {
  guidance: Book,
  documentation: FileText,
  template: Copy,
  resource: Link,
};

const documentTypeLabels = {
  guidance: 'Guidance',
  documentation: 'Documentation',
  template: 'Template',
  resource: 'Resource',
};

export function KnowledgeBaseManager() {
  const { organization } = useActiveOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeBaseItem | null>(
    null
  );

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    document_type: 'guidance' as KnowledgeBaseItem['document_type'],
    tags: [] as string[],
    url: '',
    tagInput: '',
  });

  // Fetch knowledge base items
  const { data: knowledgeItems = [], isLoading } = useQuery({
    queryKey: ['knowledge-base', organization?.id, searchQuery, selectedType],
    queryFn: async () => {
      if (!organization?.id) return [];

      if (searchQuery) {
        return KnowledgeService.searchKnowledge(organization.id, searchQuery);
      }

      if (selectedType !== 'all') {
        return KnowledgeService.getKnowledgeByType(
          organization.id,
          selectedType as KnowledgeBaseItem['document_type']
        );
      }

      return KnowledgeService.getKnowledgeItems(organization.id);
    },
    enabled: !!organization?.id,
  });

  // Create/update mutation
  const createUpdateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!organization?.id) throw new Error('No organization');

      const itemData = {
        organization_id: organization.id,
        title: data.title,
        content: data.content,
        document_type: data.document_type,
        tags: data.tags,
        url: data.url || undefined,
        is_active: true,
      };

      if (editingItem) {
        return KnowledgeService.updateKnowledgeItem(editingItem.id, itemData);
      } else {
        return KnowledgeService.createKnowledgeItem(itemData);
      }
    },
    onSuccess: () => {
      toast({
        title: editingItem ? 'Knowledge updated' : 'Knowledge created',
        description: editingItem
          ? 'Knowledge base item has been updated successfully.'
          : 'New knowledge base item has been created successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
      resetForm();
      setIsCreateDialogOpen(false);
      setEditingItem(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => KnowledgeService.deleteKnowledgeItem(id),
    onSuccess: () => {
      toast({
        title: 'Knowledge deleted',
        description: 'Knowledge base item has been deleted successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      document_type: 'guidance',
      tags: [],
      url: '',
      tagInput: '',
    });
  };

  const handleEdit = (item: KnowledgeBaseItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      content: item.content,
      document_type: item.document_type,
      tags: item.tags || [],
      url: item.url || '',
      tagInput: '',
    });
    setIsCreateDialogOpen(true);
  };

  const handleAddTag = () => {
    const tag = formData.tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tag],
        tagInput: '',
      }));
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createUpdateMutation.mutate(formData);
  };

  const filteredItems = knowledgeItems.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType =
      selectedType === 'all' || item.document_type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6" data-testid="knowledge-base-section">
      <div className="space-y-2">
        <p className="text-muted-foreground">
          Store organization-specific guidance, documentation, and resources for
          AI-powered grant writing.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search knowledge base..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="guidance">Guidance</SelectItem>
            <SelectItem value="documentation">Documentation</SelectItem>
            <SelectItem value="template">Templates</SelectItem>
            <SelectItem value="resource">Resources</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Knowledge
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Edit Knowledge Item' : 'Add New Knowledge Item'}
              </DialogTitle>
              <DialogDescription>
                Add organization-specific information that will help improve
                AI-generated content.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="e.g., Grant Writing Guidelines"
                  required
                />
              </div>

              <div>
                <Label htmlFor="type">Document Type</Label>
                <Select
                  value={formData.document_type}
                  onValueChange={(value: KnowledgeBaseItem['document_type']) =>
                    setFormData((prev) => ({ ...prev, document_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="guidance">
                      Guidance - General advice and best practices
                    </SelectItem>
                    <SelectItem value="documentation">
                      Documentation - Specific procedures and requirements
                    </SelectItem>
                    <SelectItem value="template">
                      Template - Reusable content structures
                    </SelectItem>
                    <SelectItem value="resource">
                      Resource - Links and references
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      content: e.target.value,
                    }));
                    // Auto-resize textarea based on content
                    const textarea = e.target;
                    textarea.style.height = 'auto';
                    textarea.style.height =
                      Math.max(128, textarea.scrollHeight) + 'px';
                  }}
                  placeholder="Enter the knowledge content that will help improve AI responses..."
                  className="min-h-32 resize-none"
                  style={{ height: 'auto', minHeight: '128px' }}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Content will automatically expand as you type
                </p>
              </div>

              <div>
                <Label htmlFor="url">URL (Optional)</Label>
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, url: e.target.value }))
                  }
                  placeholder="https://example.com/resource"
                />
              </div>

              <div>
                <Label>Tags</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={formData.tagInput}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        tagInput: e.target.value,
                      }))
                    }
                    placeholder="Add a tag..."
                    onKeyPress={(e) =>
                      e.key === 'Enter' && (e.preventDefault(), handleAddTag())
                    }
                  />
                  <Button
                    type="button"
                    onClick={handleAddTag}
                    variant="outline"
                    size="sm"
                  >
                    <Tag className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setEditingItem(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createUpdateMutation.isPending}>
                  {createUpdateMutation.isPending
                    ? 'Saving...'
                    : editingItem
                    ? 'Update'
                    : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Knowledge Items */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading knowledge base...
          </div>
        ) : filteredItems.length === 0 ? (
          <Card
            className="text-center py-8"
            data-testid="knowledge-base-empty-state"
          >
            <CardContent className="pt-6">
              <p
                className="text-muted-foreground mb-4"
                data-testid="empty-state-message"
              >
                {searchQuery || selectedType !== 'all'
                  ? 'No knowledge items match your search criteria.'
                  : 'No knowledge base items yet. Create your first one to get started.'}
              </p>
              {!searchQuery && selectedType === 'all' && (
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  variant="outline"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add First Knowledge Item
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredItems.map((item) => {
            const IconComponent = documentTypeIcons[item.document_type];
            return (
              <Card key={item.id} className="glass">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <IconComponent className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-lg">{item.title}</CardTitle>
                        <CardDescription>
                          {documentTypeLabels[item.document_type]}
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View
                            </a>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMutation.mutate(item.id)}
                        className="hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                    {item.content}
                  </p>
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
